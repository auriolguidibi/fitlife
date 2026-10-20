<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;

class SubscriptionController
{
    public static function plans(): void
    {
        // Offre payante unique : Premium (cf. comparatif Gratuit / Premium).
        $rows = db()->query("SELECT * FROM subscription_plans WHERE id = 'premium'")->fetchAll();
        json_out(array_map(function ($p) {
            return [
                'id' => $p['id'], 'name' => $p['name'],
                'priceMonthly' => (int) $p['price_monthly'], 'priceYearly' => (int) $p['price_yearly'],
                'currency' => $p['currency'],
                'features' => json_decode($p['features'], true) ?: [],
                'highlighted' => (bool) $p['highlighted'],
            ];
        }, $rows));
    }

    public static function get(): void
    {
        $auth = require_auth();
        $st = db()->prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status <> 'expired' ORDER BY started_at DESC LIMIT 1");
        $st->execute([$auth['uid']]);
        $row = $st->fetch();
        json_out($row ? sub_payload($row) : null);
    }

    /**
     * Activation sans paiement : réservée aux administrateurs (geste commercial, test).
     * Les membres passent par POST /payments.
     */
    public static function subscribe(array $body): void
    {
        $auth = require_role('admin');
        $plan = $body['plan'] ?? '';
        if (!in_array($plan, ['essential', 'premium'], true)) {
            throw new ApiError('Offre invalide', 400);
        }
        $billing = $body['billing'] ?? 'monthly';
        $billing = in_array($billing, ['monthly', 'yearly'], true) ? $billing : 'monthly';
        $now = time();
        $renews = date('Y-m-d H:i:s', $now + ($billing === 'monthly' ? 30 : 365) * 86400);
        $db = db();
        $db->prepare(
            'INSERT INTO subscriptions (id, user_id, plan_id, billing, status, started_at, renews_at)
             VALUES (?,?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE plan_id = VALUES(plan_id), billing = VALUES(billing), status = VALUES(status), started_at = VALUES(started_at), renews_at = VALUES(renews_at)'
        )->execute([uid('sub'), $auth['uid'], $plan, $billing, 'active', date('Y-m-d H:i:s'), $renews]);
        $db->prepare('UPDATE users SET is_premium = 1, premium_plan = ? WHERE id = ?')->execute([$plan, $auth['uid']]);
        $user = AuthController::user_row($auth['uid']);
        $db->prepare('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?,?,?,?,?)')
            ->execute([uid('notif'), $auth['uid'], 'encouragement', 'Bienvenue dans Premium', ucfirst($plan) . ' activé. Profite de tous tes avantages !']);

        $st = $db->prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status <> 'expired' ORDER BY started_at DESC LIMIT 1");
        $st->execute([$auth['uid']]);
        json_out(sub_payload($st->fetch()), 201);
    }

    public static function cancel(): void
    {
        $auth = require_auth();
        $db = db();
        $st = $db->prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1");
        $st->execute([$auth['uid']]);
        $row = $st->fetch();
        if ($row) {
            // Pas de renouvellement ; l'accès Premium reste ouvert jusqu'à renews_at (voir expiry()).
            $db->prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?")->execute([$row['id']]);
        }
        self::current($auth['uid']);
    }

    public static function resume(): void
    {
        $auth = require_auth();
        db()->prepare("UPDATE subscriptions SET status = 'active' WHERE user_id = ? AND status = 'cancelled' AND renews_at > NOW()")
            ->execute([$auth['uid']]);
        self::current($auth['uid']);
    }

    private static function current(string $userId): void
    {
        $st = db()->prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY started_at DESC LIMIT 1");
        $st->execute([$userId]);
        $row = $st->fetch();
        json_out($row ? sub_payload($row) : null);
    }

    public static function expiry(): void
    {
        $db = db();
        $db->query("UPDATE users u JOIN subscriptions s ON s.user_id = u.id
                    SET u.is_premium = 0, u.premium_plan = NULL
                    WHERE s.status IN ('active', 'cancelled') AND s.renews_at < NOW()");
        $db->query("UPDATE subscriptions SET status = 'expired' WHERE status IN ('active', 'cancelled') AND renews_at < NOW()");
    }
}

function sub_payload(array $s): array
{
    return [
        'plan' => $s['plan_id'],
        'status' => $s['status'],
        'billing' => $s['billing'],
        'startedAt' => date('c', strtotime($s['started_at'])),
        'renewsAt' => $s['renews_at'] ? date('c', strtotime($s['renews_at'])) : null,
        'method' => $s['method'] ?? null,
    ];
}