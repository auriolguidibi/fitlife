<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;
use FitLife\Services\PremiumService;

/**
 * Codes promo : un coach ou un administrateur crée un code qui donne accès à Premium
 * pendant la durée qu'il choisit ; le membre le saisit dans la page Premium.
 */
class PromoController
{
    /** Alphabet sans caractères ambigus (0/O, 1/I/L). */
    private const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    public static function ensureTables(): void
    {
        static $done = false;
        if ($done) {
            return;
        }
        db()->exec('CREATE TABLE IF NOT EXISTS promo_codes (
            code            VARCHAR(32) NOT NULL PRIMARY KEY,
            days            INT NOT NULL,
            max_uses        INT NULL,
            uses            INT NOT NULL DEFAULT 0,
            expires_at      DATETIME NULL,
            note            VARCHAR(160) NULL,
            active          TINYINT(1) NOT NULL DEFAULT 1,
            created_by      VARCHAR(20) NOT NULL,
            created_by_name VARCHAR(120) NOT NULL,
            created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB');
        db()->exec('CREATE TABLE IF NOT EXISTS promo_redemptions (
            code        VARCHAR(32) NOT NULL,
            user_id     VARCHAR(20) NOT NULL,
            redeemed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (code, user_id),
            KEY (user_id)
        ) ENGINE=InnoDB');
        $done = true;
    }

    public static function list(): void
    {
        require_staff();
        self::ensureTables();
        $rows = db()->query('SELECT * FROM promo_codes ORDER BY created_at DESC LIMIT 500')->fetchAll();
        json_out(array_map([self::class, 'payload'], $rows));
    }

    /** { code?, days, maxUses?, expiresAt?, note? } */
    public static function create(array $body): void
    {
        $auth = require_staff();
        self::ensureTables();
        $days = (int) ($body['days'] ?? 0);
        if ($days < 1 || $days > 3650) {
            throw new ApiError('Durée invalide : entre 1 et 3650 jours.', 400);
        }
        $maxUses = isset($body['maxUses']) && $body['maxUses'] !== '' && $body['maxUses'] !== null ? (int) $body['maxUses'] : null;
        if ($maxUses !== null && ($maxUses < 1 || $maxUses > 100000)) {
            throw new ApiError('Nombre d’utilisations invalide.', 400);
        }
        $expiresAt = null;
        if (!empty($body['expiresAt'])) {
            $ts = strtotime((string) $body['expiresAt']);
            if (!$ts || $ts < time()) {
                throw new ApiError('La date limite doit être dans le futur.', 400);
            }
            $expiresAt = date('Y-m-d H:i:s', $ts);
        }
        $code = strtoupper(clean_str($body['code'] ?? '', 32));
        if ($code === '') {
            $code = self::generate();
        } elseif (!preg_match('/^[A-Z0-9-]{4,32}$/', $code)) {
            throw new ApiError('Code invalide : 4 à 32 lettres, chiffres ou tirets.', 400);
        }
        $st = db()->prepare('SELECT code FROM promo_codes WHERE code = ?');
        $st->execute([$code]);
        if ($st->fetch()) {
            throw new ApiError('Ce code existe déjà.', 409);
        }
        $me = AuthController::user_row($auth['uid']);
        db()->prepare('INSERT INTO promo_codes (code, days, max_uses, expires_at, note, created_by, created_by_name) VALUES (?,?,?,?,?,?,?)')
            ->execute([$code, $days, $maxUses, $expiresAt, clean_str($body['note'] ?? '', 160) ?: null, $auth['uid'], trim($me['first_name'] . ' ' . $me['last_name'])]);
        json_out(self::payload(self::row($code)), 201);
    }

    /** { active } : activer / désactiver un code. */
    public static function update(string $code, array $body): void
    {
        require_staff();
        self::ensureTables();
        self::row($code);
        db()->prepare('UPDATE promo_codes SET active = ? WHERE code = ?')->execute([empty($body['active']) ? 0 : 1, $code]);
        json_out(self::payload(self::row($code)));
    }

    public static function delete(string $code): void
    {
        require_staff();
        self::ensureTables();
        db()->prepare('DELETE FROM promo_codes WHERE code = ?')->execute([$code]);
        json_out(['ok' => true]);
    }

    /** Le membre utilise un code : { code } -> Premium pour la durée du code. */
    public static function redeem(array $body): void
    {
        $auth = require_auth();
        self::ensureTables();
        // Anti force brute : 10 essais par heure et par compte.
        $key = 'promo:' . $auth['uid'];
        throttle($key, 10, 3600, false);
        $code = strtoupper(preg_replace('/\s+/', '', clean_str($body['code'] ?? '', 40)));
        $db = db();
        $db->beginTransaction();
        try {
            $st = $db->prepare('SELECT * FROM promo_codes WHERE code = ? FOR UPDATE');
            $st->execute([$code]);
            $promo = $st->fetch();
            $error = match (true) {
                !$promo => 'Code promo inconnu.',
                !(int) $promo['active'] => 'Ce code promo a été désactivé.',
                $promo['expires_at'] !== null && strtotime((string) $promo['expires_at']) < time() => 'Ce code promo a expiré.',
                $promo['max_uses'] !== null && (int) $promo['uses'] >= (int) $promo['max_uses'] => 'Ce code promo a déjà été utilisé le nombre de fois prévu.',
                default => null,
            };
            if ($error === null) {
                $used = $db->prepare('SELECT 1 FROM promo_redemptions WHERE code = ? AND user_id = ?');
                $used->execute([$code, $auth['uid']]);
                if ($used->fetch()) {
                    $error = 'Tu as déjà utilisé ce code.';
                }
            }
            if ($error !== null) {
                $db->rollBack();
                throttle_hit($key, 3600);
                throw new ApiError($error, 400);
            }
            $db->prepare('INSERT INTO promo_redemptions (code, user_id) VALUES (?,?)')->execute([$code, $auth['uid']]);
            $db->prepare('UPDATE promo_codes SET uses = uses + 1 WHERE code = ?')->execute([$code]);
            $days = (int) $promo['days'];
            $renews = PremiumService::grant($auth['uid'], $days);
            $db->prepare('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?,?,?,?,?)')->execute([
                uid('notif'), $auth['uid'], 'encouragement', 'Premium activé',
                "Code $code : Premium offert pendant $days jours, jusqu’au " . date('d/m/Y', strtotime($renews)) . '.',
            ]);
            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
        json_out(['days' => $days, 'premiumUntil' => date('c', strtotime($renews)), 'user' => user_payload(AuthController::user_row($auth['uid']))]);
    }

    private static function generate(): string
    {
        do {
            $code = 'FIT-';
            for ($i = 0; $i < 8; $i++) {
                $code .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
            $st = db()->prepare('SELECT code FROM promo_codes WHERE code = ?');
            $st->execute([$code]);
        } while ($st->fetch());
        return $code;
    }

    private static function row(string $code): array
    {
        $st = db()->prepare('SELECT * FROM promo_codes WHERE code = ?');
        $st->execute([$code]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Code promo introuvable', 404);
        }
        return $row;
    }

    private static function payload(array $p): array
    {
        return [
            'code' => $p['code'],
            'days' => (int) $p['days'],
            'maxUses' => $p['max_uses'] !== null ? (int) $p['max_uses'] : null,
            'uses' => (int) $p['uses'],
            'expiresAt' => $p['expires_at'] ? date('c', strtotime($p['expires_at'])) : null,
            'note' => $p['note'],
            'active' => (bool) $p['active'],
            'createdByName' => $p['created_by_name'],
            'createdAt' => date('c', strtotime($p['created_at'])),
        ];
    }
}
