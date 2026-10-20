<?php

declare(strict_types=1);

namespace FitLife\Services;

/**
 * Prestataire de paiement de l'abonnement.
 *
 * - FedaPay (production) : actif dès que FEDAPAY_SECRET_KEY est défini (ou PAYMENT_PROVIDER=fedapay).
 *   Le serveur crée la transaction et un lien vers la page de paiement sécurisée FedaPay
 *   (Mobile Money, carte…). Le statut est TOUJOURS relu auprès de l'API FedaPay avec la clé
 *   secrète avant d'activer Premium : ni le retour navigateur ni un webhook ne suffisent seuls.
 *   Variables : FEDAPAY_SECRET_KEY (sk_live_… / sk_sandbox_…), FEDAPAY_ENV (live | sandbox),
 *   FEDAPAY_WEBHOOK_SECRET (wh_…, facultatif), APP_URL (retour après paiement).
 * - Simulation (développement) : aucun appel externe ; confirmé après quelques secondes
 *   (numéro finissant par 00 = refus).
 */
class PaymentGateway
{
    public static function provider(): string
    {
        $p = getenv('PAYMENT_PROVIDER') ?: '';
        if ($p === '') {
            $p = getenv('FEDAPAY_SECRET_KEY') ? 'fedapay' : 'simulation';
        }
        // En production, la simulation donnerait Premium sans payer : elle est refusée.
        if ($p === 'simulation' && APP_ENV === 'production') {
            throw new \ApiError('Paiement indisponible : FedaPay n’est pas configuré sur le serveur', 503);
        }
        return $p;
    }

    public static function isFedaPay(): bool
    {
        return self::provider() === 'fedapay';
    }

    private static function apiBase(): string
    {
        // FEDAPAY_API_BASE : uniquement pour les tests automatiques (faux serveur FedaPay).
        if ($base = getenv('FEDAPAY_API_BASE')) {
            return rtrim($base, '/');
        }
        return (getenv('FEDAPAY_ENV') ?: 'live') === 'sandbox' ? 'https://sandbox-api.fedapay.com/v1' : 'https://api.fedapay.com/v1';
    }

    /** Appel à l'API FedaPay (clé secrète côté serveur uniquement). */
    private static function call(string $method, string $path, ?array $body = null): array
    {
        $secret = getenv('FEDAPAY_SECRET_KEY') ?: '';
        if ($secret === '') {
            throw new \ApiError('Paiement indisponible : clé secrète FedaPay non configurée sur le serveur', 503);
        }
        $ch = curl_init(self::apiBase() . $path);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $secret, 'Content-Type: application/json', 'Accept: application/json'],
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
        }
        $raw = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($raw === false) {
            throw new \ApiError('FedaPay injoignable : ' . $err, 502);
        }
        $data = json_decode((string) $raw, true) ?: [];
        if ($code >= 400) {
            $msg = $data['message'] ?? ('erreur ' . $code);
            error_log('FedaPay ' . $method . ' ' . $path . ' -> ' . $code . ' ' . substr((string) $raw, 0, 500));
            throw new \ApiError('FedaPay : ' . (is_string($msg) ? $msg : 'requête refusée'), 502);
        }
        return $data;
    }

    /** Les réponses FedaPay enveloppent l'objet (« v1/transaction ») : on le déballe. */
    private static function unwrap(array $data, string $name): array
    {
        foreach (["v1/$name", $name] as $key) {
            if (isset($data[$key]) && is_array($data[$key])) {
                return $data[$key];
            }
        }
        return $data;
    }

    /**
     * Démarre le paiement. FedaPay : crée la transaction et son lien de paiement.
     * Retourne ['ref' => id FedaPay, 'url' => page de paiement] ou null en simulation.
     */
    public static function initiate(array $payment, array $user): ?array
    {
        if (!self::isFedaPay()) {
            return null;
        }
        $customer = array_filter([
            'firstname' => mb_substr((string) $user['first_name'], 0, 50),
            'lastname' => mb_substr((string) ($user['last_name'] ?: $user['first_name']), 0, 50),
            'email' => $user['email'],
        ]);
        $body = [
            'description' => 'FitLife Premium ' . ($payment['billing'] === 'yearly' ? 'annuel' : 'mensuel') . ' — ' . $payment['reference'],
            'amount' => (int) $payment['amount'],
            'currency' => ['iso' => 'XOF'],
            'customer' => $customer,
        ];
        $appUrl = rtrim((string) (getenv('APP_URL') ?: ''), '/');
        if ($appUrl !== '') {
            $body['callback_url'] = $appUrl . '/premium?payment=' . rawurlencode($payment['id']);
        }
        $tx = self::unwrap(self::call('POST', '/transactions', $body), 'transaction');
        $id = (string) ($tx['id'] ?? '');
        if ($id === '') {
            throw new \ApiError('FedaPay : transaction non créée', 502);
        }
        $token = self::unwrap(self::call('POST', '/transactions/' . rawurlencode($id) . '/token'), 'token');
        $url = (string) ($token['url'] ?? '');
        if ($url === '' || !preg_match('#^https://#', $url)) {
            throw new \ApiError('FedaPay : lien de paiement indisponible', 502);
        }
        return ['ref' => $id, 'url' => $url];
    }

    /** Statut réel d'une transaction, relu chez FedaPay : ['status', 'amount', 'currency']. */
    public static function fetch(string $ref): array
    {
        $tx = self::unwrap(self::call('GET', '/transactions/' . rawurlencode($ref)), 'transaction');
        $currency = $tx['currency']['iso'] ?? ($tx['currency_iso'] ?? null);
        return [
            'status' => (string) ($tx['status'] ?? 'pending'),
            'amount' => (int) ($tx['amount'] ?? 0),
            'currency' => $currency ? (string) $currency : null,
        ];
    }

    /**
     * Simulation uniquement : statut à appliquer à un paiement en attente,
     * ou null si l'opérateur n'a pas encore « répondu ».
     */
    public static function simulatedOutcome(array $payment): ?string
    {
        if (self::provider() !== 'simulation') {
            return null;
        }
        if (time() - strtotime($payment['created_at']) < 4) {
            return null;
        }
        return str_ends_with((string) $payment['phone_masked'], '00') ? 'failed' : 'succeeded';
    }

    /**
     * Signature d'une notification FedaPay (en-tête X-FEDAPAY-SIGNATURE « t=…,s=… »).
     * Sans secret configuré : null (non vérifiable). Le statut est de toute façon relu chez FedaPay.
     */
    public static function verifyFedaPaySignature(string $rawBody, string $header): ?bool
    {
        $secret = getenv('FEDAPAY_WEBHOOK_SECRET') ?: '';
        if ($secret === '') {
            return null;
        }
        $parts = [];
        foreach (explode(',', $header) as $kv) {
            [$k, $v] = array_pad(explode('=', trim($kv), 2), 2, '');
            $parts[$k][] = $v;
        }
        $t = $parts['t'][0] ?? '';
        foreach ($parts['s'] ?? [] as $sig) {
            if ($t !== '' && hash_equals(hash_hmac('sha256', $t . '.' . $rawBody, $secret), $sig)) {
                return true;
            }
        }
        return false;
    }

    /** Format générique (simulation / autre prestataire) : HMAC-SHA256 du corps. */
    public static function verifyWebhook(string $rawBody, string $signature): bool
    {
        $secret = getenv('PAYMENT_WEBHOOK_SECRET') ?: '';
        if ($secret === '') {
            return false;
        }
        return hash_equals(hash_hmac('sha256', $rawBody, $secret), $signature);
    }
}
