<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;

/**
 * Messagerie avec les vrais coachs du site : chaque membre a une conversation avec l'équipe
 * des coachs ; tout coach (ou administrateur) peut lire et répondre depuis l'Espace Gestion.
 */
class CoachChatController
{
    public static function ensureTables(): void
    {
        static $done = false;
        if ($done) {
            return;
        }
        // user_id = membre propriétaire de la conversation (supprimée avec son compte).
        db()->exec('CREATE TABLE IF NOT EXISTS coach_messages (
            id             VARCHAR(20) NOT NULL PRIMARY KEY,
            seq            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
            user_id        VARCHAR(20) NOT NULL,
            sender_id      VARCHAR(20) NOT NULL,
            from_coach     TINYINT(1) NOT NULL DEFAULT 0,
            sender_name    VARCHAR(120) NOT NULL,
            text           TEXT NOT NULL,
            read_by_member TINYINT(1) NOT NULL DEFAULT 0,
            read_by_coach  TINYINT(1) NOT NULL DEFAULT 0,
            created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY (user_id, created_at)
        ) ENGINE=InnoDB');
        $done = true;
    }

    /* ---------- Côté membre ---------- */

    public static function myThread(): void
    {
        $auth = require_auth();
        self::ensureTables();
        db()->prepare('UPDATE coach_messages SET read_by_member = 1 WHERE user_id = ? AND from_coach = 1')->execute([$auth['uid']]);
        json_out(self::messages($auth['uid']));
    }

    public static function send(array $body): void
    {
        $auth = require_auth();
        self::ensureTables();
        throttle('coachmsg:' . $auth['uid'], 60, 3600);
        $text = self::text($body);
        $me = AuthController::user_row($auth['uid']);
        $name = trim($me['first_name'] . ' ' . $me['last_name']);
        db()->prepare('INSERT INTO coach_messages (id, user_id, sender_id, from_coach, sender_name, text, read_by_member) VALUES (?,?,?,?,?,?,1)')
            ->execute([uid('cm'), $auth['uid'], $auth['uid'], 0, $name, $text]);
        // Tous les coachs et administrateurs sont prévenus.
        $staff = db()->query("SELECT id FROM users WHERE role IN ('coach','admin','superadmin')")->fetchAll(\PDO::FETCH_COLUMN);
        $notify = db()->prepare('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?,?,?,?,?)');
        foreach ($staff as $id) {
            if ($id !== $auth['uid']) {
                $notify->execute([uid('notif'), $id, 'announcement', "Message de $name", mb_substr($text, 0, 140)]);
            }
        }
        json_out(self::messages($auth['uid']), 201);
    }

    /** Nombre de réponses du coach non lues (pastille). */
    public static function unread(): void
    {
        $auth = require_auth();
        self::ensureTables();
        $st = db()->prepare('SELECT COUNT(*) FROM coach_messages WHERE user_id = ? AND from_coach = 1 AND read_by_member = 0');
        $st->execute([$auth['uid']]);
        json_out(['unread' => (int) $st->fetchColumn()]);
    }

    /* ---------- Côté coach ---------- */

    public static function inbox(): void
    {
        require_staff();
        self::ensureTables();
        $rows = db()->query(
            "SELECT m.user_id, u.first_name, u.last_name, u.avatar_url, u.is_premium,
                    MAX(m.created_at) AS last_at,
                    SUM(m.from_coach = 0 AND m.read_by_coach = 0) AS unread,
                    (SELECT text FROM coach_messages x WHERE x.user_id = m.user_id ORDER BY x.seq DESC LIMIT 1) AS last_text,
                    (SELECT from_coach FROM coach_messages x WHERE x.user_id = m.user_id ORDER BY x.seq DESC LIMIT 1) AS last_from_coach
             FROM coach_messages m JOIN users u ON u.id = m.user_id
             GROUP BY m.user_id, u.first_name, u.last_name, u.avatar_url, u.is_premium
             ORDER BY last_at DESC LIMIT 300"
        )->fetchAll();
        json_out(array_map(fn ($r) => [
            'memberId' => $r['user_id'],
            'memberName' => trim($r['first_name'] . ' ' . $r['last_name']),
            'avatarUrl' => $r['avatar_url'],
            'isPremium' => (bool) $r['is_premium'],
            'lastText' => mb_substr((string) $r['last_text'], 0, 160),
            'lastFromCoach' => (bool) $r['last_from_coach'],
            'lastAt' => date('c', strtotime($r['last_at'])),
            'unread' => (int) $r['unread'],
        ], $rows));
    }

    public static function thread(string $memberId): void
    {
        require_staff();
        self::ensureTables();
        AuthController::user_row($memberId);
        db()->prepare('UPDATE coach_messages SET read_by_coach = 1 WHERE user_id = ? AND from_coach = 0')->execute([$memberId]);
        json_out(self::messages($memberId));
    }

    public static function reply(string $memberId, array $body): void
    {
        $auth = require_staff();
        self::ensureTables();
        $member = AuthController::user_row($memberId);
        $text = self::text($body);
        $me = AuthController::user_row($auth['uid']);
        $name = trim($me['first_name'] . ' ' . $me['last_name']);
        db()->prepare('INSERT INTO coach_messages (id, user_id, sender_id, from_coach, sender_name, text, read_by_coach) VALUES (?,?,?,?,?,?,1)')
            ->execute([uid('cm'), $member['id'], $auth['uid'], 1, $name, $text]);
        db()->prepare('UPDATE coach_messages SET read_by_coach = 1 WHERE user_id = ? AND from_coach = 0')->execute([$member['id']]);
        db()->prepare('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?,?,?,?,?)')
            ->execute([uid('notif'), $member['id'], 'encouragement', "$name t’a répondu", mb_substr($text, 0, 140)]);
        json_out(self::messages($member['id']), 201);
    }

    /* ---------- Outils ---------- */

    private static function text(array $body): string
    {
        $text = clean_str($body['text'] ?? '', 2000);
        if ($text === '') {
            throw new ApiError('Message vide', 400);
        }
        return $text;
    }

    private static function messages(string $memberId): array
    {
        $st = db()->prepare('SELECT m.*, u.avatar_url FROM coach_messages m LEFT JOIN users u ON u.id = m.sender_id WHERE m.user_id = ? ORDER BY m.seq LIMIT 1000');
        $st->execute([$memberId]);
        return array_map(fn ($m) => [
            'id' => $m['id'],
            'memberId' => $m['user_id'],
            'senderId' => $m['sender_id'],
            'senderName' => $m['sender_name'],
            'avatarUrl' => $m['avatar_url'],
            'fromCoach' => (bool) $m['from_coach'],
            'text' => $m['text'],
            'read' => (bool) ($m['from_coach'] ? $m['read_by_member'] : $m['read_by_coach']),
            'createdAt' => date('c', strtotime($m['created_at'])),
        ], $st->fetchAll());
    }
}
