<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;
use FitLife\Services\PaymentGateway;

/** Paiement de l'abonnement Premium (Mobile Money / carte). */
class PaymentController
{
    private const METHODS = ['orange_money', 'mtn_momo', 'moov_money', 'wave', 'card'];

    public static function start(array $body): void
    {
        $auth = require_auth();
        throttle('payment:' . $auth['uid'], 15, 3600);
        // Seule l'offre Premium est payante (pas de « paiement » d'une offre à 0 FCFA).
        $planId = 'premium';
        if (($body['plan'] ?? 'premium') !== 'premium') {
            throw new ApiError('Offre invalide', 400);
        }
        $st = db()->prepare('SELECT * FROM subscription_plans WHERE id = ?');
        $st->execute([$planId]);
        $plan = $st->fetch();
        if (!$plan) {
            throw new ApiError('Offre invalide', 400);
        }
        $billing = in_array($body['billing'] ?? '', ['monthly', 'yearly'], true) ? $body['billing'] : 'monthly';
        $method = $body['method'] ?? '';
        if (!in_array($method, self::METHODS, true)) {
            throw new ApiError('Moyen de paiement invalide', 400);
        }

        $phone = null;
        $masked = null;
        $digits = preg_replace('/^225/', '', preg_replace('/\D/', '', (string) ($body['phone'] ?? '')));
        // Avec FedaPay, le numéro est saisi sur la page de paiement sécurisée : il est facultatif ici.
        if ($method !== 'card' && (!PaymentGateway::isFedaPay() || $digits !== '')) {
            $phone = preg_replace('/^225/', '', preg_replace('/\D/', '', (string) ($body['phone'] ?? '')));
            if (strlen($phone) < 8 || strlen($phone) > 10) {
                throw new ApiError('Numéro Mobile Money invalide', 400);
            }
            $masked = substr($phone, 0, 2) . ' •• •• ' . substr($phone, -2);
        }

        $id = uid('pay');
        $reference = 'FL-' . date('Ym') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
        $amount = (int) ($billing === 'monthly' ? $plan['price_monthly'] : $plan['price_yearly']);
        if ($amount <= 0) {
            throw new ApiError('Prix de l’offre non configuré', 500);
        }
        $payment = [
            'id' => $id, 'user_id' => $auth['uid'], 'reference' => $reference, 'plan_id' => $planId,
            'billing' => $billing, 'amount' => $amount, 'currency' => $plan['currency'], 'method' => $method,
            'phone_masked' => $masked,
        ];
        $checkout = PaymentGateway::initiate($payment, AuthController::user_row($auth['uid']));
        $providerRef = $checkout['ref'] ?? null;

        db()->prepare(
            'INSERT INTO payments (id, user_id, reference, plan_id, billing, amount, currency, method, phone_masked, status, provider_ref)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([$id, $auth['uid'], $reference, $planId, $billing, $amount, $plan['currency'], $method, $masked, 'pending', $providerRef]);

        $out = self::payload(self::find($id, $auth['uid']));
        $out['checkoutUrl'] = $checkout['url'] ?? null;
        json_out($out, 201);
    }

    public static function get(string $id): void
    {
        $auth = require_auth();
        $row = self::find($id, $auth['uid']);
        if ($row['status'] === 'pending' && PaymentGateway::isFedaPay() && !empty($row['provider_ref'])) {
            // Statut relu chez FedaPay (jamais celui envoyé par le navigateur).
            self::reconcile($row, PaymentGateway::fetch((string) $row['provider_ref']));
            $row = self::find($id, $auth['uid']);
        } elseif ($row['status'] === 'pending') {
            $outcome = PaymentGateway::simulatedOutcome($row);
            if ($outcome !== null) {
                self::settle($row, $outcome, $outcome === 'failed' ? 'Solde insuffisant ou paiement refusé par l’opérateur.' : null);
                $row = self::find($id, $auth['uid']);
            }
        }
        json_out(self::payload($row));
    }

    public static function list(): void
    {
        $auth = require_auth();
        $st = db()->prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50');
        $st->execute([$auth['uid']]);
        json_out(array_map([self::class, 'payload'], $st->fetchAll()));
    }

    /** Applique le statut FedaPay vérifié à un paiement en attente. */
    private static function reconcile(array $row, array $tx): void
    {
        $status = $tx['status'];
        if ($status === 'approved' || $status === 'transferred') {
            // Montant et devise contrôlés : un paiement plus faible n'active rien.
            if ($tx['amount'] !== (int) $row['amount'] || ($tx['currency'] !== null && $tx['currency'] !== 'XOF')) {
                error_log('FedaPay : montant inattendu pour ' . $row['reference'] . ' (' . $tx['amount'] . ' ' . $tx['currency'] . ')');
                self::settle($row, 'failed', 'Montant payé différent du prix de l’abonnement. Contacte le support.');
                return;
            }
            self::settle($row, 'succeeded', null);
        } elseif ($status === 'declined') {
            self::settle($row, 'failed', 'Paiement refusé (solde insuffisant ou opération rejetée).');
        } elseif ($status === 'canceled') {
            self::settle($row, 'failed', 'Paiement annulé.');
        } elseif ($status === 'refunded') {
            self::settle($row, 'failed', 'Paiement remboursé.');
        }
    }

    /**
     * Notification du prestataire.
     * FedaPay : on récupère l'identifiant de transaction puis on RELIT son statut chez FedaPay.
     * Autre format : { reference, status: succeeded|failed, reason? } signé HMAC-SHA256.
     */
    public static function webhook(): void
    {
        $raw = file_get_contents('php://input') ?: '';
        if (PaymentGateway::isFedaPay()) {
            $signed = PaymentGateway::verifyFedaPaySignature($raw, (string) ($_SERVER['HTTP_X_FEDAPAY_SIGNATURE'] ?? ''));
            if ($signed === false) {
                error_log('Webhook FedaPay : signature non reconnue, statut revérifié auprès de FedaPay');
            }
            $event = json_decode($raw, true) ?: [];
            $txId = (string) ($event['entity']['id'] ?? $event['data']['id'] ?? $event['object']['id'] ?? $event['transaction']['id'] ?? '');
            if ($txId === '') {
                json_out(['ok' => true]);
            }
            $st = db()->prepare('SELECT * FROM payments WHERE provider_ref = ?');
            $st->execute([$txId]);
            $row = $st->fetch();
            if ($row && $row['status'] === 'pending') {
                self::reconcile($row, PaymentGateway::fetch($txId));
            }
            json_out(['ok' => true]);
        }
        $signature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
        if (!PaymentGateway::verifyWebhook($raw, $signature)) {
            throw new ApiError('Signature invalide', 401);
        }
        $body = json_decode($raw, true) ?: [];
        $st = db()->prepare('SELECT * FROM payments WHERE reference = ?');
        $st->execute([(string) ($body['reference'] ?? '')]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Paiement introuvable', 404);
        }
        $status = ($body['status'] ?? '') === 'succeeded' ? 'succeeded' : 'failed';
        if ($row['status'] === 'pending') {
            self::settle($row, $status, $body['reason'] ?? null);
        }
        json_out(['ok' => true]);
    }

    /** Clôture un paiement ; en cas de succès, active ou prolonge l'abonnement. */
    private static function settle(array $p, string $status, ?string $reason): void
    {
        $db = db();
        if ($status === 'failed') {
            $db->prepare("UPDATE payments SET status = 'failed', failure_reason = ? WHERE id = ? AND status = 'pending'")
                ->execute([$reason ?? 'Paiement refusé', $p['id']]);
            return;
        }
        $db->beginTransaction();
        try {
            $upd = $db->prepare("UPDATE payments SET status = 'succeeded', paid_at = NOW() WHERE id = ? AND status = 'pending'");
            $upd->execute([$p['id']]);
            if ($upd->rowCount() === 0) {
                $db->rollBack();
                return; // déjà traité (webhook + polling)
            }
            $days = $p['billing'] === 'monthly' ? 30 : 365;
            $st = $db->prepare('SELECT * FROM subscriptions WHERE user_id = ? FOR UPDATE');
            $st->execute([$p['user_id']]);
            $sub = $st->fetch();
            // Réabonnement avant l'échéance : la nouvelle période s'ajoute à la période en cours.
            $base = ($sub && $sub['status'] !== 'expired' && strtotime((string) $sub['renews_at']) > time())
                ? strtotime((string) $sub['renews_at']) : time();
            $renews = date('Y-m-d H:i:s', $base + $days * 86400);
            $started = ($sub && $sub['status'] !== 'expired') ? $sub['started_at'] : date('Y-m-d H:i:s');
            $db->prepare(
                "INSERT INTO subscriptions (id, user_id, plan_id, billing, status, started_at, renews_at, method)
                 VALUES (?,?,?,?, 'active', ?,?,?)
                 ON DUPLICATE KEY UPDATE plan_id = VALUES(plan_id), billing = VALUES(billing), status = 'active',
                   started_at = VALUES(started_at), renews_at = VALUES(renews_at), method = VALUES(method)"
            )->execute([uid('sub'), $p['user_id'], $p['plan_id'], $p['billing'], $started, $renews, $p['method']]);
            $db->prepare('UPDATE users SET is_premium = 1, premium_plan = ? WHERE id = ?')->execute([$p['plan_id'], $p['user_id']]);
            $db->prepare('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?,?,?,?,?)')->execute([
                uid('notif'), $p['user_id'], 'encouragement', 'Paiement confirmé',
                'Premium actif jusqu’au ' . date('d/m/Y', strtotime($renews)) . '. Profite de tous tes avantages !',
            ]);
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }

    private static function find(string $id, string $userId): array
    {
        $st = db()->prepare('SELECT * FROM payments WHERE id = ? AND user_id = ?');
        $st->execute([$id, $userId]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Paiement introuvable', 404);
        }
        return $row;
    }

    private static function payload(array $p): array
    {
        return [
            'id' => $p['id'],
            'reference' => $p['reference'],
            'plan' => $p['plan_id'],
            'billing' => $p['billing'],
            'amount' => (int) $p['amount'],
            'currency' => $p['currency'],
            'method' => $p['method'],
            'phoneMasked' => $p['phone_masked'],
            'status' => $p['status'],
            'failureReason' => $p['failure_reason'],
            'createdAt' => date('c', strtotime($p['created_at'])),
            'paidAt' => $p['paid_at'] ? date('c', strtotime($p['paid_at'])) : null,
        ];
    }
}
