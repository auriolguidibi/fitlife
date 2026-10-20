<?php

declare(strict_types=1);

function b64url(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode(string $data): string
{
    $pad = strlen($data) % 4;
    if ($pad) {
        $data .= str_repeat('=', 4 - $pad);
    }
    return base64_decode(strtr($data, '-_', '+/')) ?: '';
}

function jwt_encode(array $payload): string
{
    $header = b64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $body = b64url(json_encode($payload, JSON_UNESCAPED_UNICODE));
    $sig = hash_hmac('sha256', "$header.$body", JWT_SECRET, true);
    return "$header.$body." . b64url($sig);
}

function jwt_decode(string $token): array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        throw new ApiError('Session invalide', 401);
    }
    [$header, $body, $sig] = $parts;
    $expected = hash_hmac('sha256', "$header.$body", JWT_SECRET, true);
    if (!hash_equals($expected, b64url_decode($sig))) {
        throw new ApiError('Session invalide', 401);
    }
    $payload = json_decode(b64url_decode($body), true);
    if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) {
        throw new ApiError('Session expirée', 401);
    }
    return $payload;
}

/** Returns the authenticated user id. Throws 401 otherwise. */
function require_auth(): array
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $header, $m)) {
        $payload = jwt_decode(trim($m[1]));
        // Le rôle est relu en base : un changement de rôle ou une suppression de compte
        // prend effet immédiatement, sans attendre l'expiration du jeton.
        $st = db()->prepare('SELECT role, password_hash FROM users WHERE id = ?');
        $st->execute([$payload['uid'] ?? '']);
        $row = $st->fetch();
        if ($row === false) {
            throw new ApiError('Compte introuvable ou supprimé', 401);
        }
        // Jeton émis avant un changement de mot de passe : session fermée.
        if (!hash_equals(password_version($row['password_hash']), (string) ($payload['pwv'] ?? ''))) {
            throw new ApiError('Session expirée : reconnecte-toi', 401);
        }
        $payload['role'] = $row['role'];
        return $payload;
    }
    throw new ApiError('Authentification requise', 401);
}

/**
 * Exige un rôle. Hiérarchie : superadmin ⊃ admin ⊃ coach.
 * require_role('admin') accepte donc aussi le super admin.
 */
function require_role(string $role): array
{
    $auth = require_auth();
    $rank = ['user' => 0, 'coach' => 1, 'admin' => 2, 'superadmin' => 3];
    if (($rank[$auth['role'] ?? 'user'] ?? 0) < ($rank[$role] ?? 99)) {
        throw new ApiError('Accès refusé', 403);
    }
    return $auth;
}

/** Coachs et administrateurs (gestion des lives, événements, annonces). */
function require_staff(): array
{
    $auth = require_auth();
    if (!in_array($auth['role'] ?? '', ['coach', 'admin', 'superadmin'], true)) {
        throw new ApiError('Accès réservé aux coachs et administrateurs', 403);
    }
    return $auth;
}

/** Empreinte courte du mot de passe actuel, glissée dans le jeton. */
function password_version(string $passwordHash): string
{
    return substr(hash_hmac('sha256', $passwordHash, JWT_SECRET), 0, 16);
}

function make_session(array $userRow, array $prefsRow): array
{
    $user = user_payload($userRow);
    $prefs = prefs_payload($prefsRow);
    $token = jwt_encode(['uid' => $userRow['id'], 'role' => $userRow['role'], 'pwv' => password_version($userRow['password_hash']), 'exp' => time() + JWT_TTL]);
    return ['token' => $token, 'user' => $user, 'preferences' => $prefs];
}