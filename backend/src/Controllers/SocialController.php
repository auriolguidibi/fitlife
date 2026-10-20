<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;
use FitLife\Services\AwardService;

class SocialController
{
    /* --------------------------- Leaderboard -------------------------- */

    public static function leaderboard(string $period): void
    {
        if (!in_array($period, ['daily', 'weekly', 'monthly', 'allTime'], true)) {
            throw new ApiError('Période invalide', 400);
        }
        $cutoff = match ($period) {
            'daily' => date('Y-m-d 00:00:00'),
            'weekly' => date('Y-m-d H:i:s', strtotime('-7 days')),
            'monthly' => date('Y-m-d H:i:s', strtotime('-30 days')),
            default => '1970-01-01 00:00:00',
        };
        $auth = require_auth();
        $rows = db()->prepare(
            "SELECT a.user_id, u.first_name, u.last_name, u.avatar_url, SUM(a.distance_km) AS km
             FROM activities a JOIN users u ON u.id = a.user_id
             WHERE a.review_status = 'validated' AND a.status = 'finished' AND a.started_at >= ?
             GROUP BY a.user_id ORDER BY km DESC"
        );
        $rows->execute([$cutoff]);

        $entries = [];
        foreach ($rows->fetchAll() as $r) {
            $entries[] = [
                'rank' => 0,
                'userId' => $r['user_id'],
                'name' => trim($r['first_name'] . ' ' . $r['last_name']),
                'avatarUrl' => $r['avatar_url'],
                'distanceKm' => round_f((float) $r['km'], 2),
                'isCurrentUser' => $r['user_id'] === $auth['uid'],
            ];
        }
        // make sure current user appears
        $found = array_filter($entries, fn ($e) => $e['isCurrentUser']);
        if (!$found) {
            $u = AuthController::user_row($auth['uid']);
            $mine = 0.0;
            $st = db()->prepare("SELECT COALESCE(SUM(distance_km),0) FROM activities WHERE user_id = ? AND review_status='validated' AND status='finished' AND started_at >= ?");
            $st->execute([$auth['uid'], $cutoff]);
            $mine = round_f((float) $st->fetchColumn(), 2);
            $entries[] = ['rank' => 0, 'userId' => $auth['uid'], 'name' => $u['first_name'], 'avatarUrl' => $u['avatar_url'], 'distanceKm' => $mine, 'isCurrentUser' => true];
        }
        usort($entries, fn ($a, $b) => $b['distanceKm'] <=> $a['distanceKm']);
        $entries = array_values($entries);
        foreach ($entries as $i => &$e) {
            $e['rank'] = $i + 1;
        }
        unset($e);
        $meIdx = null;
        foreach ($entries as $i => $e) {
            if ($e['isCurrentUser']) {
                $meIdx = $i;
                break;
            }
        }
        $currentUserRank = $meIdx !== null ? $entries[$meIdx] : null;
        $above = $meIdx !== null && $meIdx > 0 ? $entries[$meIdx - 1] : null;

        json_out([
            'period' => $period,
            'entries' => $entries,
            'currentUserRank' => $currentUserRank,
            'nextTargetKm' => $above ? round_f($above['distanceKm'] - ($currentUserRank['distanceKm'] ?? 0), 1) : null,
            'nextTargetName' => $above ? $above['name'] : null,
        ]);
    }

    /* --------------------------- Challenges --------------------------- */

    public static function challenges(): void
    {
        $rows = db()->query('SELECT c.*, (SELECT COUNT(*) FROM challenge_participations p WHERE p.challenge_id = c.id) AS participants FROM challenges c ORDER BY c.starts_at')->fetchAll();
        json_out(array_map('FitLife\Controllers\challenge_payload', $rows));
    }

    public static function participations(): void
    {
        $auth = require_auth();
        AwardService::refreshChallengeProgress($auth['uid']);
        $st = db()->prepare(
            'SELECT c.*, p.user_id, p.progress, p.joined_at, p.completed FROM challenges c JOIN challenge_participations p ON p.challenge_id = c.id WHERE p.user_id = ?'
        );
        $st->execute([$auth['uid']]);
        json_out(array_map(function ($r) {
            return [
                'challengeId' => $r['id'],
                'userId' => $r['user_id'],
                'progress' => (float) $r['progress'],
                'joinedAt' => date('c', strtotime($r['joined_at'])),
                'completed' => (bool) $r['completed'],
            ];
        }, array_merge([], $st->fetchAll())));
    }

