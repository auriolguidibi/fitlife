<?php

declare(strict_types=1);

function json_out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error_out(string $message, int $status): never
{
    json_out(['message' => $message], $status);
}

function input(): array
{
    $raw = file_get_contents('php://input');
    $body = $raw ? json_decode($raw, true) : [];
    return is_array($body) ? $body : [];
}

/** Identifiant unique de 20 caractères maximum (taille des colonnes id en base). */
function uid(string $prefix): string
{
    $len = max(8, 19 - strlen($prefix));
    return $prefix . '_' . substr(bin2hex(random_bytes(8)), 0, $len);
}

function now_iso(?int $ts = null): string
{
    return date('c', $ts ?? time());
}

function iso_to_datetime(string $iso): string
{
    $ts = strtotime($iso);
    return $ts ? date('Y-m-d H:i:s', $ts) : date('Y-m-d H:i:s');
}

function round_f(float $n, int $precision = 2): float
{
    return round($n, $precision);
}

function client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'inconnu');
}

/**
 * Anti force brute : au plus $max événements par fenêtre de $window secondes pour une clé.
 * $hit = false : vérifie seulement (on enregistre l'échec ensuite avec throttle_hit()).
 */
function throttle(string $key, int $max, int $window, bool $hit = true): void
{
    $dir = sys_get_temp_dir() . '/fitlife_rl';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $fp = @fopen($dir . '/' . hash('sha256', $key), 'c+');
    if (!$fp) {
        return;
    }
    flock($fp, LOCK_EX);
    $now = time();
    $hits = json_decode(stream_get_contents($fp) ?: '[]', true);
    $hits = array_values(array_filter(is_array($hits) ? $hits : [], fn ($t) => is_int($t) && $t > $now - $window));
    $blocked = count($hits) >= $max;
    if (!$blocked && $hit) {
        $hits[] = $now;
    }
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($hits));
    flock($fp, LOCK_UN);
    fclose($fp);
    if ($blocked) {
        header('Retry-After: ' . $window);
        throw new ApiError('Trop de tentatives. Réessaie dans quelques minutes.', 429);
    }
}

function throttle_hit(string $key, int $window): void
{
    try {
        throttle($key, PHP_INT_MAX, $window);
    } catch (ApiError) {
    }
}

/** Texte saisi par l'utilisateur, borné en longueur (les tableaux / objets sont refusés). */
/** Date AAAA-MM-JJ valide (année 1900 à aujourd'hui) ou null. */
function valid_date(mixed $value): ?string
{
    $value = clean_str($value, 10);
    $d = \DateTime::createFromFormat('!Y-m-d', $value);
    if (!$d || $d->format('Y-m-d') !== $value || (int) $d->format('Y') < 1900 || $d->getTimestamp() > time()) {
        return null;
    }
    return $value;
}

function clean_str(mixed $value, int $max): string
{
    return is_scalar($value) ? mb_substr(trim((string) $value), 0, $max) : '';
}

/** Lien http(s) uniquement (jamais javascript:, data:…) ; null si vide. */
function safe_url(mixed $url, string $label = 'Lien'): ?string
{
    $url = clean_str($url, 500);
    if ($url === '') {
        return null;
    }
    if (!preg_match('#^https?://#i', $url) || filter_var($url, FILTER_VALIDATE_URL) === false) {
        throw new ApiError("$label invalide (https://…)", 400);
    }
    return $url;
}

class ApiError extends \Exception
{
    public function __construct(string $message, public int $status = 400)
    {
        parent::__construct($message, $status);
    }
}