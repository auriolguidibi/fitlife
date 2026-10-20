<?php

declare(strict_types=1);

/* ------------------------------------------------------------------ *
 *  Data libraries + generation logic (ported from the frontend mock) *
 * ------------------------------------------------------------------ */

const EXERCISE_LIBRARY = [
    ['ex_squat', 'Squat', 'Descends en pliant les genoux et les hanches, dos droit, puis remonte en poussant sur les talons.', ['Quadriceps', 'Fessiers', 'Mollets'], ['none'], 'lower'],
    ['ex_pushup', 'Pompes', 'En position de planche, descends la poitrine vers le sol puis repousse.', ['Pectoraux', 'Triceps', 'Épaules'], ['none'], 'upper'],
    ['ex_lunge', 'Fentes', 'Avance une jambe, descends le genou arrière vers le sol, puis remonte.', ['Quadriceps', 'Fessiers', 'Ischio-jambiers'], ['none'], 'lower'],
    ['ex_plank', 'Gainage (Planche)', 'Maintiens le corps aligné sur les avant-bras et les orteils.', ['Abdominaux', 'Lombaires', 'Épaules'], ['mat'], 'core'],
    ['ex_crunch', 'Crunchs', 'Allongé, monte les épaules vers les genoux en contractant les abdominaux.', ['Grand droit', 'Obliques'], ['mat'], 'core'],
    ['ex_burpee', 'Burpees', 'Enchaîne squat, planche, pompe et saut vertical.', ['Full body', 'Cardio'], ['none'], 'full'],
    ['ex_jumping_jack', 'Jumping Jacks', 'Saute en écartant les jambes et en levant les bras au-dessus de la tête.', ['Cardio', 'Mollets', 'Épaules'], ['none'], 'cardio'],
    ['ex_mountain_climber', 'Mountain Climbers', 'En planche, ramène alternativement les genoux vers la poitrine.', ['Abdominaux', 'Cardio', 'Épaules'], ['none'], 'core'],
    ['ex_dumbbell_row', 'Rowing haltère', 'Penché, tire l’haltère vers la hanche en serrant l’omoplate.', ['Dos', 'Biceps'], ['dumbbells'], 'upper'],
    ['ex_shoulder_press', 'Développé épaules', 'Pousse les haltères au-dessus de la tête puis redescends.', ['Épaules', 'Triceps'], ['dumbbells'], 'upper'],
    ['ex_glute_bridge', 'Pont fessier', 'Allongé, pousse les hanches vers le haut en serrant les fessiers.', ['Fessiers', 'Ischio-jambiers'], ['mat'], 'lower'],
    ['ex_band_squat', 'Squat élastique', 'Squat avec élastique au-dessus des genoux.', ['Fessiers', 'Quadriceps'], ['bands'], 'lower'],
    ['ex_band_pull', 'Tirage élastique', 'Tire l’élastique vers la poitrine en serrant les omoplates.', ['Dos', 'Biceps'], ['bands'], 'upper'],
    ['ex_machine_press', 'Presse à cuisses', 'Pousse la plateforme avec les jambes puis contrôle la descente.', ['Quadriceps', 'Fessiers'], ['machine'], 'lower'],
    ['ex_lat_pulldown', 'Tirage vertical', 'Tire la barre vers la poitrine en contractant le dos.', ['Dos', 'Biceps'], ['machine'], 'upper'],
    ['ex_stretch', 'Étirements guidés', 'Enchaînement d’étirements doux pour la récupération.', ['Full body'], ['mat'], 'mobility'],
    ['ex_high_knees', 'Montées de genoux', 'Course sur place en montant les genoux haut.', ['Cardio', 'Quadriceps'], ['none'], 'cardio'],
    ['ex_russian_twist', 'Russian Twist', 'Assis, effectue une rotation du buste de gauche à droite.', ['Obliques', 'Abdominaux'], ['mat'], 'core'],
];

