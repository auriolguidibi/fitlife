<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;
use FitLife\Services\Notifier;

/** Annonces : lues par tous les membres, publiées / actualisées par les coachs et admins. */
class AnnouncementController
{
    private const PRIORITIES = ['info', 'important', 'urgent'];

    public static function list(): void
    {
        $auth = require_auth();
        // ?all=1 : vue gestion (annonces expirées comprises), réservée au staff.
        $all = !empty($_GET['all']) && in_array($auth['role'] ?? '', ['coach', 'admin', 'superadmin'], true);
        $sql = 'SELECT * FROM announcements'
            . ($all ? '' : ' WHERE expires_at IS NULL OR expires_at > NOW()')
            . ' ORDER BY pinned DESC, updated_at DESC';
        json_out(array_map([self::class, 'payload'], db()->query($sql)->fetchAll()));
    }

    public static function create(array $body): void
    {
        $auth = require_staff();
        $author = AuthController::user_row($auth['uid']);
        $data = self::validate($body, true);
        $id = uid('ann');
        $authorName = in_array($author['role'], ['admin', 'superadmin'], true) ? 'Équipe FitLife' : trim($author['first_name'] . ' ' . $author['last_name']);
        db()->prepare(
            'INSERT INTO announcements (id, title, content, priority, pinned, expires_at, author_name, author_role) VALUES (?,?,?,?,?,?,?,?)'
        )->execute([
            $id, $data['title'], $data['content'], $data['priority'], $data['pinned'], $data['expires_at'],
            $authorName, $author['role'],
        ]);
        Notifier::broadcast($auth['uid'], 'announcement', $data['title'], mb_substr($data['content'], 0, 140));
        json_out(self::find($id), 201);
    }

    public static function update(string $id, array $body): void
    {
        require_staff();
        self::find($id);
        $data = self::validate($body, false);
        if ($data) {
            $sets = implode(', ', array_map(fn ($k) => "$k = ?", array_keys($data)));
            db()->prepare("UPDATE announcements SET $sets WHERE id = ?")->execute([...array_values($data), $id]);
        }
        json_out(self::find($id));
    }

    public static function delete(string $id): void
    {
        require_staff();
        db()->prepare('DELETE FROM announcements WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    private static function validate(array $b, bool $full): array
    {
        $out = [];
        if ($full || array_key_exists('title', $b)) {
            $title = trim((string) ($b['title'] ?? ''));
            if ($title === '') {
                throw new ApiError('Le titre est obligatoire', 400);
            }
            $out['title'] = mb_substr($title, 0, 160);
        }
        if ($full || array_key_exists('content', $b)) {
            $content = trim((string) ($b['content'] ?? ''));
            if ($content === '') {
                throw new ApiError('Le contenu est obligatoire', 400);
            }
            $out['content'] = $content;
        }
        if ($full || array_key_exists('priority', $b)) {
            $out['priority'] = in_array($b['priority'] ?? '', self::PRIORITIES, true) ? $b['priority'] : 'info';
        }
        if ($full || array_key_exists('pinned', $b)) {
            $out['pinned'] = !empty($b['pinned']) ? 1 : 0;
        }
        if ($full || array_key_exists('expiresAt', $b)) {
            $out['expires_at'] = empty($b['expiresAt']) ? null : iso_to_datetime((string) $b['expiresAt']);
        }
        return $out;
    }

    private static function find(string $id): array
    {
        $st = db()->prepare('SELECT * FROM announcements WHERE id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Annonce introuvable', 404);
        }
        return self::payload($row);
    }

    private static function payload(array $a): array
    {
        return [
            'id' => $a['id'],
            'title' => $a['title'],
            'content' => $a['content'],
            'priority' => $a['priority'],
            'pinned' => (bool) $a['pinned'],
            'expiresAt' => $a['expires_at'] ? date('c', strtotime($a['expires_at'])) : null,
            'authorName' => $a['author_name'],
            'authorRole' => $a['author_role'],
            'createdAt' => date('c', strtotime($a['created_at'])),
            'updatedAt' => date('c', strtotime($a['updated_at'])),
        ];
    }
}
