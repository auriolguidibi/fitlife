<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;

class AiController
{
    public static function conversation(): void
    {
        $auth = require_auth();
        $st = db()->prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at');
        $st->execute([$auth['uid']]);
        json_out(array_map('FitLife\Controllers\chat_payload', $st->fetchAll()));
    }

    public static function send(array $body): void
    {
        $auth = require_auth();
        $user = AuthController::user_row($auth['uid']);
        $prefs = prefs_payload(AuthController::prefs_row($auth['uid']));
        $text = trim((string) ($body['text'] ?? ''));
        if ($text === '') {
            throw new ApiError('Message vide', 400);
        }
        $db = db();
        $db->prepare('INSERT INTO chat_messages (id, user_id, role, content) VALUES (?,?,?,?)')
            ->execute([uid('msg'), $auth['uid'], 'user', $text]);
        $reply = ai_reply($text, $user, $prefs);
        $db->prepare('INSERT INTO chat_messages (id, user_id, role, content) VALUES (?,?,?,?)')
            ->execute([uid('msg'), $auth['uid'], 'assistant', $reply]);

        $st = $db->prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at');
        $st->execute([$auth['uid']]);
        json_out(array_map('FitLife\Controllers\chat_payload', $st->fetchAll()), 201);
    }
}

function chat_payload(array $m): array
{
    return [
        'id' => $m['id'],
        'role' => $m['role'],
        'content' => $m['content'],
        'createdAt' => date('c', strtotime($m['created_at'])),
    ];
}