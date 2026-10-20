<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;

/** Menu du jour : publié par les coachs / admins, consulté par les membres. */
class MenuController
{
    private const MEALS = ['breakfast', 'lunch', 'snack', 'dinner'];

    public static function list(): void
    {
        require_auth();
        $from = self::date($_GET['from'] ?? date('Y-m-d'));
        $to = self::date($_GET['to'] ?? $from);
        $st = db()->prepare(
            "SELECT * FROM menu_items WHERE date BETWEEN ? AND ?
             ORDER BY date, FIELD(meal_type, 'breakfast', 'lunch', 'snack', 'dinner'), updated_at"
        );
        $st->execute([$from, $to]);
        json_out(array_map([self::class, 'payload'], $st->fetchAll()));
    }

    public static function create(array $body): void
    {
        $auth = require_staff();
        $author = AuthController::user_row($auth['uid']);
        $d = self::validate($body, true);
        $id = uid('menu');
        db()->prepare(
            'INSERT INTO menu_items (id, date, meal_type, name, description, calories, protein, carbs, fat, image_url, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $id, $d['date'], $d['meal_type'], $d['name'], $d['description'], $d['calories'], $d['protein'],
            $d['carbs'], $d['fat'], $d['image_url'], trim($author['first_name'] . ' ' . $author['last_name']),
        ]);
        json_out(self::find($id), 201);
    }

    public static function update(string $id, array $body): void
    {
        require_staff();
        self::find($id);
        $d = self::validate($body, false);
        if ($d) {
            $sets = implode(', ', array_map(fn ($k) => "$k = ?", array_keys($d)));
            db()->prepare("UPDATE menu_items SET $sets WHERE id = ?")->execute([...array_values($d), $id]);
        }
        json_out(self::find($id));
    }

    public static function delete(string $id): void
    {
        require_staff();
        db()->prepare('DELETE FROM menu_items WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    private static function date(string $v): string
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            throw new ApiError('Date invalide (format AAAA-MM-JJ)', 400);
        }
        return $v;
    }

    private static function validate(array $b, bool $full): array
    {
        $out = [];
        if ($full || array_key_exists('date', $b)) {
            $out['date'] = self::date((string) ($b['date'] ?? ''));
        }
        if ($full || array_key_exists('mealType', $b)) {
            $out['meal_type'] = in_array($b['mealType'] ?? '', self::MEALS, true) ? $b['mealType'] : 'lunch';
        }
        if ($full || array_key_exists('name', $b)) {
            $name = trim((string) ($b['name'] ?? ''));
            if ($name === '') {
                throw new ApiError('Le nom de l’aliment est obligatoire', 400);
            }
            $out['name'] = mb_substr($name, 0, 160);
        }
        if ($full || array_key_exists('description', $b)) {
            $out['description'] = trim((string) ($b['description'] ?? ''));
        }
        foreach (['calories', 'protein', 'carbs', 'fat'] as $k) {
            if ($full || array_key_exists($k, $b)) {
                $out[$k] = max(0, min(9999, (int) ($b[$k] ?? 0)));
            }
        }
        if ($full || array_key_exists('imageUrl', $b)) {
            $url = trim((string) ($b['imageUrl'] ?? ''));
            $out['image_url'] = safe_url($url, 'Image');
        }
        return $out;
    }

    private static function find(string $id): array
    {
        $st = db()->prepare('SELECT * FROM menu_items WHERE id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        if (!$row) {
            throw new ApiError('Aliment introuvable', 404);
        }
        return self::payload($row);
    }

    private static function payload(array $m): array
    {
        return [
            'id' => $m['id'],
            'date' => $m['date'],
            'mealType' => $m['meal_type'],
            'name' => $m['name'],
            'description' => $m['description'],
            'calories' => (int) $m['calories'],
            'protein' => (int) $m['protein'],
            'carbs' => (int) $m['carbs'],
            'fat' => (int) $m['fat'],
            'imageUrl' => $m['image_url'],
            'createdBy' => $m['created_by'],
            'updatedAt' => date('c', strtotime($m['updated_at'])),
        ];
    }
}
