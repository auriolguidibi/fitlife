<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;
use FitLife\Services\Notifier;

class LiveController
{
    public static function list(): void
    {
        require_auth();
        self::ensureTables();
        $rows = db()->query('SELECT l.*, h.host_user_id, h.camera_on FROM lives l LEFT JOIN live_hosts h ON h.live_id = l.id ORDER BY l.status = "live" DESC, l.scheduled_at')->fetchAll();
        json_out(array_map('FitLife\Controllers\live_payload', $rows));
    }

    public static function get(string $id): void
    {
        require_auth();
        json_out(self::get_live($id));
    }

    public static function messages(string $id): void
    {
        require_auth();
        self::get_live($id);
        $st = db()->prepare('SELECT * FROM live_messages WHERE live_id = ? ORDER BY created_at');
        $st->execute([$id]);
        json_out(array_map(function ($m) {
            return [
                'id' => $m['id'], 'liveId' => $m['live_id'], 'userId' => $m['user_id'],
                'userName' => $m['user_name'], 'avatarUrl' => $m['avatar_url'], 'text' => $m['text'],
                'createdAt' => date('c', strtotime($m['created_at'])),
                'isCoach' => (bool) $m['is_coach'], 'isQuestion' => (bool) $m['is_question'],
            ];
        }, $st->fetchAll()));
    }

    public static function sendMessage(string $id, array $body): void
    {
        $auth = require_auth();
        $user = AuthController::user_row($auth['uid']);
        $staff = in_array($user['role'], ['coach', 'admin', 'superadmin'], true);
        // Offre : le chat avec le coach pendant les lives est réservé au Premium.
        if (!$staff && !(int) $user['is_premium']) {
            throw new ApiError('Le chat des lives est réservé aux membres Premium', 403);
        }
        $live = self::get_live($id);
        if ($live['status'] !== 'live') {
            throw new ApiError('Le chat est ouvert uniquement pendant le direct', 409);
        }
        $text = mb_substr(trim((string) ($body['text'] ?? '')), 0, 500);
        if ($text === '') {
            throw new ApiError('Message vide', 400);
        }
        $msgId = uid('lm');
        $name = $staff ? trim($user['first_name'] . ' ' . $user['last_name']) : $user['first_name'];
        $isQuestion = !$staff && !empty($body['isQuestion']);
        db()->prepare('INSERT INTO live_messages (id, live_id, user_id, user_name, avatar_url, text, is_coach, is_question) VALUES (?,?,?,?,?,?,?,?)')
            ->execute([$msgId, $id, $auth['uid'], $name, $user['avatar_url'], $text, $staff ? 1 : 0, $isQuestion ? 1 : 0]);
        json_out([
            'id' => $msgId, 'liveId' => $id, 'userId' => $auth['uid'], 'userName' => $name,
            'avatarUrl' => $user['avatar_url'], 'text' => $text, 'createdAt' => now_iso(),
            'isCoach' => $staff, 'isQuestion' => $isQuestion,
        ], 201);
    }

