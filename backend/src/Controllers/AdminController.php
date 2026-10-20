<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;
use FitLife\Services\AwardService;

class AdminController
{
    public static function stats(): void
    {
        $u = require_role('admin');
        $db = db();
        $users = (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'user'")->fetchColumn();
        $premium = (int) $db->query("SELECT COUNT(*) FROM users WHERE is_premium = 1 AND role = 'user'")->fetchColumn();
        $lives = (int) $db->query('SELECT COUNT(*) FROM lives')->fetchColumn();
        $sessions = (int) $db->query('SELECT COUNT(*) FROM workout_logs')->fetchColumn();
        $revenue = (int) $db->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded' AND paid_at >= DATE_FORMAT(NOW(), '%Y-%m-01')")->fetchColumn();
        $active = (int) $db->query("SELECT COUNT(DISTINCT user_id) FROM activities WHERE started_at >= NOW() - INTERVAL 30 DAY")->fetchColumn();
        $totalKmRow = $db->query("SELECT COALESCE(SUM(distance_km),0) FROM activities WHERE review_status = 'validated'")->fetchColumn();
        json_out([
            'users' => $users,
            'premiumUsers' => $premium,
            'revenue' => $revenue,
            'lives' => $lives,
            'sessions' => $sessions,
            'totalKm' => round_f((float) $totalKmRow, 1),
            'activeUsers' => $active,
        ]);
    }

    public static function users(): void
    {
        $u = require_role('admin');
        $rows = db()->query('SELECT id, first_name, last_name, email, role, is_premium, created_at FROM users ORDER BY created_at')->fetchAll();
        json_out(array_map(function ($r) {
            return [
                'id' => $r['id'],
                'name' => trim($r['first_name'] . ' ' . $r['last_name']),
                'email' => $r['email'],
                'role' => $r['role'],
                'isPremium' => (bool) $r['is_premium'],
                'createdAt' => date('c', strtotime($r['created_at'])),
            ];
        }, $rows));
    }

    /** Activités de tous les membres en attente de vérification (anti-triche). */
    public static function pendingActivities(): void
    {
        require_role('admin');
        $rows = db()->query(
            "SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) AS user_name
             FROM activities a JOIN users u ON u.id = a.user_id
             WHERE a.status = 'finished' AND a.review_status = 'pending'
             ORDER BY a.started_at DESC LIMIT 200"
        )->fetchAll();
        // activity_payload() est défini avec ActivityController : on charge la classe d'abord.
        class_exists(ActivityController::class);
        json_out(array_map('FitLife\\Controllers\\activity_payload', $rows));
    }

    public static function reviewActivity(string $id, array $body): void
    {
        require_role('admin');
        $decision = $body['decision'] ?? '';
        if (!in_array($decision, ['validated', 'rejected'], true)) {
            throw new ApiError('Décision invalide', 400);
        }
        $reason = $decision === 'rejected' ? 'Rejetée par l’administrateur' : null;
        $db = db();
        $st = $db->prepare('SELECT * FROM activities WHERE id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Activité introuvable', 404);
        }
        $db->prepare('UPDATE activities SET review_status = ?, review_reason = ? WHERE id = ?')->execute([$decision, $reason, $id]);
        if ($decision === 'validated') {
            $owner = AuthController::user_row($row['user_id']);
            AwardService::award($owner['id'], $owner, prefs_payload(AuthController::prefs_row($owner['id'])));
        }
        $st->execute([$id]);
        class_exists(ActivityController::class);
        json_out(activity_payload($st->fetch()));
    }
}