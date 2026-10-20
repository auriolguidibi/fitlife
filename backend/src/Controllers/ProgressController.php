<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;

class ProgressController
{
    public static function get(): void
    {
        $auth = require_auth();
        $user = AuthController::user_row($auth['uid']);
        $range = (string) ($_GET['range'] ?? '30d');
        if (!in_array($range, ['7d', '30d', '3m', '6m', '1y'], true)) {
            throw new ApiError('Période invalide', 400);
        }
        json_out(self::summary($auth['uid'], $user, $range));
    }

    public static function addWeight(array $body): void
    {
        $auth = require_auth();
        $value = (float) ($body['value'] ?? 0);
        if ($value <= 0 || $value > 300) {
            throw new ApiError('Poids invalide', 400);
        }
        $db = db();
        $db->prepare('INSERT INTO weights (id, user_id, date, value) VALUES (?,?,?,?)')
            ->execute([uid('w'), $auth['uid'], date('Y-m-d'), $value]);
        $db->prepare('UPDATE users SET weight_kg = ? WHERE id = ?')->execute([$value, $auth['uid']]);
        $user = AuthController::user_row($auth['uid']);
        json_out(self::summary($auth['uid'], $user, '6m'), 201);
    }

    private static function summary(string $userId, array $user, string $range): array
    {
        $days = ['7d' => 7, '30d' => 30, '3m' => 90, '6m' => 180, '1y' => 365][$range];
        $cutoff = date('Y-m-d', strtotime("-$days days"));

        $points = [];
        for ($i = $days; $i >= 0; $i--) {
            $day = date('Y-m-d', strtotime("-$i days"));
            $points[$day] = ['date' => $day];
        }

        $wSt = db()->prepare("SELECT date, value FROM weights WHERE user_id = ? AND date >= ? ORDER BY date");
        $wSt->execute([$userId, $cutoff]);
        foreach ($wSt->fetchAll() as $w) {
            $points[$w['date']]['weight'] = (float) $w['value'];
        }

        $aSt = db()->prepare("SELECT DATE(started_at) AS d, SUM(distance_km) AS km, SUM(calories) AS kcal, COUNT(*) AS n FROM activities WHERE user_id = ? AND review_status = 'validated' AND started_at >= ? GROUP BY DATE(started_at)");
        $aSt->execute([$userId, $cutoff]);
        foreach ($aSt->fetchAll() as $a) {
            if (isset($points[$a['d']])) {
                $points[$a['d']]['distanceKm'] = round_f((float) $a['km'], 1);
                $points[$a['d']]['calories'] = (int) $a['kcal'];
                $points[$a['d']]['sessions'] = (int) $a['n'];
            }
        }

        $lSt = db()->prepare("SELECT date, COUNT(*) AS n FROM workout_logs WHERE user_id = ? AND date >= ? GROUP BY date");
        $lSt->execute([$userId, $cutoff]);
        foreach ($lSt->fetchAll() as $l) {
            if (isset($points[$l['date']])) {
                $points[$l['date']]['sessions'] = ($points[$l['date']]['sessions'] ?? 0) + (int) $l['n'];
            }
        }

        $sSt = db()->prepare("SELECT date, steps FROM steps_log WHERE user_id = ? AND date >= ?");
        $sSt->execute([$userId, $cutoff]);
        foreach ($sSt->fetchAll() as $s) {
            if (isset($points[$s['date']])) {
                $points[$s['date']]['steps'] = (int) $s['steps'];
            }
        }

        $waterSt = db()->prepare("SELECT date, ml FROM water_log WHERE user_id = ? AND date >= ?");
        $waterSt->execute([$userId, $cutoff]);
        foreach ($waterSt->fetchAll() as $ww) {
            if (isset($points[$ww['date']])) {
                $points[$ww['date']]['waterMl'] = (int) $ww['ml'];
            }
        }

        $out = array_values($points);
        $weights = array_values(array_filter(array_map(fn ($p) => $p['weight'] ?? null, $out), fn ($v) => $v !== null));

        $totals = db()->prepare("SELECT COALESCE(SUM(distance_km),0) AS km FROM activities WHERE user_id = ? AND review_status = 'validated' AND started_at >= ?");
        $totals->execute([$userId, $cutoff]);
        $totalKm = round_f((float) $totals->fetchColumn(), 1);

        $sessionsSt = db()->prepare('SELECT COUNT(*) FROM workout_logs WHERE user_id = ?');
        $sessionsSt->execute([$userId]);

        $steps = 0;
        $stepsAll = db()->prepare('SELECT COALESCE(SUM(steps),0) FROM steps_log WHERE user_id = ? AND date >= ?');
        $stepsAll->execute([$userId, $cutoff]);
        $steps = (int) $stepsAll->fetchColumn();

        $avgWater = 0;
        $waterAll = db()->prepare("SELECT AVG(ml) FROM water_log WHERE user_id = ? AND date >= ?");
        $waterAll->execute([$userId, $cutoff]);
        $avg = $waterAll->fetchColumn();
        $avgWater = $avg ? (int) round((float) $avg) : 0;

        return [
            'range' => $range,
            'points' => $out,
            'weightStart' => $weights ? $weights[0] : (isset($user['weight_kg']) ? (float) $user['weight_kg'] : 0),
            'weightEnd' => $weights ? $weights[count($weights) - 1] : (isset($user['weight_kg']) ? (float) $user['weight_kg'] : 0),
            'totalDistanceKm' => $totalKm,
            'totalSessions' => (int) $sessionsSt->fetchColumn(),
            'avgWaterMl' => $avgWater,
            'totalSteps' => $steps,
        ];
    }
}