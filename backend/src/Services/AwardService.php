<?php

declare(strict_types=1);

namespace FitLife\Services;

class AwardService
{
    /** Award any newly earned badges + refresh challenge progress for a user. */
    public static function award(string $userId, array $user, array $prefs): void
    {
        self::refreshChallengeProgress($userId);
        $badges = self::all();
        $earnedSt = db()->prepare('SELECT badge_code FROM user_badges WHERE user_id = ?');
        $earnedSt->execute([$userId]);
        $earned = array_column($earnedSt->fetchAll(), 'badge_code');

        $db = db();
        $ins = $db->prepare('INSERT IGNORE INTO user_badges (user_id, badge_code) VALUES (?,?)');
        foreach ($badges as $b) {
            if (in_array($b['code'], $earned, true)) {
                continue;
            }
            if (self::badge_milestone($b['code'], $userId)) {
                $ins->execute([$userId, $b['code']]);
                $notif = $db->prepare('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?,?,?,?,?)');
                $notif->execute([uid('notif'), $userId, 'badge', "Nouveau badge : {$b['name']}", "Bravo {$user['first_name']}, tu as débloqué « {$b['name']} » !"]);
            }
        }
    }

    /** Recompute progress for all challenges the user joined. */
    public static function refreshChallengeProgress(string $userId): void
    {
        $db = db();
        $st = $db->prepare(
            'SELECT c.* FROM challenges c JOIN challenge_participations p ON p.challenge_id = c.id WHERE p.user_id = ?'
        );
        $st->execute([$userId]);
        $upsert = $db->prepare(
            'UPDATE challenge_participations SET progress = ?, completed = ? WHERE challenge_id = ? AND user_id = ?'
        );
        foreach ($st->fetchAll() as $c) {
            $progress = self::challenge_progress($c, $userId);
            $upsert->execute([$progress, $progress >= (int) $c['target'] ? 1 : 0, $c['id'], $userId]);
        }
    }

    public static function challenge_progress(array $challenge, string $userId): float
    {
        $metric = $challenge['metric'];
        $cutoff = date('Y-m-d H:i:s', $challenge['days'] == 1 ? strtotime('today') : strtotime('-' . $challenge['days'] . ' days'));
        if ($metric === 'distance') {
            $st = db()->prepare(
                "SELECT COALESCE(SUM(distance_km),0) FROM activities WHERE user_id = ? AND review_status = 'validated' AND status = 'finished' AND started_at >= ?"
            );
            $st->execute([$userId, $cutoff]);
            return round_f((float) $st->fetchColumn(), 2);
        }
        if ($metric === 'steps') {
            $st = db()->prepare('SELECT COALESCE(SUM(steps),0) FROM steps_log WHERE user_id = ? AND date >= ?');
            $st->execute([$userId, date('Y-m-d', strtotime('-' . ($challenge['days'] - 1) . ' days'))]);
            return (float) $st->fetchColumn();
        }
        if ($metric === 'sessions') {
            $st = db()->prepare('SELECT COUNT(*) FROM workout_logs WHERE user_id = ?');
            $st->execute([$userId]);
            return (float) $st->fetchColumn();
        }
        if ($metric === 'days') {
            $st = db()->prepare("SELECT COUNT(DISTINCT DATE(started_at)) FROM activities WHERE user_id = ? AND review_status = 'validated' AND status = 'finished'");
            $st->execute([$userId]);
            $st2 = db()->prepare('SELECT COUNT(DISTINCT date) FROM workout_logs WHERE user_id = ?');
            $st2->execute([$userId]);
            return round((float) $st->fetchColumn() + (float) $st2->fetchColumn(), 2);
        }
        return 0;
    }

    public static function all(): array
    {
        return db()->query('SELECT * FROM badges ORDER BY code')->fetchAll();
    }

    private static function badge_milestone(string $code, string $userId): bool
    {
        $total = (float) db()->query(
            "SELECT COALESCE(SUM(distance_km),0) FROM activities WHERE user_id = " . db()->quote($userId) . " AND review_status = 'validated'"
        )->fetchColumn();
        switch ($code) {
            case 'b_first_step':
                return $total >= 1;
            case 'b_5km':
                return $total >= 5;
            case 'b_25km':
                return $total >= 25;
            case 'b_100km':
                $st = db()->prepare("SELECT COALESCE(SUM(distance_km),0) FROM activities WHERE user_id = ? AND review_status = 'validated' AND started_at >= ?");
                $st->execute([$userId, date('Y-m-01')]);
                return (float) $st->fetchColumn() >= 100;
            case 'b_20_sessions':
                $st = db()->prepare('SELECT COUNT(*) FROM workout_logs WHERE user_id = ?');
                $st->execute([$userId]);
                return (int) $st->fetchColumn() >= 20;
            case 'b_30_days':
                $st = db()->prepare('SELECT COUNT(*) FROM challenge_participations WHERE user_id = ? AND challenge_id = ? AND completed = 1');
                $st->execute([$userId, 'ch_30_days']);
                return (int) $st->fetchColumn() > 0;
            case 'b_10km_5d':
                return self::five_day_streak($userId);
            case 'b_champion':
                return self::is_monthly_champion($userId);
            default:
                return false;
        }
    }

    private static function five_day_streak(string $userId): bool
    {
        $st = db()->prepare("SELECT DATE(started_at) AS d, SUM(distance_km) AS km FROM activities WHERE user_id = ? AND review_status = 'validated' GROUP BY DATE(started_at) ORDER BY d DESC");
        $st->execute([$userId]);
        $days = [];
        foreach ($st->fetchAll() as $r) {
            if ((float) $r['km'] < 10) continue;
            $days[] = $r['d'];
        }
        $count = 0;
        for ($i = 0; $i < count($days); $i++) {
            if ($i > 0 && strtotime($days[$i - 1]) - strtotime($days[$i]) === 86400) {
                $count++;
                if ($count >= 4) return true;
            } else {
                $count = 0;
            }
        }
        return false;
    }

    private static function is_monthly_champion(string $userId): bool
    {
        $cutoff = date('Y-m-01');
        $st = db()->prepare(
            "SELECT COALESCE(SUM(distance_km),0) AS km FROM activities WHERE user_id = ? AND review_status = 'validated' AND started_at >= ?"
        );
        $st->execute([$userId, $cutoff]);
        $mine = (float) $st->fetchColumn();
        if ($mine <= 0) return false;
        $best = db()->query("SELECT COALESCE(SUM(distance_km),0) AS km FROM activities WHERE review_status = 'validated' AND started_at >= '$cutoff' GROUP BY user_id ORDER BY km DESC LIMIT 1")->fetchColumn();
        return $mine >= (float) $best;
    }
}