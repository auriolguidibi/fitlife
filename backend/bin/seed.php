<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/config.php';

echo "FitLife DB seeder — DB_NAME=" . DB_NAME . "\n";

$pdo = db();

// 1) Apply schema
$schema = file_get_contents(dirname(__DIR__, 2) . '/database/schema.sql');
if (!$schema) {
    fwrite(STDERR, "schema.sql introuvable\n");
    exit(1);
}
foreach (array_filter(explode(';', $schema)) as $stmt) {
    // Retire les lignes de commentaire au lieu d'ignorer tout le bloc qui les suit.
    $stmt = trim(preg_replace('/^\s*--.*$/m', '', $stmt));
    // La connexion cible déjà DB_NAME (imposée par l'hébergeur) : on ignore CREATE DATABASE / USE.
    if (preg_match('/^(CREATE\s+DATABASE|USE)\b/i', $stmt)) {
        continue;
    }
    if ($stmt !== '') {
        $pdo->exec($stmt);
    }
}
$pdo->exec('SET FOREIGN_KEY_CHECKS=0');

function truncate_all(PDO $pdo): void
{
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $t) {
        $pdo->exec("DELETE FROM `$t`");
    }
}
truncate_all($pdo);

// 2) Static catalogs
$badges = [
    ['b_first_step', 'Premier pas', '', 'Parcours ton premier kilomètre.', '1 km', 'bronze'],
    ['b_5km', 'Lance-toi', '', 'Atteins 5 km cumulés.', '5 km', 'bronze'],
    ['b_25km', 'Marcheur régulier', '', 'Atteins 25 km cumulés.', '25 km', 'silver'],
    ['b_10km_5d', 'Machine', '', '10 km pendant 5 jours consécutifs.', '10 km x 5 jours', 'gold'],
    ['b_champion', 'Champion du mois', '', 'Termine 1er du classement mensuel.', 'Top 1 mensuel', 'platinum'],
    ['b_100km', 'Objectif 100 km', '', 'Parcours 100 km dans le mois.', '100 km / mois', 'platinum'],
    ['b_20_sessions', 'Assidu', '', 'Complète 20 séances d’entraînement.', '20 séances', 'silver'],
    ['b_30_days', '30 jours de feu', '', 'Termine le défi 30 jours.', 'Défi 30 jours', 'gold'],
];
$ins = $pdo->prepare('INSERT INTO badges (code, name, emoji, description, requirement, tier) VALUES (?,?,?,?,?,?)');
foreach ($badges as $b) {
    $ins->execute($b);
}

