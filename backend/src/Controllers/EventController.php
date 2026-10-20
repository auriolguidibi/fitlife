<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;
use FitLife\Services\Notifier;

/** Événements : lecture et inscription pour tous, gestion pour coachs / admins. */
class EventController
{
    private const CATEGORIES = ['workshop', 'run', 'challenge', 'meetup', 'webinar'];

    public static function list(): void
    {
        $auth = require_auth();
        $st = db()->prepare(
            'SELECT e.*, (SELECT COUNT(*) FROM event_attendees a WHERE a.event_id = e.id) AS attendees,
                    EXISTS(SELECT 1 FROM event_attendees a WHERE a.event_id = e.id AND a.user_id = ?) AS attending
             FROM events e ORDER BY e.starts_at'
        );
        $st->execute([$auth['uid']]);
        json_out(array_map([self::class, 'payload'], $st->fetchAll()));
    }

    public static function create(array $body): void
    {
        $auth = require_staff();
        $author = AuthController::user_row($auth['uid']);
        $data = self::validate($body, true);
        $id = uid('evt');
        db()->prepare(
            'INSERT INTO events (id, title, description, category, starts_at, duration_minutes, location, online, capacity, cover_url, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $id, $data['title'], $data['description'], $data['category'], $data['starts_at'], $data['duration_minutes'],
            $data['location'], $data['online'], $data['capacity'], $data['cover_url'],
            trim($author['first_name'] . ' ' . $author['last_name']),
        ]);
        Notifier::broadcast(
            $auth['uid'],
            'event',
            'Nouvel événement : ' . $data['title'],
            Notifier::longDate($data['starts_at']) . ' · ' . $data['location']
        );
        json_out(self::find($id, $auth['uid']), 201);
    }

    public static function update(string $id, array $body): void
    {
        $auth = require_staff();
        self::find($id, $auth['uid']);
        $data = self::validate($body, false);
        if ($data) {
            $sets = implode(', ', array_map(fn ($k) => "$k = ?", array_keys($data)));
            db()->prepare("UPDATE events SET $sets WHERE id = ?")->execute([...array_values($data), $id]);
        }
        json_out(self::find($id, $auth['uid']));
    }

    public static function delete(string $id): void
    {
        require_staff();
        db()->prepare('DELETE FROM events WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    public static function toggleAttendance(string $id): void
    {
        $auth = require_auth();
        $event = self::find($id, $auth['uid']);
        if ($event['attending']) {
            db()->prepare('DELETE FROM event_attendees WHERE event_id = ? AND user_id = ?')->execute([$id, $auth['uid']]);
        } else {
            if ($event['capacity'] !== null && $event['attendees'] >= $event['capacity']) {
                throw new ApiError('Cet événement est complet', 409);
            }
            db()->prepare('INSERT IGNORE INTO event_attendees (event_id, user_id) VALUES (?, ?)')->execute([$id, $auth['uid']]);
        }
        json_out(self::find($id, $auth['uid']));
    }

    /** Champs autorisés → colonnes SQL. $full : tous les champs requis (création). */
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
        if ($full || array_key_exists('description', $b)) {
            $out['description'] = trim((string) ($b['description'] ?? ''));
        }
        if ($full || array_key_exists('category', $b)) {
            $out['category'] = in_array($b['category'] ?? '', self::CATEGORIES, true) ? $b['category'] : 'meetup';
        }
        if ($full || array_key_exists('startsAt', $b)) {
            if (empty($b['startsAt'])) {
                throw new ApiError('La date de début est obligatoire', 400);
            }
            $out['starts_at'] = iso_to_datetime((string) $b['startsAt']);
        }
        if ($full || array_key_exists('durationMinutes', $b)) {
            $out['duration_minutes'] = max(5, min(1440, (int) ($b['durationMinutes'] ?? 60)));
        }
        if ($full || array_key_exists('location', $b)) {
            $out['location'] = mb_substr(trim((string) ($b['location'] ?? '')), 0, 255);
        }
        if ($full || array_key_exists('online', $b)) {
            $out['online'] = !empty($b['online']) ? 1 : 0;
        }
        if ($full || array_key_exists('capacity', $b)) {
            $cap = $b['capacity'] ?? null;
            $out['capacity'] = ($cap === null || $cap === '' || (int) $cap <= 0) ? null : (int) $cap;
        }
        if ($full || array_key_exists('coverUrl', $b)) {
            $url = trim((string) ($b['coverUrl'] ?? ''));
            $out['cover_url'] = safe_url($url, 'Image');
        }
        return $out;
    }

    private static function find(string $id, string $userId): array
    {
        $st = db()->prepare(
            'SELECT e.*, (SELECT COUNT(*) FROM event_attendees a WHERE a.event_id = e.id) AS attendees,
                    EXISTS(SELECT 1 FROM event_attendees a WHERE a.event_id = e.id AND a.user_id = ?) AS attending
             FROM events e WHERE e.id = ?'
        );
        $st->execute([$userId, $id]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Événement introuvable', 404);
        }
        return self::payload($row);
    }

    private static function payload(array $e): array
    {
        return [
            'id' => $e['id'],
            'title' => $e['title'],
            'description' => $e['description'],
            'category' => $e['category'],
            'startsAt' => date('c', strtotime($e['starts_at'])),
            'durationMinutes' => (int) $e['duration_minutes'],
            'location' => $e['location'],
            'online' => (bool) $e['online'],
            'capacity' => $e['capacity'] === null ? null : (int) $e['capacity'],
            'attendees' => (int) $e['attendees'],
            'attending' => (bool) $e['attending'],
            'coverUrl' => $e['cover_url'],
            'createdBy' => $e['created_by'],
            'createdAt' => date('c', strtotime($e['created_at'])),
            'updatedAt' => date('c', strtotime($e['updated_at'])),
        ];
    }
}
