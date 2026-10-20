<?php

declare(strict_types=1);

/*
 * Configuration : variables d'environnement, ou fichier backend/.env (jamais versionné).
 * Les noms des hébergeurs courants sont aussi reconnus (Railway : MYSQLHOST, MYSQLUSER…).
 */
(function (): void {
    $file = __DIR__ . '/.env';
    if (!is_file($file)) {
        return;
    }
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        $value = trim($value, "\"'");
        // Une variable déjà définie par l'hébergeur reste prioritaire.
        if ($key !== '' && getenv($key) === false) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
})();

function env(string ...$keys): ?string
{
    foreach ($keys as $key) {
        $v = getenv($key);
        if ($v !== false && $v !== '') {
            return $v;
        }
    }
    return null;
}

define('APP_ENV', env('APP_ENV') ?? 'development');
define('DB_HOST', env('DB_HOST', 'MYSQLHOST') ?? '127.0.0.1');
define('DB_PORT', (int) (env('DB_PORT', 'MYSQLPORT') ?? 3306));
define('DB_NAME', env('DB_NAME', 'MYSQLDATABASE') ?? 'fitlife');
define('DB_USER', env('DB_USER', 'MYSQLUSER') ?? 'root');
define('DB_PASS', env('DB_PASS', 'MYSQLPASSWORD') ?? '');
define('JWT_SECRET', env('JWT_SECRET') ?? 'fitlife-dev-secret-change-me');
define('JWT_TTL', 7 * 86400);
define('SRC', __DIR__);

// En production, refuser de démarrer avec le secret par défaut (jetons falsifiables).
if (APP_ENV === 'production' && (JWT_SECRET === 'fitlife-dev-secret-change-me' || strlen(JWT_SECRET) < 32)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['message' => 'Configuration incomplète : définir JWT_SECRET (32 caractères minimum).']);
    exit;
}

spl_autoload_register(function (string $class): void {
    $prefix = 'FitLife\\';
    if (str_starts_with($class, $prefix)) {
        $rel = str_replace('\\', DIRECTORY_SEPARATOR, substr($class, strlen($prefix)));
        $file = __DIR__ . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . $rel . '.php';
        if (is_file($file)) {
            require $file;
        }
    }
});

require_once __DIR__ . '/src/db.php';
require_once __DIR__ . '/src/helpers.php';
require_once __DIR__ . '/src/auth.php';
require_once __DIR__ . '/src/resources.php';
