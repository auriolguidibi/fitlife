<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;
use FitLife\Services\PremiumService;

/** Espace super admin : liste de tous les inscrits, rôles, Premium offert, suppression. */
class SuperAdminController
{
    private const ROLES = ['user', 'coach', 'admin', 'superadmin'];

    public static function users(): void
    {
        require_role('superadmin');
        $rows = db()->query(
            "SELECT u.*,
                    (SELECT renews_at FROM subscriptions s WHERE s.user_id = u.id AND s.status <> 'expired' LIMIT 1) AS premium_until,
                    (SELECT COUNT(*) FROM activities a WHERE a.user_id = u.id AND a.status = 'finished') AS activity_count,
                    (SELECT COALESCE(SUM(a.distance_km), 0) FROM activities a WHERE a.user_id = u.id AND a.status = 'finished') AS total_km,
                    (SELECT MAX(a.started_at) FROM activities a WHERE a.user_id = u.id AND a.status = 'finished') AS last_activity,
                    p.goal, p.level AS pref_level, p.days_per_week, p.session_minutes, p.equipment, p.allergies, p.diet_restrictions, p.city
             FROM users u LEFT JOIN user_preferences p ON p.user_id = u.id ORDER BY u.created_at DESC"
        )->fetchAll();
        json_out(array_map([self::class, 'payload'], $rows));
    }

    public static function setRole(string $id, array $body): void
    {
        $auth = require_role('superadmin');
        $role = $body['role'] ?? '';
        if (!in_array($role, self::ROLES, true)) {
            throw new ApiError('Rôle invalide', 400);
        }
        self::row($id);
        if ($id === $auth['uid'] && $role !== 'superadmin') {
            throw new ApiError('Tu ne peux pas retirer ton propre rôle de super admin', 409);
        }
        db()->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $id]);
        json_out(self::payload(self::row($id)));
    }

    /** { days } : > 0 offre / prolonge Premium (sans renouvellement), 0 retire Premium. */
    public static function setPremium(string $id, array $body): void
    {
        require_role('superadmin');
        $days = max(0, min(3650, (int) ($body['days'] ?? 0)));
        self::row($id);
        $db = db();
        if ($days > 0) {
            PremiumService::grant($id, $days);
            $db->prepare('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?,?,?,?,?)')->execute([
                uid('notif'), $id, 'encouragement', 'Premium offert',
                "L’équipe FitLife t’offre $days jours de Premium. Profite de tous les avantages !",
            ]);
        } else {
            $db->prepare("UPDATE subscriptions SET status = 'expired', renews_at = NOW() WHERE user_id = ?")->execute([$id]);
            $db->prepare('UPDATE users SET is_premium = 0, premium_plan = NULL WHERE id = ?')->execute([$id]);
        }
        json_out(self::payload(self::row($id)));
    }

    /** Supprime le compte et toutes les données qui lui sont rattachées. */
    public static function delete(string $id): void
    {
        $auth = require_role('superadmin');
        if ($id === $auth['uid']) {
            throw new ApiError('Tu ne peux pas supprimer ton propre compte', 409);
        }
        $user = self::row($id);
        $db = db();
        if ($user['role'] === 'superadmin') {
            $count = (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'superadmin'")->fetchColumn();
            if ($count <= 1) {
                throw new ApiError('Impossible de supprimer le dernier super admin', 409);
            }
        }
        self::purge($id, $user);
        json_out(['ok' => true]);
    }

    /** Supprime un utilisateur et toutes ses données (utilisé aussi pour « supprimer mon compte »). */
    public static function purge(string $id, array $user): void
    {
        $db = db();
        $db->beginTransaction();
        try {
            // Toutes les tables rattachées à un utilisateur (y compris celles sans clé étrangère).
            $tables = $db->query(
                "SELECT TABLE_NAME FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'user_id' AND TABLE_NAME <> 'users'"
            )->fetchAll(\PDO::FETCH_COLUMN);
            foreach ($tables as $table) {
                $db->prepare("DELETE FROM `$table` WHERE user_id = ?")->execute([$id]);
            }
            $db->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }
        if (!empty($user['avatar_url']) && preg_match('#^/uploads/avatars/([\w-]+\.(jpg|png|webp))$#', (string) $user['avatar_url'], $m)) {
            @unlink(dirname(__DIR__, 2) . '/public/uploads/avatars/' . $m[1]);
        }
    }

    private static function row(string $id): array
    {
        $st = db()->prepare(
            "SELECT u.*,
                    (SELECT renews_at FROM subscriptions s WHERE s.user_id = u.id AND s.status <> 'expired' LIMIT 1) AS premium_until,
                    (SELECT COUNT(*) FROM activities a WHERE a.user_id = u.id AND a.status = 'finished') AS activity_count,
                    (SELECT COALESCE(SUM(a.distance_km), 0) FROM activities a WHERE a.user_id = u.id AND a.status = 'finished') AS total_km,
                    (SELECT MAX(a.started_at) FROM activities a WHERE a.user_id = u.id AND a.status = 'finished') AS last_activity,
                    p.goal, p.level AS pref_level, p.days_per_week, p.session_minutes, p.equipment, p.allergies, p.diet_restrictions, p.city
             FROM users u LEFT JOIN user_preferences p ON p.user_id = u.id WHERE u.id = ?"
        );
        $st->execute([$id]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Utilisateur introuvable', 404);
        }
        return $row;
    }

    private static function payload(array $u): array
    {
        return [
            'id' => $u['id'],
            'firstName' => $u['first_name'],
            'lastName' => $u['last_name'],
            'email' => $u['email'],
            'phone' => $u['phone'],
            'avatarUrl' => $u['avatar_url'],
            'role' => $u['role'],
            'isPremium' => (bool) $u['is_premium'],
            'premiumUntil' => $u['premium_until'] ? date('c', strtotime($u['premium_until'])) : null,
            'createdAt' => date('c', strtotime($u['created_at'])),
            'activities' => (int) $u['activity_count'],
            'totalKm' => round((float) $u['total_km'], 1),
            'lastActivityAt' => $u['last_activity'] ? date('c', strtotime($u['last_activity'])) : null,
            // Dossier membre : informations d'inscription et de questionnaire.
            'birthDate' => $u['birth_date'],
            'sex' => $u['sex'],
            'height' => (int) $u['height_cm'],
            'weight' => (float) $u['weight_kg'],
            'goal' => $u['goal'] ?? null,
            'level' => $u['pref_level'] ?? null,
            'daysPerWeek' => isset($u['days_per_week']) ? (int) $u['days_per_week'] : null,
            'sessionMinutes' => isset($u['session_minutes']) ? (int) $u['session_minutes'] : null,
            'equipment' => isset($u['equipment']) ? (json_decode((string) $u['equipment'], true) ?: []) : [],
            'allergies' => isset($u['allergies']) ? (json_decode((string) $u['allergies'], true) ?: []) : [],
            'dietRestrictions' => isset($u['diet_restrictions']) ? (json_decode((string) $u['diet_restrictions'], true) ?: []) : [],
            'city' => $u['city'] ?? '',
        ];
    }
}