    public static function create(array $body): void
    {
        $auth = require_staff();
        $u = AuthController::user_row($auth['uid']);
        $id = uid('live');
        $coachId = clean_str($body['coachId'] ?? 'coach_awa', 20) ?: 'coach_awa';
        $coachName = clean_str($body['coachName'] ?? '', 60) ?: ($u['role'] === 'coach' ? trim($u['first_name'] . ' ' . $u['last_name']) : 'Coach Awa');
        $level = in_array($body['level'] ?? '', ['beginner', 'intermediate', 'advanced'], true) ? $body['level'] : 'beginner';
        $minutes = max(1, (int) ($body['durationMinutes'] ?? 30));
        $scheduledAt = isset($body['scheduledAt']) ? iso_to_datetime((string) $body['scheduledAt']) : date('Y-m-d H:i:s', time() + 86400);
        // « Lancer maintenant » : le live démarre immédiatement.
        $startNow = ($body['status'] ?? '') === 'live';
        if ($startNow) {
            $scheduledAt = date('Y-m-d H:i:s');
        }
        $title = clean_str($body['title'] ?? '', 160) ?: 'Nouveau live';
        db()->prepare(
            'INSERT INTO lives (id, coach_id, coach_name, title, description, status, scheduled_at, duration_minutes, viewers, level, premium_only, stream_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $id, $coachId, $coachName, $title,
            clean_str($body['description'] ?? '', 255), $startNow ? 'live' : 'scheduled', $scheduledAt, $minutes,
            $startNow ? 1 : 0, $level, (int) ($body['premiumOnly'] ?? 0), self::streamUrl($body['streamUrl'] ?? null),
        ]);
        Notifier::broadcast(
            $auth['uid'],
            'live',
            $startNow ? "$coachName est en direct" : "Nouveau live programmé : $title",
            $startNow ? "$title vient de commencer. Rejoins la séance !" : 'Le ' . Notifier::longDate($scheduledAt) . '.'
        );
        json_out(self::get_live($id), 201);
    }

    public static function setStatus(string $id, array $body): void
    {
        $auth = require_staff();
        $status = $body['status'] ?? '';
        if (!in_array($status, ['scheduled', 'live', 'ended'], true)) {
            throw new ApiError('Statut invalide', 400);
        }
        $before = self::get_live($id);
        $viewers = $status === 'live' ? 'GREATEST(viewers, 1)' : 'viewers';
        db()->prepare("UPDATE lives SET status = ?, viewers = $viewers WHERE id = ?")->execute([$status, $id]);
        if ($status === 'live' && $before['status'] !== 'live') {
            // Tous les membres sont prévenus au moment où l'hôte lance le direct.
            Notifier::broadcast($auth['uid'], 'live', $before['coachName'] . ' est en direct', $before['title'] . ' vient de commencer. Rejoins la séance !');
        }
        if ($status === 'ended') {
            db()->prepare('DELETE FROM live_signals WHERE live_id = ?')->execute([$id]);
            db()->prepare('UPDATE live_hosts SET camera_on = 0 WHERE live_id = ?')->execute([$id]);
        }
        json_out(self::get_live($id));
    }

    public static function update(string $id, array $body): void
    {
        require_staff();
        self::get_live($id);
        $map = [];
        if (array_key_exists('title', $body)) {
            $title = trim((string) $body['title']);
            if ($title === '') {
                throw new ApiError('Le titre est obligatoire', 400);
            }
            $map['title'] = mb_substr($title, 0, 160);
        }
        if (array_key_exists('description', $body)) {
            $map['description'] = mb_substr((string) $body['description'], 0, 255);
        }
        if (array_key_exists('scheduledAt', $body)) {
            $map['scheduled_at'] = iso_to_datetime((string) $body['scheduledAt']);
        }
        if (array_key_exists('durationMinutes', $body)) {
            $map['duration_minutes'] = max(1, (int) $body['durationMinutes']);
        }
        if (array_key_exists('level', $body) && in_array($body['level'], ['beginner', 'intermediate', 'advanced'], true)) {
            $map['level'] = $body['level'];
        }
        if (array_key_exists('premiumOnly', $body)) {
            $map['premium_only'] = !empty($body['premiumOnly']) ? 1 : 0;
        }
        if (array_key_exists('streamUrl', $body)) {
            $map['stream_url'] = self::streamUrl($body['streamUrl']);
        }
        if (array_key_exists('coachName', $body) && trim((string) $body['coachName']) !== '') {
            $map['coach_name'] = mb_substr(trim((string) $body['coachName']), 0, 60);
            $map['coach_id'] = mb_substr((string) ($body['coachId'] ?? 'coach_awa'), 0, 20);
        }
        if ($map) {
            $sets = implode(', ', array_map(fn ($k) => "$k = ?", array_keys($map)));
            db()->prepare("UPDATE lives SET $sets WHERE id = ?")->execute([...array_values($map), $id]);
        }
        json_out(self::get_live($id));
    }

    public static function delete(string $id): void
    {
        require_staff();
        db()->prepare('DELETE FROM lives WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    /* ---------- Diffusion caméra (WebRTC) ---------- */

    /** Tables du direct caméra, créées à la volée si la base date d'avant cette fonction. */
    private static function ensureTables(): void
    {
        static $done = false;
        if ($done) {
            return;
        }
        $db = db();
        $db->exec('CREATE TABLE IF NOT EXISTS live_hosts (
            live_id      VARCHAR(20) NOT NULL PRIMARY KEY,
            host_user_id VARCHAR(20) NOT NULL,
            camera_on    TINYINT(1) NOT NULL DEFAULT 1,
            mic_on       TINYINT(1) NOT NULL DEFAULT 1,
            updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB');
        $db->exec('CREATE TABLE IF NOT EXISTS live_signals (
            id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            live_id    VARCHAR(20) NOT NULL,
            from_user  VARCHAR(20) NOT NULL,
            to_user    VARCHAR(20) NOT NULL,
            kind       VARCHAR(16) NOT NULL,
            payload    MEDIUMTEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY (live_id, to_user, id)
        ) ENGINE=InnoDB');
        $done = true;
    }

    /** L'hôte annonce qu'il diffuse sa caméra (et l'état caméra / micro). */
    public static function broadcast(string $id, array $body): void
    {
        $auth = require_staff();
        $live = self::get_live($id);
        if ($live['status'] !== 'live') {
            throw new ApiError('Le live n’est pas en direct', 409);
        }
        db()->prepare(
            'INSERT INTO live_hosts (live_id, host_user_id, camera_on, mic_on) VALUES (?,?,?,?)
             ON DUPLICATE KEY UPDATE host_user_id = VALUES(host_user_id), camera_on = VALUES(camera_on), mic_on = VALUES(mic_on)'
        )->execute([$id, $auth['uid'], empty($body['cameraOn']) ? 0 : 1, empty($body['micOn']) ? 0 : 1]);
        json_out(self::get_live($id));
    }

    /** Message de signalisation WebRTC (join / offer / answer / leave). */
    public static function sendSignal(string $id, array $body): void
    {
        $auth = require_auth();
        $live = self::get_live($id);
        $kind = (string) ($body['kind'] ?? '');
        if (!in_array($kind, ['join', 'offer', 'answer', 'leave'], true)) {
            throw new ApiError('Signal invalide', 400);
        }
        $to = (string) ($body['to'] ?? '');
        if ($to === '' || strlen($to) > 20) {
            throw new ApiError('Destinataire invalide', 400);
        }
        $staff = in_array($auth['role'] ?? '', ['coach', 'admin', 'superadmin'], true);
        // Un membre ne peut s'adresser qu'à l'hôte du live.
        if (!$staff && $to !== ($live['hostUserId'] ?? '')) {
            throw new ApiError('Destinataire invalide', 403);
        }
        $payload = isset($body['payload']) ? json_encode($body['payload']) : null;
        if ($payload !== null && strlen($payload) > 60000) {
            throw new ApiError('Signal trop volumineux', 413);
        }
        db()->prepare('INSERT INTO live_signals (live_id, from_user, to_user, kind, payload) VALUES (?,?,?,?,?)')
            ->execute([$id, $auth['uid'], $to, $kind, $payload]);
        // Ménage : les signaux de plus de 2 minutes ne servent plus.
        db()->prepare('DELETE FROM live_signals WHERE created_at < (NOW() - INTERVAL 2 MINUTE)')->execute();
        json_out(['ok' => true], 201);
    }

    /** Signaux en attente pour l'utilisateur connecté (consommés à la lecture). */
    public static function signals(string $id): void
    {
        $auth = require_auth();
        self::ensureTables();
        $st = db()->prepare('SELECT * FROM live_signals WHERE live_id = ? AND to_user = ? ORDER BY id');
        $st->execute([$id, $auth['uid']]);
        $rows = $st->fetchAll();
        if ($rows) {
            $ids = array_map(fn ($r) => (int) $r['id'], $rows);
            $in = implode(',', array_fill(0, count($ids), '?'));
            db()->prepare("DELETE FROM live_signals WHERE id IN ($in)")->execute($ids);
        }
        json_out(array_map(fn ($r) => [
            'from' => $r['from_user'],
            'kind' => $r['kind'],
            'payload' => $r['payload'] !== null ? json_decode($r['payload'], true) : null,
        ], $rows));
    }


    /** Lien http(s) uniquement (pas de javascript:, data:…). */
    private static function streamUrl(mixed $url): ?string
    {
        $url = trim((string) ($url ?? ''));
        if ($url === '') {
            return null;
        }
        if (!preg_match('#^https?://#i', $url) || filter_var($url, FILTER_VALIDATE_URL) === false) {
            throw new ApiError('Lien du direct invalide (https://…)', 400);
        }
        return mb_substr($url, 0, 500);
    }

    private static function get_live(string $id): array
    {
        self::ensureTables();
        $st = db()->prepare('SELECT l.*, h.host_user_id, h.camera_on FROM lives l LEFT JOIN live_hosts h ON h.live_id = l.id WHERE l.id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Live introuvable', 404);
        }
        return live_payload($row);
    }
}

function live_payload(array $l): array
{
    return [
        'id' => $l['id'],
        'coachId' => $l['coach_id'],
        'coachName' => $l['coach_name'],
        'coachAvatarUrl' => $l['coach_avatar_url'],
        'title' => $l['title'],
        'description' => $l['description'],
        'status' => $l['status'],
        'scheduledAt' => date('c', strtotime($l['scheduled_at'])),
        'durationMinutes' => (int) $l['duration_minutes'],
        'viewers' => (int) $l['viewers'],
        'level' => $l['level'],
        'premiumOnly' => (bool) $l['premium_only'],
        'thumbnailUrl' => $l['thumbnail_url'],
        'streamUrl' => $l['stream_url'] ?? null,
        'hostUserId' => $l['host_user_id'] ?? null,
        'cameraOn' => isset($l['camera_on']) ? (bool) $l['camera_on'] : false,
    ];
}