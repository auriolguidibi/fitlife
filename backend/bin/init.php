<?php

declare(strict_types=1);

/*
 * Initialisation sûre de la base : lance seed.php UNIQUEMENT si la table « users » n'existe pas.
 * (seed.php vide toutes les tables : il ne doit jamais tourner sur une base déjà en service.)
 */
require_once dirname(__DIR__) . '/config.php';

for ($attempt = 1; $attempt <= 10; $attempt++) {
    try {
        $pdo = db();
        break;
    } catch (Throwable $e) {
        fwrite(STDERR, "Base MySQL injoignable (tentative $attempt/10)…\n");
        sleep(3);
    }
}
if (!isset($pdo)) {
    exit(1);
}

$exists = $pdo->query("SHOW TABLES LIKE 'users'")->fetchColumn();
if ($exists) {
    echo "Base déjà initialisée : aucune modification.\n";
    exit(0);
}

echo "Base vide : création des tables et des comptes…\n";
require __DIR__ . '/seed.php';