const MEAL_LIBRARY = [
    ['m_omelette', 'Omelette + légumes + fruit', 'breakfast', '', 380, 24, 30, 18, ['Œufs', 'Tomates', 'Oignons', 'Poivron', 'Banane'], 'low'],
    ['m_bouillie', 'Bouillie de mil + arachides', 'breakfast', '', 340, 12, 52, 9, ['Mil', 'Lait', 'Arachides', 'Sucre'], 'low'],
    ['m_pain_avocat', 'Pain complet + avocat + œuf', 'breakfast', '', 410, 16, 42, 20, ['Pain complet', 'Avocat', 'Œuf', 'Citron'], 'medium'],
    ['m_riz_poisson', 'Riz + poisson + légumes', 'lunch', '', 620, 38, 68, 16, ['Riz', 'Poisson', 'Carottes', 'Haricots verts', 'Huile'], 'medium'],
    ['m_poulet_attieke', 'Attiéké + poulet + sauce tomate', 'lunch', '', 680, 42, 74, 18, ['Attiéké', 'Poulet', 'Tomates', 'Oignons', 'Épices'], 'medium'],
    ['m_riz_haricot', 'Riz + haricots + plantain', 'lunch', '', 590, 22, 92, 12, ['Riz', 'Haricots', 'Plantain', 'Huile de palme'], 'low'],
    ['m_patate_oeufs', 'Patate douce + œufs + légumes', 'dinner', '', 470, 24, 58, 14, ['Patate douce', 'Œufs', 'Épinards', 'Oignons'], 'low'],
    ['m_poisson_grille', 'Poisson grillé + légumes sautés', 'dinner', '', 430, 40, 24, 18, ['Poisson', 'Courgettes', 'Poivron', 'Ail', 'Citron'], 'medium'],
    ['m_soupe_légumes', 'Soupe de légumes + poulet', 'dinner', '', 360, 28, 34, 10, ['Poulet', 'Carottes', 'Pommes de terre', 'Céleri'], 'low'],
    ['m_banane_arachide', 'Banane + arachides', 'snack', '', 260, 8, 34, 12, ['Banane', 'Arachides'], 'low'],
    ['m_yaourt_fruit', 'Yaourt + fruits', 'snack', '', 180, 10, 26, 4, ['Yaourt', 'Mangue', 'Papaye'], 'low'],
    ['m_oeufs_mayo', 'Œufs durs + pain', 'snack', '', 230, 14, 20, 10, ['Œufs', 'Pain', 'Sel', 'Poivre'], 'low'],
];

/* ------------------------------- payloads ------------------------------ */

function user_payload(array $u): array
{
    return [
        'id' => $u['id'],
        'firstName' => $u['first_name'],
        'lastName' => $u['last_name'],
        'email' => $u['email'],
        'phone' => $u['phone'],
        'birthDate' => $u['birth_date'],
        'sex' => $u['sex'],
        'height' => (int) $u['height_cm'],
        'weight' => (float) $u['weight_kg'],
        'avatarUrl' => $u['avatar_url'] ?? null,
        'role' => $u['role'],
        'isPremium' => (bool) $u['is_premium'],
        'premiumPlan' => $u['premium_plan'],
        'createdAt' => date('c', strtotime($u['created_at'])),
    ];
}

function prefs_payload(array $p): array
{
    return [
        'goal' => $p['goal'],
        'level' => $p['level'],
        'daysPerWeek' => (int) $p['days_per_week'],
        'sessionMinutes' => (int) $p['session_minutes'],
        'equipment' => json_decode($p['equipment'], true) ?? [],
        'favoriteFoods' => json_decode($p['favorite_foods'], true) ?? [],
        'avoidedFoods' => json_decode($p['avoided_foods'], true) ?? [],
        'allergies' => json_decode($p['allergies'], true) ?? [],
        'dietRestrictions' => json_decode($p['diet_restrictions'], true) ?? [],
        'budget' => $p['budget'],
        'mealsPerDay' => (int) $p['meals_per_day'],
        'onboarded' => (bool) $p['onboarded'],
        'waterGoal' => (int) $p['water_goal_ml'],
        'stepGoal' => (int) $p['step_goal'],
        'bio' => $p['bio'],
        'city' => $p['city'],
    ];
}

/* --------------------------- program generation ------------------------ */

