<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;
use FitLife\Services\AwardService;

const ANTI_CHEAT = [
    'maxRunSpeedKmh' => 32, 'maxBikeSpeedKmh' => 65, 'maxWalkSpeedKmh' => 12, 'maxOtherSpeedKmh' => 40,
    'maxDistanceJumpKm' => 0.6, 'minSessionSecondsForRanking' => 60,
];

class ActivityController
{
    public static function start(array $body): void
    {
        $auth = require_auth();
        $user = AuthController::user_row($auth['uid']);
        $type = in_array($body['type'] ?? '', ['walk', 'run', 'bike', 'other'], true) ? $body['type'] : 'walk';
        $id = uid('act');
        $now = date('Y-m-d H:i:s');
        db()->prepare(
            'INSERT INTO activities (id, user_id, type, status, started_at) VALUES (?,?,?,?,?)'
        )->execute([$id, $auth['uid'], $type, 'active', $now]);
        json_out(activity_payload([
            'id' => $id, 'user_id' => $auth['uid'], 'user_name' => $user['first_name'] . ' ' . $user['last_name'],
            'type' => $type, 'status' => 'active', 'started_at' => $now, 'finished_at' => null,
            'duration_seconds' => 0, 'moving_seconds' => 0, 'distance_km' => 0, 'steps' => 0,
            'avg_speed_kmh' => 0, 'max_speed_kmh' => 0, 'calories' => 0, 'route' => '[]',
            'review_status' => 'pending', 'review_reason' => null,
        ]), 201);
    }

    public static function update(string $id, array $body): void
    {
        $auth = require_auth();
        $row = self::own_activity($id, $auth['uid']);
        // Une activité terminée (validée ou non) ne peut plus être modifiée : sinon triche au classement.
        if (!in_array($row['status'], ['active', 'paused'], true)) {
            throw new ApiError('Activité terminée : modification impossible', 409);
        }
        $updates = [];
        $params = ['id' => $id];
        $limits = ['durationSeconds' => 86400, 'movingSeconds' => 86400, 'distanceKm' => 1000, 'steps' => 200000, 'calories' => 20000];
        foreach (['durationSeconds' => 'duration_seconds', 'movingSeconds' => 'moving_seconds', 'distanceKm' => 'distance_km', 'steps' => 'steps', 'calories' => 'calories'] as $key => $col) {
            if (array_key_exists($key, $body)) {
                if (!is_numeric($body[$key])) {
                    throw new ApiError('Valeur invalide : ' . $key, 400);
                }
                $updates[] = "$col = :$key";
                $params[$key] = max(0, min($limits[$key], (float) $body[$key]));
            }
        }
        // Seules la pause et la reprise passent par ici ; la fin passe par /finish (contrôles anti-triche).
        if (array_key_exists('status', $body)) {
            if (!in_array($body['status'], ['active', 'paused'], true)) {
                throw new ApiError('Statut invalide', 400);
            }
            $updates[] = 'status = :status';
            $params['status'] = $body['status'];
        }
        if (array_key_exists('route', $body) && is_array($body['route'])) {
            $route = [];
            foreach (array_slice($body['route'], 0, 20000) as $pt) {
                if (is_array($pt) && is_numeric($pt['lat'] ?? null) && is_numeric($pt['lng'] ?? null)) {
                    $route[] = [
                        'lat' => (float) $pt['lat'],
                        'lng' => (float) $pt['lng'],
                        'timestamp' => is_numeric($pt['timestamp'] ?? null) ? (float) $pt['timestamp'] : 0,
                        'speed' => is_numeric($pt['speed'] ?? null) ? max(0, min(500, (float) $pt['speed'])) : 0,
                    ];
                }
            }
            $updates[] = 'route = :route';
            $params['route'] = json_encode($route);
        }
        if (array_key_exists('maxSpeedKmh', $body)) {
            $updates[] = 'max_speed_kmh = :max';
            $params['max'] = max(0, min(500, (float) $body['maxSpeedKmh']));
        }
        if ($updates) {
            db()->prepare('UPDATE activities SET ' . implode(', ', $updates) . ' WHERE id = :id')->execute($params);
        }
        json_out(self::fetch($id));
    }

    /** Abandon d'une session en cours : supprimée, hors historique et classement. */
    public static function cancel(string $id): void
    {
        $auth = require_auth();
        $row = self::own_activity($id, $auth['uid']);
        if ($row['status'] === 'finished') {
            throw new ApiError('Une activité terminée ne peut pas être abandonnée', 409);
        }
        db()->prepare('DELETE FROM activities WHERE id = ? AND user_id = ?')->execute([$id, $auth['uid']]);
        json_out(['ok' => true]);
    }