    /** Quitter un défi : la participation (et sa progression) est supprimée. */
    public static function leaveChallenge(string $id): void
    {
        $auth = require_auth();
        db()->prepare('DELETE FROM challenge_participations WHERE challenge_id = ? AND user_id = ?')->execute([$id, $auth['uid']]);
        json_out(['ok' => true]);
    }

    public static function joinChallenge(string $id): void
    {
        $auth = require_auth();
        $db = db();
        $st = $db->prepare('SELECT * FROM challenges WHERE id = ? AND (starts_at <= ? OR starts_at IS NULL)');
        $st->execute([$id, date('Y-m-d H:i:s')]);
        if (!$st->fetch()) {
            throw new ApiError('Défi introuvable', 404);
        }
        $exists = $db->prepare('SELECT challenge_id FROM challenge_participations WHERE challenge_id = ? AND user_id = ?');
        $exists->execute([$id, $auth['uid']]);
        if ($exists->fetch()) {
            $row = $db->prepare('SELECT * FROM challenges WHERE id = ?');
            $row->execute([$id]);
            $progress = AwardService::challenge_progress($row->fetch(), $auth['uid']);
            self::respond_participation($id, $auth['uid'], $progress);
            return;
        }
        $ch = $db->prepare('SELECT * FROM challenges WHERE id = ?');
        $ch->execute([$id]);
        $challenge = $ch->fetch();
        $progress = AwardService::challenge_progress($challenge, $auth['uid']);
        $completed = $progress >= (int) $challenge['target'] ? 1 : 0;
        $db->prepare('INSERT INTO challenge_participations (challenge_id, user_id, progress, joined_at, completed) VALUES (?,?,?,?,?)')
            ->execute([$id, $auth['uid'], $progress, date('Y-m-d H:i:s'), $completed]);
        AwardService::award($auth['uid'], AuthController::user_row($auth['uid']), prefs_payload(AuthController::prefs_row($auth['uid'])));
        self::respond_participation($id, $auth['uid'], $progress);
    }

    private static function respond_participation(string $challengeId, string $userId, float $progress): never
    {
        $st = db()->prepare('SELECT target FROM challenges WHERE id = ?');
        $st->execute([$challengeId]);
        $target = (int) $st->fetchColumn();
        json_out([
            'challengeId' => $challengeId,
            'userId' => $userId,
            'progress' => $progress,
            'joinedAt' => now_iso(),
            'completed' => $progress >= $target,
        ]);
    }

    /* ----------------------------- Badges ----------------------------- */

    public static function badges(): void
    {
        $rows = db()->query('SELECT * FROM badges ORDER BY code')->fetchAll();
        json_out(array_map(fn ($b) => [
            'id' => $b['code'], 'name' => $b['name'], 'emoji' => $b['emoji'],
            'description' => $b['description'], 'requirement' => $b['requirement'], 'tier' => $b['tier'],
        ], $rows));
    }

    public static function earnedBadges(): void
    {
        $auth = require_auth();
        $st = db()->prepare('SELECT badge_code, earned_at FROM user_badges WHERE user_id = ?');
        $st->execute([$auth['uid']]);
        json_out(array_map(fn ($b) => [
            'badgeId' => $b['badge_code'], 'userId' => $auth['uid'], 'earnedAt' => date('c', strtotime($b['earned_at'])),
        ], $st->fetchAll()));
    }

    /* ---------------------------- Community --------------------------- */

    public static function feed(): void
    {
        $auth = require_auth();
        $rows = db()->query('SELECT * FROM community_posts ORDER BY created_at DESC')->fetchAll();
        json_out(array_map(fn ($p) => self::post_payload($p, $auth['uid']), $rows));
    }

    public static function createPost(array $body): void
    {
        $auth = require_auth();
        $user = AuthController::user_row($auth['uid']);
        throttle('post:' . $auth['uid'], 30, 3600);
        $content = clean_str($body['content'] ?? '', 2000);
        if ($content === '') {
            throw new ApiError('Contenu requis', 400);
        }
        $id = uid('post');
        db()->prepare('INSERT INTO community_posts (id, user_id, content, activity_json) VALUES (?,?,?,?)')
            ->execute([$id, $auth['uid'], $content, is_array($body['activitySummary'] ?? null) ? mb_substr(json_encode($body['activitySummary']), 0, 4000) : null]);
        $st = db()->prepare('SELECT * FROM community_posts WHERE id = ?');
        $st->execute([$id]);
        json_out(self::post_payload($st->fetch(), $auth['uid']), 201);
    }