function workout_types_for(string $goal): array
{
    if ($goal === 'muscle_gain') return ['upper_body', 'lower', 'core', 'full_body', 'upper_body'];
    if ($goal === 'endurance') return ['cardio', 'full_body', 'cardio', 'lower', 'cardio'];
    if ($goal === 'weight_loss') return ['full_body', 'cardio', 'core', 'full_body', 'lower'];
    return ['full_body', 'lower', 'core', 'full_body', 'upper_body'];
}

function pick_exercises(int $count, array $equipment, ?string $bodyPart): array
{
    $available = array_values(array_filter(EXERCISE_LIBRARY, function ($e) use ($equipment) {
        if (in_array('gym', $equipment, true)) return true;
        foreach ((array_slice($e, 4, 1)[0] ?? []) as $req) {
            if ($req !== 'none' && !in_array($req, $equipment, true)) return false;
        }
        return true;
    }));
    $pool = $bodyPart ? array_values(array_filter($available, fn ($e) => $e[5] === $bodyPart)) : $available;
    if (!$pool) $pool = $available;
    if (!$pool) return [];
    shuffle($pool);
    $result = [];
    for ($i = 0; $i < $count && $pool; $i++) {
        $result[] = $pool[$i % count($pool)];
    }
    return $result;
}

function make_workout(string $id, int $week, int $slot, string $type, string $goal, string $level, int $minutes, array $equipment): array
{
    $bodyPartMap = [
        'legs' => 'lower',
        'abs' => 'core',
        'lower' => 'lower',
        'core' => 'core',
        'upper_body' => 'upper',
        'mobility' => 'mobility',
    ];
    $bodyPart = $bodyPartMap[$type] ?? ($type === 'cardio' ? 'cardio' : null);
    $count = $minutes <= 15 ? 4 : ($minutes <= 30 ? 5 : 6);
    $templates = pick_exercises($count, $equipment, $bodyPart);
    $repsFactor = $level === 'beginner' ? 0.8 : ($level === 'advanced' ? 1.25 : 1);
    $caloriesPerMin = ['full_body' => 7.5, 'cardio' => 9, 'core' => 6, 'upper_body' => 6.5][$type] ?? 7;

    $exercises = [];
    foreach ($templates as $i => $t) {
        [$eid, $name, $desc, $muscles] = $t;
        $sets = (int) ceil(($type === 'cardio' ? 4 : 3) * $repsFactor);
        $baseReps = $type === 'cardio' ? 20 : 12;
        $reps = (int) round($baseReps * $repsFactor);
        $duration = $t[0] === 'ex_plank' ? 40 : ($t[0] === 'ex_high_knees' ? 30 : ($t[0] === 'ex_stretch' ? 180 : null));
        $exercises[] = [
            'id' => "{$id}_e{$i}",
            'name' => $name,
            'description' => $desc,
            'muscles' => $muscles,
            'sets' => $sets,
            'reps' => $duration ? 1 : $reps,
            'restSeconds' => $duration ? 45 : 60,
            'durationSeconds' => $duration,
            'tips' => ['Garde le rythme et contrôle le mouvement.', 'Respire régulièrement, qualité avant quantité.'],
        ];
    }

    $names = ['Séance du jour', 'Full Body', 'Cardio', 'Renforcement', 'Upper Body', 'Gainage & Abs', 'Récupération'];
    $label = $names[$slot % count($names)] . (in_array($type, ['upper_body', 'lower', 'core', 'legs'], true) ? ' — ' . ucfirst($type) : '');

    return [
        'id' => $id,
        'name' => $label,
        'type' => $type === 'lower' || $type === 'core' ? 'full_body' : (in_array($type, ['upper_body', 'abs'], true) ? 'upper_body' : $type),
        'duration' => $minutes,
        'difficulty' => $level,
        'equipment' => $equipment,
        'calories' => (int) round($minutes * $caloriesPerMin * $repsFactor),
        'exercises' => $exercises,
        'completed' => false,
    ];
}

/**
 * Préférences au format interne des générateurs (clés snake_case, listes décodées),
 * qu'on leur passe la ligne SQL brute ou la version API (prefs_payload, camelCase).
 */