$challenges = [
    ['ch_5km', 'Défi 5 km', '', 'Parcours 5 km en une semaine.', 'distance', 5, 'km', 7, 0, '-2 days', '5 days', 'b_5km'],
    ['ch_10000_steps', 'Défi 10 000 pas', '', 'Fais 10 000 pas en une journée.', 'steps', 10000, 'pas', 1, 0, 'today', '+1 days', 'b_first_step'],
    ['ch_100km', 'Défi 100 km', '', 'Parcours 100 km dans le mois.', 'distance', 100, 'km', 30, 0, '-10 days', '+20 days', 'b_100km'],
    ['ch_30_days', 'Défi 30 jours', '', 'Bouge chaque jour pendant 30 jours.', 'days', 30, 'jours', 30, 0, '-5 days', '+25 days', 'b_30_days'],
    ['ch_20_sessions', 'Défi 20 séances', '', 'Complète 20 séances d’entraînement.', 'sessions', 20, 'séances', 30, 0, '-8 days', '+22 days', 'b_20_sessions'],
];
$ins = $pdo->prepare('INSERT INTO challenges (id, title, emoji, description, metric, target, unit, days, participants, starts_at, ends_at, badge_code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
foreach ($challenges as $c) {
    [$id, $title, $emoji, $desc, $metric, $target, $unit, $days, $parts, $start, $end, $badge] = $c;
    $ins->execute([$id, $title, $emoji, $desc, $metric, $target, $unit, $days, $parts, date('Y-m-d H:i:s', strtotime($start)), date('Y-m-d H:i:s', strtotime($end)), $badge]);
}

$plans = [
    ['essential', 'Essentiel', 6500, 65000, ['Programme personnalisé', 'Suivi complet des séances', 'Programme alimentaire de base', 'Podomètre & suivi d’activité', 'Classements et défis', 'Historique des 30 derniers jours'], 0],
    ['premium', 'Premium', 4000, 40000, ['Tout l’Essentiel, plus :', 'Programme alimentaire avancé & liste de courses', 'Lives exclusifs avec les coachs', 'Messagerie avec un vrai coach FitLife', 'Défis & classements Premium', 'Statistiques avancées et historique illimité', 'Badges exclusifs'], 1],
];
$ins = $pdo->prepare('INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, features, highlighted) VALUES (?,?,?,?,?,?)');
foreach ($plans as $p) {
    $ins->execute([$p[0], $p[1], $p[2], $p[3], json_encode($p[4], JSON_UNESCAPED_UNICODE), $p[5]]);
}

// Mots de passe des comptes : variables SEED_*_PASSWORD (fichier .env). En production, jamais de
// mot de passe par défaut : à défaut de variable, un mot de passe aléatoire est généré et affiché une fois.
$GLOBALS['seed_credentials'] = [];
function seed_pw(string $key, string $devDefault): string
{
    $pw = env($key) ?? (APP_ENV === 'production' ? rtrim(strtr(base64_encode(random_bytes(12)), '+/', 'Ab'), '=') : $devDefault);
    $GLOBALS['seed_credentials'][$key] = $pw;
    return $pw;
}

// 3) Comptes de l'équipe et compte membre de test (sans historique inventé)
function insert_user(PDO $pdo, string $id, string $first, string $last, string $email, string $password, string $birth, string $sex, int $height, float $weight, string $role, int $premium, ?string $plan, int $createdDaysAgo): void
{
    $pdo->prepare('INSERT INTO users (id, first_name, last_name, email, phone, password_hash, birth_date, sex, height_cm, weight_kg, role, is_premium, premium_plan, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([$id, $first, $last, $email, '+225 07 00 00 00', password_hash($password, PASSWORD_DEFAULT), $birth, $sex, $height, $weight, $role, $premium, $plan, date('Y-m-d H:i:s', time() - $createdDaysAgo * 86400)]);
}

insert_user($pdo, 'u_charly', 'Charly', 'Diallo', 'demo@fitlife.app', seed_pw('SEED_DEMO_PASSWORD', 'fitlife'), '1993-05-14', 'male', 180, 78, 'user', 0, null, 0);
insert_user($pdo, 'u_admin', 'Admin', 'FitLife', 'admin@fitlife.app', seed_pw('SEED_ADMIN_PASSWORD', 'admin'), '1990-01-01', 'male', 180, 80, 'admin', 1, 'premium', 200);
insert_user($pdo, 'u_superadmin', 'Super', 'Admin', env('SEED_SUPERADMIN_EMAIL') ?? 'superadmin@fitlife.app', seed_pw('SEED_SUPERADMIN_PASSWORD', 'superadmin'), '1987-06-15', 'male', 178, 76, 'superadmin', 1, 'premium', 400);
insert_user($pdo, 'u_coach', 'Coach', 'Awa', 'coach@fitlife.app', seed_pw('SEED_COACH_PASSWORD', 'coach'), '1988-03-01', 'female', 168, 62, 'coach', 1, 'premium', 300);

$demoPrefs = [
    'u_charly' => ['weight_loss', 'intermediate', 4, 30, '["none","dumbbells","mat"]', '["Poulet","Riz","Banane"]', 'medium', 4],
    'u_admin' => ['fitness', 'advanced', 5, 45, '["gym"]', '[]', 'high', 4],
    'u_coach' => ['wellness', 'advanced', 7, 60, '["gym"]', '[]', 'high', 4],
];
foreach ($demoPrefs as $uid => $p) {
    $pdo->prepare('INSERT INTO user_preferences (user_id, goal, level, days_per_week, session_minutes, equipment, favorite_foods, avoided_foods, allergies, diet_restrictions, budget, meals_per_day, onboarded) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)')
        ->execute([$uid, $p[0], $p[1], $p[2], $p[3], $p[4], $p[5], '[]', '[]', '[]', $p[6], $p[7]]);
}

// Aucune donnée fictive : activités, lives, événements, annonces, menus et publications
// sont créés par les vrais membres, coachs et administrateurs.

$pdo->exec('SET FOREIGN_KEY_CHECKS=1');
echo "Schema + seeds appliqués.\n";
echo "  Comptes : demo@fitlife.app · admin@fitlife.app · " . (env('SEED_SUPERADMIN_EMAIL') ?? 'superadmin@fitlife.app') . " · coach@fitlife.app\n";
foreach ($GLOBALS['seed_credentials'] as $k => $v) {
    echo "  $k = " . (env($k) ? '(défini dans .env)' : $v) . "\n";
}