    public static function finish(string $id): void
    {
        $auth = require_auth();
        $user = AuthController::user_row($auth['uid']);
        $row = self::own_activity($id, $auth['uid']);
        if ($row['status'] === 'finished') {
            throw new ApiError('Activité déjà terminée', 409);
        }
        $distanceKm = (float) $row['distance_km'];
        $moving = (int) $row['moving_seconds'];
        $avgSpeed = round_f($moving > 0 ? $distanceKm / ($moving / 3600) : 0, 2);
        $maxSpeed = (float) $row['max_speed_kmh'];
        $now = date('Y-m-d H:i:s');

        $speedLimits = ANTI_CHEAT;
        $limit = ['run' => $speedLimits['maxRunSpeedKmh'], 'bike' => $speedLimits['maxBikeSpeedKmh'], 'walk' => $speedLimits['maxWalkSpeedKmh'], 'other' => $speedLimits['maxOtherSpeedKmh']][$row['type']];
        $reason = null;
        // haversine-based GPS jumps
        $route = json_decode($row['route'] ?? '[]', true) ?: [];
        if (count($route) > 1) {
            for ($i = 1; $i < count($route); $i++) {
                $a = $route[$i - 1];
                $b = $route[$i];
                $jump = haversine($a['lat'], $a['lng'], $b['lat'], $b['lng']);
                if ($jump > $speedLimits['maxDistanceJumpKm']) {
                    $reason = 'Saut GPS anormal détecté (signal suspect).';
                    break;
                }
            }
        }
        $duplicate = self::is_duplicate($id, $auth['uid'], $row);
        if ($duplicate) {
            $reason = 'Session en doublon détectée.';
        } elseif ($reason === null && $maxSpeed > $limit) {
            $reason = 'Vitesse maximale inhabituelle (' . round_f($maxSpeed, 0) . ' km/h).';
        } elseif ($reason === null && $avgSpeed > $limit) {
            $reason = 'Vitesse moyenne incohérente (' . round_f($avgSpeed, 0) . ' km/h).';
        } elseif ($reason === null && (int) $row['duration_seconds'] < $speedLimits['minSessionSecondsForRanking'] && $distanceKm > 1) {
            $reason = 'Distance trop élevée pour une durée aussi courte.';
        } elseif ($reason === null && (!is_finite($distanceKm) || $distanceKm <= 0)) {
            $reason = 'Distance invalide.';
        }

        $review = $reason ? 'pending' : 'validated';
        db()->prepare(
            'UPDATE activities SET status = ?, finished_at = ?, avg_speed_kmh = ?, review_status = ?, review_reason = ? WHERE id = ?'
        )->execute(['finished', $now, $avgSpeed, $review, $reason, $id]);

        if ($review === 'validated') {
            AwardService::award($auth['uid'], $user, prefs_payload(AuthController::prefs_row($auth['uid'])));
        }
        json_out(['activity' => self::fetch($id), 'flagged' => $review !== 'validated', 'reason' => $reason]);
    }

    public static function list(): void
    {
        $auth = require_auth();
        $st = db()->prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY started_at DESC');
        $st->execute([$auth['uid']]);
        json_out(array_map('FitLife\Controllers\activity_payload', $st->fetchAll()));
    }

    public static function active(): void
    {
        $auth = require_auth();
        $st = db()->prepare("SELECT * FROM activities WHERE user_id = ? AND status IN ('active','paused') ORDER BY started_at DESC LIMIT 1");
        $st->execute([$auth['uid']]);
        $row = $st->fetch();
        json_out($row ? activity_payload($row) : null);
    }

    public static function getSteps(): void
    {
        $auth = require_auth();
        $date = (string) ($_GET['date'] ?? date('Y-m-d'));
        $st = db()->prepare('SELECT steps FROM steps_log WHERE user_id = ? AND date = ?');
        $st->execute([$auth['uid'], $date]);
        json_out((int) $st->fetchColumn() ?: 0);
    }

    public static function setSteps(array $body): void
    {
        $auth = require_auth();
        $date = (string) ($body['date'] ?? date('Y-m-d'));
        $steps = max(0, (int) ($body['steps'] ?? 0));
        $db = db();
        $st = $db->prepare('SELECT steps FROM steps_log WHERE user_id = ? AND date = ?');
        $st->execute([$auth['uid'], $date]);
        $val = max((int) $st->fetchColumn() ?: 0, $steps);
        $db->prepare('INSERT INTO steps_log (user_id, date, steps) VALUES (?,?,?) ON DUPLICATE KEY UPDATE steps = ?')
            ->execute([$auth['uid'], $date, $val, $val]);
        json_out($val);
    }

    /* ---------------- helpers ---------------- */

    private static function own_activity(string $id, string $userId): array
    {
        $st = db()->prepare('SELECT * FROM activities WHERE id = ? AND user_id = ?');
        $st->execute([$id, $userId]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Activité introuvable', 404);
        }
        return $row;
    }

    private static function is_duplicate(string $id, string $userId, array $candidate): bool
    {
        $st = db()->prepare("SELECT * FROM activities WHERE user_id = ? AND id <> ? AND review_status <> 'rejected'");
        $st->execute([$userId, $id]);
        $candTime = strtotime($candidate['started_at']);
        $candKm = (float) $candidate['distance_km'];
        foreach ($st->fetchAll() as $a) {
            if (abs(strtotime($a['started_at']) - $candTime) < 60 && abs((float) $a['distance_km'] - $candKm) < 0.01) {
                return true;
            }
        }
        return false;
    }

    private static function fetch(string $id): array
    {
        $st = db()->prepare('SELECT * FROM activities WHERE id = ?');
        $st->execute([$id]);
        return activity_payload($st->fetch());
    }
}

function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $R = 6371.0;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
    return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
}

function activity_payload(array $a): array
{
    return [
        'id' => $a['id'],
        'userId' => $a['user_id'],
        'userName' => $a['user_name'] ?? null,
        'type' => $a['type'],
        'status' => $a['status'],
        'startedAt' => date('c', strtotime($a['started_at'])),
        'finishedAt' => $a['finished_at'] ? date('c', strtotime($a['finished_at'])) : null,
        'durationSeconds' => (int) $a['duration_seconds'],
        'movingSeconds' => (int) $a['moving_seconds'],
        'distanceKm' => (float) $a['distance_km'],
        'steps' => (int) $a['steps'],
        'avgSpeedKmh' => (float) $a['avg_speed_kmh'],
        'maxSpeedKmh' => (float) $a['max_speed_kmh'],
        'calories' => (int) $a['calories'],
        'route' => json_decode($a['route'] ?? '[]', true) ?: [],
        'reviewStatus' => $a['review_status'],
        'reviewReason' => $a['review_reason'],
    ];
}