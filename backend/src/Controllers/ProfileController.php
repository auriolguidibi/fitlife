<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;

class ProfileController
{
    public static function get(): void
    {
        $auth = require_auth();
        json_out(user_payload(AuthController::user_row($auth['uid'])));
    }

    /** L'utilisateur supprime définitivement son propre compte. */
    public static function deleteAccount(): void
    {
        $auth = require_auth();
        $user = AuthController::user_row($auth['uid']);
        if ($user['role'] === 'superadmin') {
            $count = (int) db()->query("SELECT COUNT(*) FROM users WHERE role = 'superadmin'")->fetchColumn();
            if ($count <= 1) {
                throw new ApiError('Tu es le dernier super admin : nomme un autre super admin avant de supprimer ton compte.', 409);
            }
        }
        SuperAdminController::purge($auth['uid'], $user);
        json_out(['ok' => true]);
    }

    /**
     * Changement du mot de passe (tous les rôles) : l'ancien est exigé.
     * Les sessions ouvertes ailleurs sont fermées ; une nouvelle session est renvoyée.
     */
    public static function changePassword(array $body): void
    {
        $auth = require_auth();
        $key = 'password:' . $auth['uid'];
        throttle($key, 5, 900, false);
        $current = is_string($body['currentPassword'] ?? null) ? $body['currentPassword'] : '';
        $next = is_string($body['newPassword'] ?? null) ? $body['newPassword'] : '';
        $user = AuthController::user_row($auth['uid']);
        if (!password_verify($current, $user['password_hash'])) {
            throttle_hit($key, 900);
            throw new ApiError('Mot de passe actuel incorrect.', 400);
        }
        if (strlen($next) < 8 || strlen($next) > 200) {
            throw new ApiError('Le nouveau mot de passe doit contenir au moins 8 caractères.', 400);
        }
        if (hash_equals($current, $next)) {
            throw new ApiError('Le nouveau mot de passe doit être différent de l’actuel.', 400);
        }
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($next, PASSWORD_DEFAULT), $auth['uid']]);
        db()->prepare('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?,?,?,?,?)')->execute([
            uid('notif'), $auth['uid'], 'announcement', 'Mot de passe modifié',
            'Ton mot de passe a été changé. Si ce n’est pas toi, contacte immédiatement le support.',
        ]);
        $user = AuthController::user_row($auth['uid']);
        json_out(make_session($user, AuthController::prefs_row($auth['uid'])));
    }

    public static function update(array $body): void
    {
        $auth = require_auth();
        $id = $auth['uid'];
        $set = [];
        $params = ['id' => $id];
        $clean = [];
        if (isset($body['firstName'])) {
            $clean['first_name'] = clean_str($body['firstName'], 60);
            if ($clean['first_name'] === '') {
                throw new ApiError('Le prénom est obligatoire', 400);
            }
        }
        if (isset($body['lastName'])) {
            $clean['last_name'] = clean_str($body['lastName'], 60);
        }
        if (isset($body['phone'])) {
            $clean['phone'] = clean_str($body['phone'], 30);
        }
        if (isset($body['height'])) {
            $clean['height_cm'] = max(80, min(250, (int) $body['height']));
        }
        if (isset($body['weight'])) {
            $clean['weight_kg'] = max(20, min(400, (float) $body['weight']));
        }
        if (isset($body['sex']) && in_array($body['sex'], ['male', 'female', 'other'], true)) {
            $clean['sex'] = $body['sex'];
        }
        if (isset($body['birthDate'])) {
            $clean['birth_date'] = valid_date($body['birthDate']) ?? throw new ApiError('Date de naissance invalide', 400);
        }
        // Photo : uniquement un fichier envoyé via /profile/avatar (pas de lien externe arbitraire).
        if (array_key_exists('avatarUrl', $body) && ($body['avatarUrl'] === null || $body['avatarUrl'] === '')) {
            $clean['avatar_url'] = null;
        } elseif (isset($body['avatarUrl'])) {
            $current = AuthController::user_row($id)['avatar_url'] ?? null;
            if ($body['avatarUrl'] !== $current) {
                throw new ApiError('Utilise l’envoi de photo pour changer ta photo de profil', 400);
            }
        }
        foreach ($clean as $col => $value) {
            $set[] = "$col = :$col";
            $params[$col] = $value;
        }
        if ($set) {
            db()->prepare('UPDATE users SET ' . implode(', ', $set) . ' WHERE id = :id')->execute($params);
        }
        json_out(user_payload(AuthController::user_row($id)));
    }

    /** POST /profile/avatar (multipart, champ « avatar ») : JPG, PNG ou WebP, 2 Mo max. */
    public static function uploadAvatar(): void
    {
        $auth = require_auth();
        $file = $_FILES['avatar'] ?? null;
        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new ApiError('Aucune image reçue', 400);
        }
        if ($file['size'] > 2 * 1024 * 1024) {
            throw new ApiError('Image trop lourde (2 Mo maximum)', 413);
        }
        $types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) ?: '';
        if (!isset($types[$mime]) || @getimagesize($file['tmp_name']) === false) {
            throw new ApiError('Format non pris en charge (JPG, PNG ou WebP)', 415);
        }
        $dir = dirname(__DIR__, 2) . '/public/uploads/avatars';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new ApiError('Stockage indisponible', 500);
        }
        $name = $auth['uid'] . '-' . bin2hex(random_bytes(6)) . '.' . $types[$mime];
        if (!move_uploaded_file($file['tmp_name'], "$dir/$name")) {
            throw new ApiError('Enregistrement de l’image impossible', 500);
        }
        $old = AuthController::user_row($auth['uid'])['avatar_url'] ?? null;
        db()->prepare('UPDATE users SET avatar_url = ? WHERE id = ?')->execute(["/uploads/avatars/$name", $auth['uid']]);
        self::deleteLocalAvatar($old);
        json_out(user_payload(AuthController::user_row($auth['uid'])));
    }

    public static function removeAvatar(): void
    {
        $auth = require_auth();
        $old = AuthController::user_row($auth['uid'])['avatar_url'] ?? null;
        db()->prepare('UPDATE users SET avatar_url = NULL WHERE id = ?')->execute([$auth['uid']]);
        self::deleteLocalAvatar($old);
        json_out(user_payload(AuthController::user_row($auth['uid'])));
    }

    private static function deleteLocalAvatar(?string $url): void
    {
        if ($url && preg_match('#^/uploads/avatars/([\w-]+\.(jpg|png|webp))$#', $url, $m)) {
            @unlink(dirname(__DIR__, 2) . '/public/uploads/avatars/' . $m[1]);
        }
    }

    public static function getPreferences(): void
    {
        $auth = require_auth();
        json_out(prefs_payload(AuthController::prefs_row($auth['uid'])));
    }

    public static function savePreferences(array $body): void
    {
        $auth = require_auth();
        $id = $auth['uid'];
        $map = [
            'goal' => 'goal', 'level' => 'level', 'daysPerWeek' => 'days_per_week',
            'sessionMinutes' => 'session_minutes', 'budget' => 'budget', 'mealsPerDay' => 'meals_per_day',
            'onboarded' => 'onboarded', 'bio' => 'bio', 'city' => 'city',
            'waterGoal' => 'water_goal_ml', 'stepGoal' => 'step_goal',
        ];
        $jsonCols = ['equipment' => 'equipment', 'favoriteFoods' => 'favorite_foods', 'avoidedFoods' => 'avoided_foods', 'allergies' => 'allergies', 'dietRestrictions' => 'diet_restrictions'];

        $set = [];
        $params = ['uid' => $id];
        $enums = ['goal' => ['weight_loss', 'muscle_gain', 'fitness', 'endurance', 'wellbeing', 'maintenance'], 'level' => ['beginner', 'intermediate', 'advanced'], 'budget' => ['low', 'medium', 'high']];
        foreach ($map as $key => $col) {
            if (array_key_exists($key, $body)) {
                $v = $body[$key];
                if (!is_scalar($v) && $v !== null) {
                    throw new ApiError('Valeur invalide : ' . $key, 400);
                }
                $v = is_bool($v) ? (int) $v : $v;
                if (in_array($key, ['bio', 'city'], true)) {
                    $v = clean_str($v, $key === 'bio' ? 500 : 80);
                } elseif (isset($enums[$key])) {
                    $v = clean_str($v, 30);
                } else {
                    $v = max(0, min(100000, (int) $v));
                }
                $set[] = "$col = :$key";
                $params[$key] = $v;
            }
        }
        foreach ($jsonCols as $key => $col) {
            if (array_key_exists($key, $body) && is_array($body[$key]) && count($body[$key]) <= 50) {
                $body[$key] = array_values(array_map(fn ($x) => clean_str($x, 60), $body[$key]));
                $set[] = "$col = :$key";
                $params[$key] = json_encode($body[$key], JSON_UNESCAPED_UNICODE);
            }
        }
        if ($set) {
            db()->prepare('UPDATE user_preferences SET ' . implode(', ', $set) . ' WHERE user_id = :uid')->execute($params);
        }

        $user = AuthController::user_row($id);
        json_out(make_session($user, AuthController::prefs_row($id)));
    }
}