function prefs_internal(array $p): array
{
    if (array_key_exists('daysPerWeek', $p)) {
        return [
            'goal' => $p['goal'], 'level' => $p['level'],
            'days_per_week' => max(1, (int) $p['daysPerWeek']), 'session_minutes' => max(10, (int) $p['sessionMinutes']),
            'equipment' => (array) $p['equipment'], 'favorite_foods' => (array) $p['favoriteFoods'],
            'avoided_foods' => (array) $p['avoidedFoods'], 'allergies' => (array) $p['allergies'],
            'diet_restrictions' => (array) $p['dietRestrictions'], 'budget' => $p['budget'],
            'meals_per_day' => max(2, (int) $p['mealsPerDay']), 'water_goal_ml' => (int) $p['waterGoal'],
        ];
    }
    foreach (['equipment', 'favorite_foods', 'avoided_foods', 'allergies', 'diet_restrictions'] as $k) {
        if (isset($p[$k]) && is_string($p[$k])) {
            $p[$k] = json_decode($p[$k], true) ?? [];
        }
    }
    $p['days_per_week'] = max(1, (int) ($p['days_per_week'] ?? 3));
    $p['session_minutes'] = max(10, (int) ($p['session_minutes'] ?? 30));
    return $p;
}

function generate_program(array $user, array $prefs): array
{
    $prefs = prefs_internal($prefs);
    $types = workout_types_for($prefs['goal']);
    $weeks = [];
    $totalWorkouts = 8 * (int) $prefs['days_per_week'];
    for ($w = 1; $w <= 8; $w++) {
        $workouts = [];
        for ($d = 0; $d < (int) $prefs['days_per_week']; $d++) {
            $type = $types[($d + $w) % count($types)];
            $workouts[] = make_workout("w{$w}_{$d}", $w, $d, $type, $prefs['goal'], $prefs['level'], (int) $prefs['session_minutes'], $prefs['equipment']);
        }
        $weeks[] = ['week' => $w, 'workouts' => $workouts];
    }
    $logs = completed_workout_ids($user['id']);
    foreach ($weeks as &$week) {
        foreach ($week['workouts'] as &$wo) {
            if (in_array($wo['id'], $logs, true)) $wo['completed'] = true;
        }
    }
    unset($week, $wo);
    $done = count($logs);
    $currentWeek = min(8, (int) floor($done / max(1, (int) $prefs['days_per_week'])) + 1);

    return [
        'id' => 'program_' . $user['id'],
        'userId' => $user['id'],
        'goal' => $prefs['goal'],
        'durationWeeks' => 8,
        'currentWeek' => $currentWeek,
        'progress' => min(100, (int) round(($done / $totalWorkouts) * 100)),
        'daysPerWeek' => (int) $prefs['days_per_week'],
        'createdAt' => $user['created_at'],
        'weeks' => $weeks,
    ];
}

function completed_workout_ids(string $userId): array
{
    $rows = db()->prepare('SELECT workout_id FROM workout_logs WHERE user_id = ?');
    $rows->execute([$userId]);
    return array_map(fn ($r) => $r['workout_id'], $rows->fetchAll());
}

/* -------------------------- nutrition generation ----------------------- */

