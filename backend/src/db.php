<?php

declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        // DB_SSL=1 : connexion chiffrée, exigée par les bases MySQL hébergées (Aiven, TiDB Cloud…).
        // Certificat vérifié avec DB_SSL_CA si fourni, sinon chiffrement sans vérification.
        if (in_array(strtolower((string) env('DB_SSL')), ['1', 'true', 'required'], true)) {
            $ca = env('DB_SSL_CA');
            if ($ca !== null && is_file($ca)) {
                $options[PDO::MYSQL_ATTR_SSL_CA] = $ca;
            } else {
                $options[PDO::MYSQL_ATTR_SSL_CA] = '/etc/ssl/certs/ca-certificates.crt';
                $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
            }
        }
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    }
    return $pdo;
}