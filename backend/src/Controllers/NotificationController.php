<?php

declare(strict_types=1);

namespace FitLife\Controllers;

class NotificationController
{
    public static function list(): void
    {
        $auth = require_auth();
        $st = db()->prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC');
        $st->execute([$auth['uid']]);
        json_out(array_map('FitLife\Controllers\notif_payload', $st->fetchAll()));
    }

    public static function markRead(string $id): void
    {
        $auth = require_auth();
        db()->prepare('UPDATE notifications SET `read` = 1 WHERE id = ? AND user_id = ?')->execute([$id, $auth['uid']]);
        self::list();
    }

    public static function markAllRead(): void
    {
        $auth = require_auth();
        db()->prepare('UPDATE notifications SET `read` = 1 WHERE user_id = ?')->execute([$auth['uid']]);
        self::list();
    }
}

function notif_payload(array $n): array
{
    return [
        'id' => $n['id'],
        'userId' => $n['user_id'],
        'type' => $n['type'],
        'title' => $n['title'],
        'body' => $n['body'],
        'createdAt' => date('c', strtotime($n['created_at'])),
        'read' => (bool) $n['read'],
    ];
}