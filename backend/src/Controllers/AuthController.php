<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;

class AuthController
{
    public static function register(array $body): void
    {
        throttle('register:' . client_ip(), 30, 3600);
        $firstName = clean_str($body['firstName'] ?? '', 60);
        $email = strtolower(clean_str($body['email'] ?? '', 160));
        $password = is_string($body['password'] ?? null) ? $body['password'] : '';
        if ($firstName === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new ApiError('Vérifie ton prénom et ton adresse email.', 400);
        }
        if (strlen($password) < 8 || strlen($password) > 200) {
            throw new ApiError('Le mot de passe doit contenir au moins 8 caractères.', 400);
        }
        $db = db();
        $exists = $db->prepare('SELECT id FROM users WHERE email = ?');
        $exists->execute([$email]);
        if ($exists->fetch()) {
            throw new ApiError('Un compte existe déjà avec cet email.', 409);
        }

        $id = uid('u');
        $birthDate = valid_date($body['birthDate'] ?? null) ?? date('Y-m-d');
        $sex = in_array($body['sex'] ?? '', ['male', 'female', 'other'], true) ? $body['sex'] : 'other';
        $lastName = clean_str($body['lastName'] ?? '', 60);
        $phone = clean_str($body['phone'] ?? '', 30);
        $height = max(80, min(250, (int) ($body['height'] ?? 170)));
        $weight = max(20, min(400, (float) ($body['weight'] ?? 70)));

        $db->prepare(
            'INSERT INTO users (id, first_name, last_name, email, phone, password_hash, birth_date, sex, height_cm, weight_kg, role)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([$id, $firstName, $lastName, $email, $phone, password_hash($password, PASSWORD_DEFAULT), $birthDate, $sex, $height, $weight, 'user']);

        self::ensure_preferences($id);

        // Le super admin est prévenu de chaque inscription (le dossier est dans l'Espace Super admin).
        $admins = db()->query("SELECT id FROM users WHERE role = 'superadmin'")->fetchAll(\PDO::FETCH_COLUMN);
        $notify = db()->prepare('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?,?,?,?,?)');
        foreach ($admins as $adminId) {
            $notify->execute([uid('notif'), $adminId, 'announcement', 'Nouvelle inscription', mb_substr(trim("$firstName $lastName") . " · $email", 0, 500)]);
        }

        $user = self::user_row($id);
        $prefs = self::prefs_row($id);
        json_out(make_session($user, $prefs), 201);
    }

    public static function login(array $body): void
    {
        $email = strtolower(clean_str($body['email'] ?? '', 160));
        $password = is_string($body['password'] ?? null) ? $body['password'] : '';
        // Anti force brute : 8 échecs par compte et 30 par adresse IP, sur 15 minutes.
        $kAccount = 'login:' . $email;
        $kIp = 'login-ip:' . client_ip();
        throttle($kAccount, 8, 900, false);
        throttle($kIp, 30, 900, false);
        $st = db()->prepare('SELECT * FROM users WHERE email = ?');
        $st->execute([$email]);
        $user = $st->fetch();
        // Vérification même sans compte : même durée de réponse (pas de détection des emails inscrits).
        $hash = $user['password_hash'] ?? password_hash('fitlife-factice', PASSWORD_DEFAULT);
        if (!password_verify($password, $hash) || !$user) {
            throttle_hit($kAccount, 900);
            throttle_hit($kIp, 900);
            throw new ApiError('Email ou mot de passe incorrect.', 401);
        }
        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        }
        self::ensure_preferences($user['id']);
        $prefs = self::prefs_row($user['id']);
        json_out(make_session($user, $prefs));
    }

    public static function logout(): void
    {
        json_out(['ok' => true]);
    }

    /* ---------------- helpers ---------------- */

    public static function user_row(string $userId): array
    {
        $st = db()->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([$userId]);
        $u = $st->fetch();
        if (!$u) {
            throw new ApiError('Utilisateur introuvable', 404);
        }
        return $u;
    }

    public static function prefs_row(string $userId): array
    {
        $st = db()->prepare('SELECT * FROM user_preferences WHERE user_id = ?');
        $st->execute([$userId]);
        $p = $st->fetch();
        if (!$p) {
            self::ensure_preferences($userId);
            $st->execute([$userId]);
            $p = $st->fetch();
        }
        return $p;
    }

    public static function ensure_preferences(string $userId): void
    {
        $defaults = [
            'goal' => 'fitness', 'level' => 'beginner', 'days_per_week' => 3,
            'session_minutes' => 30, 'equipment' => '["none"]', 'favorite_foods' => '[]',
            'avoided_foods' => '[]', 'allergies' => '[]', 'diet_restrictions' => '[]',
            'budget' => 'medium', 'meals_per_day' => 3, 'onboarded' => 0,
            'water_goal_ml' => 2500, 'step_goal' => 8000, 'bio' => '', 'city' => '',
        ];
        $db = db();
        $st = $db->prepare('SELECT user_id FROM user_preferences WHERE user_id = ?');
        $st->execute([$userId]);
        if (!$st->fetch()) {
            $db->prepare(
                'INSERT INTO user_preferences (user_id, goal, level, days_per_week, session_minutes, equipment,
                 favorite_foods, avoided_foods, allergies, diet_restrictions, budget, meals_per_day, onboarded,
                 water_goal_ml, step_goal, bio, city)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
            )->execute([$userId, ...array_values($defaults)]);
        }
    }
}