<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;

class NutritionController
{
    public static function getPlan(): void
    {
        $auth = require_auth();
        $user = AuthController::user_row($auth['uid']);
        json_out(generate_nutrition_plan($user, prefs_payload(AuthController::prefs_row($user['id']))));
    }

    public static function getMealLogs(): void
    {
        $auth = require_auth();
        $date = (string) ($_GET['date'] ?? date('Y-m-d'));
        $st = db()->prepare('SELECT * FROM meal_logs WHERE user_id = ? AND date = ? ORDER BY date, id');
        $st->execute([$auth['uid'], $date]);
        json_out(array_map(fn ($m) => [
            'id' => $m['id'],
            'date' => $m['date'],
            'mealId' => $m['meal_id'],
            'name' => $m['name'],
            'type' => $m['type'],
            'calories' => (int) $m['calories'],
            'macros' => ['protein' => (float) $m['protein'], 'carbs' => (float) $m['carbs'], 'fat' => (float) $m['fat']],
        ], $st->fetchAll()));
    }

    public static function logMeal(array $body): void
    {
        $auth = require_auth();
        $id = uid('log');
        $date = (string) ($body['date'] ?? date('Y-m-d'));
        $type = in_array($body['type'] ?? '', ['breakfast', 'lunch', 'snack', 'dinner'], true) ? $body['type'] : 'lunch';
        $macros = $body['macros'] ?? [];
        $name = (string) ($body['name'] ?? 'Repas');
        $db = db();
        $db->prepare(
            'INSERT INTO meal_logs (id, user_id, meal_id, date, name, type, calories, protein, carbs, fat) VALUES (?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $id, $auth['uid'], $body['mealId'] ?? null, $date, $name, $type,
            (int) ($body['calories'] ?? 0), (float) ($macros['protein'] ?? 0),
            (float) ($macros['carbs'] ?? 0), (float) ($macros['fat'] ?? 0),
        ]);
        json_out([
            'id' => $id, 'date' => $date, 'mealId' => $body['mealId'] ?? null, 'name' => $name,
            'type' => $type, 'calories' => (int) ($body['calories'] ?? 0),
            'macros' => ['protein' => (float) ($macros['protein'] ?? 0), 'carbs' => (float) ($macros['carbs'] ?? 0), 'fat' => (float) ($macros['fat'] ?? 0)],
        ], 201);
    }

    public static function removeMealLog(string $id): void
    {
        $auth = require_auth();
        $db = db();
        $st = $db->prepare('DELETE FROM meal_logs WHERE id = ? AND user_id = ?');
        $st->execute([$id, $auth['uid']]);
        json_out(['ok' => true]);
    }

    public static function getShoppingList(): void
    {
        $auth = require_auth();
        $rows = shopping_rows($auth['uid']);
        if ($rows) {
            json_out($rows);
            return;
        }
        self::regenerateShoppingList();
    }

    public static function regenerateShoppingList(): void
    {
        $auth = require_auth();
        $user = AuthController::user_row($auth['uid']);
        // clear old items then persist
        $db = db();
        $db->prepare('DELETE FROM shopping_items WHERE user_id = ?')->execute([$auth['uid']]);
        $plan = generate_nutrition_plan($user, prefs_payload(AuthController::prefs_row($user['id'])));
        $items = build_shopping_list($plan);
        $ins = $db->prepare('INSERT INTO shopping_items (id, user_id, name, quantity, category) VALUES (?,?,?,?,?)');
        foreach ($items as $i) {
            if ($i['category'] === 'Courses') continue; // skip 'Ajouté' style extras on regen
            $ins->execute([$i['id'], $auth['uid'], $i['name'], $i['quantity'], $i['category']]);
        }
        json_out(shopping_rows($auth['uid']));
    }

    public static function toggleShoppingItem(string $id): void
    {
        $auth = require_auth();
        $db = db();
        $st = $db->prepare('SELECT checked FROM shopping_items WHERE id = ? AND user_id = ?');
        $st->execute([$id, $auth['uid']]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Article introuvable', 404);
        }
        $db->prepare('UPDATE shopping_items SET checked = ? WHERE id = ? AND user_id = ?')
            ->execute([$row['checked'] ? 0 : 1, $id, $auth['uid']]);
        json_out(shopping_rows($auth['uid']));
    }

    public static function addShoppingItem(array $body): void
    {
        $auth = require_auth();
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            throw new ApiError('Nom requis', 400);
        }
        $db = db();
        $db->prepare('INSERT INTO shopping_items (id, user_id, name, quantity, category) VALUES (?,?,?,?,?)')
            ->execute([uid('shop'), $auth['uid'], $name, (string) ($body['quantity'] ?? '1'), 'Ajouté']);
        json_out(shopping_rows($auth['uid']), 201);
    }

    public static function getWater(): void
    {
        $auth = require_auth();
        $date = (string) ($_GET['date'] ?? date('Y-m-d'));
        $st = db()->prepare('SELECT ml FROM water_log WHERE user_id = ? AND date = ?');
        $st->execute([$auth['uid'], $date]);
        json_out(['date' => $date, 'ml' => (int) $st->fetchColumn() ?: 0]);
    }

    public static function addWater(array $body): void
    {
        $auth = require_auth();
        $date = date('Y-m-d');
        // Positif : un verre ajouté ; négatif : un verre retiré (bouton « − »). Le total reste ≥ 0.
        $ml = max(-2000, min(2000, (int) ($body['ml'] ?? 0)));
        $db = db();
        $st = $db->prepare('SELECT ml FROM water_log WHERE user_id = ? AND date = ?');
        $st->execute([$auth['uid'], $date]);
        $current = (int) $st->fetchColumn() ?: 0;
        $total = max(0, $current + $ml);
        $db->prepare('INSERT INTO water_log (user_id, date, ml) VALUES (?,?,?) ON DUPLICATE KEY UPDATE ml = ?')
            ->execute([$auth['uid'], $date, $total, $total]);
        json_out(['date' => $date, 'ml' => $total], 201);
    }
}

function shopping_rows(string $userId): array
{
    $st = db()->prepare('SELECT * FROM shopping_items WHERE user_id = ? ORDER BY checked, category, name');
    $st->execute([$userId]);
    return array_map(fn ($r) => [
        'id' => $r['id'],
        'name' => $r['name'],
        'quantity' => $r['quantity'],
        'category' => $r['category'],
        'checked' => (bool) $r['checked'],
    ], $st->fetchAll());
}