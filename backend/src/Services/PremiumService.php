<?php

declare(strict_types=1);

namespace FitLife\Services;

/** Accès Premium accordé pour une durée (code promo, geste du super admin). */
class PremiumService
{
    /**
     * Ajoute $days jours de Premium (à la suite de la période en cours s'il y en a une).
     * Pas de renouvellement automatique : l'abonnement est marqué « cancelled » et expire seul.
     * Retourne la nouvelle date de fin (Y-m-d H:i:s).
     */
    public static function grant(string $userId, int $days): string
    {
        $db = db();
        $st = $db->prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status <> 'expired' AND renews_at > NOW()");
        $st->execute([$userId]);
        $sub = $st->fetch();
        $base = $sub ? strtotime((string) $sub['renews_at']) : time();
        $renews = date('Y-m-d H:i:s', $base + $days * 86400);
        if ($sub && $sub['status'] === 'active') {
            // Abonnement payant en cours : on prolonge simplement sa période.
            $db->prepare('UPDATE subscriptions SET renews_at = ? WHERE id = ?')->execute([$renews, $sub['id']]);
        } else {
            $db->prepare(
                "INSERT INTO subscriptions (id, user_id, plan_id, billing, status, started_at, renews_at, method)
                 VALUES (?, ?, 'premium', ?, 'cancelled', NOW(), ?, NULL)
                 ON DUPLICATE KEY UPDATE plan_id = 'premium', status = 'cancelled', renews_at = VALUES(renews_at)"
            )->execute([uid('sub'), $userId, $days >= 365 ? 'yearly' : 'monthly', $renews]);
        }
        $db->prepare("UPDATE users SET is_premium = 1, premium_plan = 'premium' WHERE id = ?")->execute([$userId]);
        return $renews;
    }
}