    public static function toggleLike(string $postId): void
    {
        $auth = require_auth();
        $db = db();
        $post = self::find_post($postId);
        $st = $db->prepare('SELECT post_id FROM post_likes WHERE post_id = ? AND user_id = ?');
        $st->execute([$postId, $auth['uid']]);
        if ($st->fetch()) {
            $db->prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?')->execute([$postId, $auth['uid']]);
            $db->prepare('UPDATE community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?')->execute([$postId]);
        } else {
            $db->prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?,?)')->execute([$postId, $auth['uid']]);
            $db->prepare('UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?')->execute([$postId]);
        }
        json_out(self::post_payload(self::find_post($postId), $auth['uid']));
    }

    public static function addComment(string $postId, array $body): void
    {
        $auth = require_auth();
        $user = AuthController::user_row($auth['uid']);
        throttle('comment:' . $auth['uid'], 60, 3600);
        $text = clean_str($body['text'] ?? '', 1000);
        if ($text === '') {
            throw new ApiError('Commentaire vide', 400);
        }
        self::find_post($postId);
        $id = uid('c');
        db()->prepare('INSERT INTO post_comments (id, post_id, user_id, text) VALUES (?,?,?,?)')
            ->execute([$id, $postId, $auth['uid'], $text]);
        json_out(self::post_payload(self::find_post($postId), $auth['uid']), 201);
    }

    /* ----------------------------- helpers ---------------------------- */

    private static function find_post(string $id): array
    {
        $st = db()->prepare('SELECT * FROM community_posts WHERE id = ?');
        $st->execute([$id]);
        $p = $st->fetch();
        if (!$p) {
            throw new ApiError('Publication introuvable', 404);
        }
        return $p;
    }

    private static function post_payload(array $p, string $currentUserId): array
    {
        $author = db()->prepare('SELECT first_name, last_name, avatar_url FROM users WHERE id = ?');
        $author->execute([$p['user_id']]);
        $a = $author->fetch() ?: ['first_name' => 'Utilisateur', 'last_name' => '', 'avatar_url' => null];

        $comments = db()->prepare('SELECT c.*, u.first_name, u.last_name, u.avatar_url FROM post_comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.created_at');
        $comments->execute([$p['id']]);
        $commentRows = array_map(function ($r) {
            return [
                'id' => $r['id'], 'postId' => $r['post_id'], 'userId' => $r['user_id'],
                'userName' => trim($r['first_name'] . ' ' . $r['last_name']), 'avatarUrl' => $r['avatar_url'],
                'text' => $r['text'], 'createdAt' => date('c', strtotime($r['created_at'])),
            ];
        }, $comments->fetchAll());

        $liked = db()->prepare('SELECT post_id FROM post_likes WHERE post_id = ? AND user_id = ?');
        $liked->execute([$p['id'], $currentUserId]);

        return [
            'id' => $p['id'],
            'userId' => $p['user_id'],
            'userName' => trim($a['first_name'] . ' ' . $a['last_name']),
            'avatarUrl' => $a['avatar_url'],
            'content' => $p['content'],
            'createdAt' => date('c', strtotime($p['created_at'])),
            'likes' => (int) $p['likes_count'],
            'likedByMe' => (bool) $liked->fetch(),
            'comments' => $commentRows,
            'activitySummary' => $p['activity_json'] ? json_decode($p['activity_json'], true) : null,
        ];
    }
}

function challenge_payload(array $c): array
{
    return [
        'id' => $c['id'],
        'title' => $c['title'],
        'emoji' => $c['emoji'],
        'description' => $c['description'],
        'metric' => $c['metric'],
        'target' => (int) $c['target'],
        'unit' => $c['unit'],
        'days' => (int) $c['days'],
        'participants' => (int) $c['participants'],
        'startsAt' => date('c', strtotime($c['starts_at'])),
        'endsAt' => date('c', strtotime($c['ends_at'])),
        'badgeId' => $c['badge_code'],
    ];
}