function generate_nutrition_plan(array $user, array $prefs): array
{
    $prefs = prefs_internal($prefs);
    $age = max(14, (int) floor((time() - strtotime($user['birth_date'])) / 31536000));
    $bmr = 10 * (float) $user['weight_kg'] + 6.25 * (int) $user['height_cm'] - 5 * $age + ($user['sex'] === 'male' ? 5 : -161);
    $factor = $prefs['level'] === 'beginner' ? 1.35 : ($prefs['level'] === 'advanced' ? 1.6 : 1.47);
    $kcal = (int) round($bmr * $factor);
    $kcal += $prefs['goal'] === 'weight_loss' ? -400 : ($prefs['goal'] === 'muscle_gain' ? 250 : 0);

    $proteinG = (float) $user['weight_kg'] * ($prefs['goal'] === 'muscle_gain' ? 2.0 : ($prefs['goal'] === 'weight_loss' ? 1.8 : 1.5));
    $fatG = (int) round($kcal * 0.25 / 9);
    $carbsG = (int) round(($kcal - $proteinG * 4 - $fatG * 9) / 4);

    $week = [];
    $types = ['breakfast', 'lunch', 'dinner'];
    if ((int) $prefs['meals_per_day'] >= 4) $types[] = 'snack';
    for ($d = 0; $d < 7; $d++) {
        $meals = [];
        foreach ($types as $j => $type) {
            $pool = array_values(array_filter(MEAL_LIBRARY, fn ($m) => $m[2] === $type && !($prefs['budget'] === 'low' && $m[9] === 'high')));
            if (!$pool) $pool = array_values(array_filter(MEAL_LIBRARY, fn ($m) => $m[2] === $type));
            $meal = $pool[($d + $j * 2) % count($pool)];
            $meals[] = [
                'id' => $meal[0] . "_d{$d}",
                'name' => $meal[1],
                'type' => $meal[2],
                'emoji' => $meal[3],
                'calories' => $meal[4],
                'macros' => ['protein' => (float) $meal[5], 'carbs' => (float) $meal[6], 'fat' => (float) $meal[7]],
                'ingredients' => $meal[8],
            ];
        }
        $week[] = ['day' => date('Y-m-d', strtotime("+{$d} days")), 'meals' => $meals];
    }

    return [
        'id' => 'nutrition_' . $user['id'],
        'userId' => $user['id'],
        'goal' => $prefs['goal'],
        'dailyCalories' => $kcal,
        'targetMacros' => ['protein' => (int) round($proteinG), 'carbs' => $carbsG, 'fat' => $fatG],
        'week' => $week,
        'hydrationTarget' => (int) $prefs['water_goal_ml'],
    ];
}

function build_shopping_list(array $plan): array
{
    $categories = [
        'Riz' => 'Féculents', 'Attiéké' => 'Féculents', 'Mil' => 'Féculents', 'Pain complet' => 'Féculents',
        'Patate douce' => 'Féculents', 'Plantain' => 'Féculents', 'Pommes de terre' => 'Féculents',
        'Poisson' => 'Protéines', 'Poulet' => 'Protéines', 'Œufs' => 'Protéines', 'Œuf' => 'Protéines',
        'Yaourt' => 'Produits laitiers', 'Lait' => 'Produits laitiers',
        'Avocat' => 'Légumes & fruits', 'Tomates' => 'Légumes & fruits', 'Tomate' => 'Légumes & fruits',
        'Oignons' => 'Légumes & fruits', 'Poivron' => 'Légumes & fruits', 'Carottes' => 'Légumes & fruits',
        'Haricots verts' => 'Légumes & fruits', 'Haricots' => 'Légumes & fruits', 'Épinards' => 'Légumes & fruits',
        'Courgettes' => 'Légumes & fruits', 'Ail' => 'Légumes & fruits', 'Céleri' => 'Légumes & fruits',
        'Banane' => 'Légumes & fruits', 'Mangue' => 'Légumes & fruits', 'Papaye' => 'Légumes & fruits', 'Citron' => 'Légumes & fruits',
        'Arachides' => 'Produits secs', 'Huile' => 'Épicerie', 'Huile de palme' => 'Épicerie', 'Épices' => 'Épicerie',
        'Sucre' => 'Épicerie', 'Sel' => 'Épicerie', 'Poivre' => 'Épicerie',
    ];
    $quantities = ['Riz' => '1 kg', 'Attiéké' => '1,5 kg', 'Mil' => '1 kg', 'Pain complet' => '1 pain', 'Patate douce' => '1 kg', 'Plantain' => '4 pièces', 'Pommes de terre' => '1 kg', 'Poisson' => '500 g', 'Poulet' => '800 g', 'Œufs' => '12 pièces', 'Œuf' => '6 pièces', 'Yaourt' => '6 pots', 'Lait' => '1 L', 'Avocat' => '3 pièces', 'Tomates' => '1 kg', 'Tomate' => '500 g', 'Oignons' => '1 kg', 'Poivron' => '3 pièces', 'Carottes' => '1 kg', 'Haricots verts' => '500 g', 'Haricots' => '800 g', 'Épinards' => '500 g', 'Courgettes' => '500 g', 'Ail' => '3 têtes', 'Céleri' => '1 botte', 'Banane' => '1 grappe', 'Mangue' => '3 pièces', 'Papaye' => '1 pièce', 'Citron' => '4 pièces', 'Arachides' => '500 g', 'Huile' => '1 L', 'Huile de palme' => '500 ml', 'Épices' => '1 boîte', 'Sucre' => '500 g', 'Sel' => '1 paquet', 'Poivre' => '1 boîte'];

    $items = [];
    foreach ($plan['week'] as $day) {
        foreach ($day['meals'] as $meal) {
            foreach ($meal['ingredients'] as $ing) {
                $name = trim($ing);
                if (!isset($items[$name])) {
                    $items[$name] = [
                        'id' => uid('shop'),
                        'name' => $name,
                        'quantity' => $quantities[$name] ?? '1 portion',
                        'category' => $categories[$name] ?? 'Courses',
                        'checked' => false,
                    ];
                }
            }
        }
    }
    $order = ['Légumes & fruits', 'Protéines', 'Féculents', 'Produits laitiers', 'Produits secs', 'Épicerie', 'Courses'];
    usort($items, function ($a, $b) use ($order) {
        return (array_search($a['category'], $order, true) <=> array_search($b['category'], $order, true));
    });
    return array_values($items);
}

