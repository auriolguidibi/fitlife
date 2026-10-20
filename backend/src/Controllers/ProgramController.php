<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use FitLife\Services\AwardService;

class ProgramController
{
    public static function get(): void
    {
        $auth = require_auth();
        $user = AuthController::user_row($auth['uid']);
        json_out(generate_program($user, prefs_payload(AuthController::prefs_row($user['id']))));
    }

    public static function completeWorkout(array $body): void
    {
        $auth = require_auth();
        $id = $auth['uid'];
        $user = AuthController::user_row($id);
        $prefs = prefs_payload(AuthController::prefs_row($id));

        $workoutId = (string) ($body['workoutId'] ?? '');
        $name = (string) ($body['name'] ?? 'Séance');
        $type = (string) ($body['type'] ?? 'full_body');
        $minutes = (int) ($body['minutes'] ?? 0);
        $calories = (int) ($body['calories'] ?? 0);

        $db = db();
        $exists = $db->prepare('SELECT workout_id FROM workout_logs WHERE user_id = ? AND workout_id = ?');
        $exists->execute([$id, $workoutId]);
        if (!$exists->fetch()) {
            $db->prepare(
                'INSERT INTO workout_logs (id, user_id, workout_id, date, name, type, minutes, calories) VALUES (?,?,?,?,?,?,?,?)'
            )->execute([uid('wl'), $id, $workoutId, date('Y-m-d'), $name, $type, $minutes, $calories]);
        }

        AwardService::award($id, $user, $prefs);
        json_out(generate_program($user, $prefs));
    }
}