/* ------------------------------ AI reply ------------------------------- */

function ai_reply(string $input, array $user, array $prefs): string
{
    $t = strtolower($input);
    $firstName = $user['first_name'];
    if (preg_match('/(20|15|30) min|peu de temps|court/', $t)) {
        $program = generate_program($user, $prefs);
        $w = $program['weeks'][$program['currentWeek'] - 1]['workouts'][0] ?? null;
        $lines = $w ? array_map(fn ($e, $i) => ($i + 1) . '. ' . $e['name'] . ' — ' . $e['sets'] . '×' . ($e['reps'] > 1 ? $e['reps'] : $e['durationSeconds'] . 's'), array_slice($w['exercises'], 0, 4), array_keys(array_slice($w['exercises'], 0, 4))) : [];
        return "Pas de souci {$firstName} ! Voici une séance express de 20 minutes tirée de ton programme :\n\n" . implode("\n", $lines) . "\n\nÉchauffement 3 min, puis enchaîne les exercices avec 30 s de repos. Tu vas y arriver";
    }
    if (preg_match('/repas|manger|recette|idée/', $t)) {
        return "Voici une idée de repas équilibrée : poulet grillé + riz complet + légumes sautés (≈ 550 kcal, 40 g de protéines).\n\nPense à bien t’hydrater pendant le repas. Retrouve ton menu complet dans l’onglet Alimentation";
    }
    if (preg_match('/motiv|décourag|flemme|pas envie/', $t)) {
        return "Je comprends {$firstName}, les jours sans motivation arrivent à tout le monde. Commence par 10 minutes : le plus dur, c’est de démarrer. Tu ne le regretteras jamais";
    }
    if (preg_match('/squat|pompe|exercice|comment/', $t)) {
        return "Explication courte : garde le dos droit, le gainage actif et contrôle la descente. Qualité avant quantité ! Je te conseille de suivre l’exercice dans ta séance du jour.";
    }
    if (preg_match('/prog|gère|eau|hydrat/', $t)) {
        $today = date('Y-m-d');
        $st = db()->prepare('SELECT ml FROM water_log WHERE user_id = ? AND date = ?');
        $st->execute([$user['id'], $today]);
        $ml = (float) ($st->fetchColumn() ?: 0);
        return "Ton objectif d’hydratation est de 2,5 L par jour. Aujourd’hui tu es à " . number_format($ml / 1000, 1) . " L. Pense à boire un verre d’eau régulièrement";
    }
    return "Je suis ton Coach IA FitLife ! Je peux t’aider à adapter une séance, proposer une idée de repas, te motiver ou t’expliquer un exercice. Dis-m’en un peu plus\n\nRappel : je ne remplace pas un médecin ou un nutritionniste.";
}