<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

use FitLife\Controllers\{
    ActivityController,
    AdminController,
    AiController,
    AnnouncementController,
    AuthController,
    CoachChatController,
    PromoController,
    EventController,
    LiveController,
    MenuController,
    NotificationController,
    PaymentController,
    NutritionController,
    ProfileController,
    ProgramController,
    ProgressController,
    SocialController,
    SubscriptionController,
    SuperAdminController,
};

// CORS : CORS_ORIGINS (liste séparée par des virgules) limite les sites autorisés ; sinon tous
// (l'API utilise un jeton Bearer, jamais de cookie : pas de risque CSRF).
$allowed = array_filter(array_map('trim', explode(',', (string) (getenv('CORS_ORIGINS') ?: ''))));
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if (!$allowed) {
    header('Access-Control-Allow-Origin: *');
} elseif (in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
// En-têtes de sécurité
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(self), camera=(self), microphone=(self)');
if (($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Refresh expired subscriptions opportunistically
SubscriptionController::expiry();

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
$path = preg_replace('#^/api#', '', $path);
$path = '/' . trim($path, '/');

try {
    if (str_contains($_SERVER['REQUEST_URI'], '/api') === false) {
        // Serve real files (assets) as-is; then fall back to the built SPA index.html if configured.
        $file = __DIR__ . $path;
        if ($path !== '/' && is_file($file)) {
            return false;
        }
        $spaIndex = getenv('FRONTEND_INDEX') ?: '';
        if ($spaIndex !== '' && is_file($spaIndex)) {
            header('Content-Type: text/html; charset=utf-8');
            readfile($spaIndex);
            exit;
        }
        json_out(['message' => 'FitLife API. Base path: /api'], 200);
    }

    match (true) {
        $method === 'POST' && $path === '/auth/register' => AuthController::register(input()),
        $method === 'POST' && $path === '/auth/login' => AuthController::login(input()),
        $method === 'POST' && $path === '/auth/logout' => AuthController::logout(),

        $method === 'GET' && $path === '/profile' => ProfileController::get(),
        $method === 'PUT' && $path === '/profile' => ProfileController::update(input()),
        $method === 'DELETE' && $path === '/profile' => ProfileController::deleteAccount(),
        $method === 'PUT' && $path === '/profile/password' => ProfileController::changePassword(input()),
        $method === 'POST' && $path === '/profile/avatar' => ProfileController::uploadAvatar(),
        $method === 'DELETE' && $path === '/profile/avatar' => ProfileController::removeAvatar(),
        $method === 'GET' && $path === '/profile/preferences' => ProfileController::getPreferences(),
        $method === 'PUT' && $path === '/profile/preferences' => ProfileController::savePreferences(input()),

        $method === 'GET' && $path === '/program' => ProgramController::get(),
        $method === 'POST' && $path === '/workouts/complete' => ProgramController::completeWorkout(input()),

        $method === 'GET' && $path === '/nutrition' => NutritionController::getPlan(),
        $method === 'GET' && $path === '/meals' => NutritionController::getMealLogs(),
        $method === 'POST' && $path === '/meals' => NutritionController::logMeal(input()),
        $method === 'DELETE' && preg_match('#^/meals/([^/]+)$#', $path, $m) === 1 => NutritionController::removeMealLog($m[1]),

        $method === 'GET' && $path === '/shopping-list' => NutritionController::getShoppingList(),
        $method === 'POST' && $path === '/shopping-list' => NutritionController::addShoppingItem(input()),
        $method === 'PATCH' && preg_match('#^/shopping-list/([^/]+)$#', $path, $m) === 1 => NutritionController::toggleShoppingItem($m[1]),
        $method === 'POST' && $path === '/shopping-list/regenerate' => NutritionController::regenerateShoppingList(),

        $method === 'GET' && $path === '/water' => NutritionController::getWater(),
        $method === 'POST' && $path === '/water' => NutritionController::addWater(input()),

        $method === 'POST' && $path === '/activity/start' => ActivityController::start(input()),
        $method === 'PATCH' && preg_match('#^/activity/([^/]+)$#', $path, $m) === 1 => ActivityController::update($m[1], input()),
        $method === 'POST' && preg_match('#^/activity/([^/]+)/finish$#', $path, $m) === 1 => ActivityController::finish($m[1]),
        $method === 'DELETE' && preg_match('#^/activity/([^/]+)$#', $path, $m) === 1 => ActivityController::cancel($m[1]),
        $method === 'GET' && $path === '/activity' => ActivityController::list(),
        $method === 'GET' && $path === '/activity/active' => ActivityController::active(),
        $method === 'GET' && $path === '/steps' => ActivityController::getSteps(),
        $method === 'POST' && $path === '/steps' => ActivityController::setSteps(input()),

        $method === 'GET' && preg_match('#^/leaderboard/([^/]+)$#', $path, $m) === 1 => SocialController::leaderboard($m[1]),

        $method === 'GET' && $path === '/challenges' => SocialController::challenges(),
        $method === 'GET' && $path === '/challenges/participations' => SocialController::participations(),
        $method === 'POST' && preg_match('#^/challenges/([^/]+)/join$#', $path, $m) === 1 => SocialController::joinChallenge($m[1]),
        $method === 'DELETE' && preg_match('#^/challenges/([^/]+)/join$#', $path, $m) === 1 => SocialController::leaveChallenge($m[1]),

        $method === 'GET' && $path === '/badges' => SocialController::badges(),
        $method === 'GET' && $path === '/badges/earned' => SocialController::earnedBadges(),

        $method === 'GET' && $path === '/community/posts' => SocialController::feed(),
        $method === 'POST' && $path === '/community/posts' => SocialController::createPost(input()),
        $method === 'POST' && preg_match('#^/community/posts/([^/]+)/like$#', $path, $m) === 1 => SocialController::toggleLike($m[1]),
        $method === 'POST' && preg_match('#^/community/posts/([^/]+)/comments$#', $path, $m) === 1 => SocialController::addComment($m[1], input()),

        $method === 'GET' && $path === '/lives' => LiveController::list(),
        $method === 'POST' && $path === '/lives' => LiveController::create(input()),
        $method === 'GET' && preg_match('#^/lives/([^/]+)$#', $path, $m) === 1 => LiveController::get($m[1]),
        $method === 'GET' && preg_match('#^/lives/([^/]+)/messages$#', $path, $m) === 1 => LiveController::messages($m[1]),
        $method === 'POST' && preg_match('#^/lives/([^/]+)/messages$#', $path, $m) === 1 => LiveController::sendMessage($m[1], input()),
        $method === 'PATCH' && preg_match('#^/lives/([^/]+)/status$#', $path, $m) === 1 => LiveController::setStatus($m[1], input()),
        $method === 'PUT' && preg_match('#^/lives/([^/]+)/broadcast$#', $path, $m) === 1 => LiveController::broadcast($m[1], input()),
        $method === 'GET' && preg_match('#^/lives/([^/]+)/signals$#', $path, $m) === 1 => LiveController::signals($m[1]),
        $method === 'POST' && preg_match('#^/lives/([^/]+)/signals$#', $path, $m) === 1 => LiveController::sendSignal($m[1], input()),
        $method === 'PATCH' && preg_match('#^/lives/([^/]+)$#', $path, $m) === 1 => LiveController::update($m[1], input()),
        $method === 'DELETE' && preg_match('#^/lives/([^/]+)$#', $path, $m) === 1 => LiveController::delete($m[1]),

        $method === 'GET' && $path === '/events' => EventController::list(),
        $method === 'POST' && $path === '/events' => EventController::create(input()),
        $method === 'PATCH' && preg_match('#^/events/([^/]+)$#', $path, $m) === 1 => EventController::update($m[1], input()),
        $method === 'DELETE' && preg_match('#^/events/([^/]+)$#', $path, $m) === 1 => EventController::delete($m[1]),
        $method === 'POST' && preg_match('#^/events/([^/]+)/attend$#', $path, $m) === 1 => EventController::toggleAttendance($m[1]),

        $method === 'GET' && $path === '/announcements' => AnnouncementController::list(),
        $method === 'POST' && $path === '/announcements' => AnnouncementController::create(input()),
        $method === 'PATCH' && preg_match('#^/announcements/([^/]+)$#', $path, $m) === 1 => AnnouncementController::update($m[1], input()),
        $method === 'DELETE' && preg_match('#^/announcements/([^/]+)$#', $path, $m) === 1 => AnnouncementController::delete($m[1]),

        $method === 'GET' && $path === '/ai/conversation' => AiController::conversation(),
        $method === 'POST' && $path === '/ai/messages' => AiController::send(input()),

        $method === 'GET' && $path === '/subscription/plans' => SubscriptionController::plans(),
        $method === 'GET' && $path === '/subscription' => SubscriptionController::get(),
        $method === 'POST' && $path === '/subscription' => SubscriptionController::subscribe(input()),
        $method === 'DELETE' && $path === '/subscription' => SubscriptionController::cancel(),
        $method === 'POST' && $path === '/subscription/resume' => SubscriptionController::resume(),

        $method === 'POST' && $path === '/payments/webhook' => PaymentController::webhook(),
        $method === 'POST' && $path === '/payments' => PaymentController::start(input()),
        $method === 'GET' && $path === '/payments' => PaymentController::list(),
        $method === 'GET' && preg_match('#^/payments/([^/]+)$#', $path, $m) === 1 => PaymentController::get($m[1]),

        $method === 'POST' && $path === '/promo/redeem' => PromoController::redeem(input()),
        $method === 'GET' && $path === '/promo-codes' => PromoController::list(),
        $method === 'POST' && $path === '/promo-codes' => PromoController::create(input()),
        $method === 'PATCH' && preg_match('#^/promo-codes/([A-Za-z0-9-]+)$#', $path, $m) === 1 => PromoController::update(strtoupper($m[1]), input()),
        $method === 'DELETE' && preg_match('#^/promo-codes/([A-Za-z0-9-]+)$#', $path, $m) === 1 => PromoController::delete(strtoupper($m[1])),

        $method === 'GET' && $path === '/coach/messages' => CoachChatController::myThread(),
        $method === 'POST' && $path === '/coach/messages' => CoachChatController::send(input()),
        $method === 'GET' && $path === '/coach/unread' => CoachChatController::unread(),
        $method === 'GET' && $path === '/coach/inbox' => CoachChatController::inbox(),
        $method === 'GET' && preg_match('#^/coach/inbox/([^/]+)$#', $path, $m) === 1 => CoachChatController::thread($m[1]),
        $method === 'POST' && preg_match('#^/coach/inbox/([^/]+)$#', $path, $m) === 1 => CoachChatController::reply($m[1], input()),

        $method === 'GET' && $path === '/menu' => MenuController::list(),
        $method === 'POST' && $path === '/menu' => MenuController::create(input()),
        $method === 'PATCH' && preg_match('#^/menu/([^/]+)$#', $path, $m) === 1 => MenuController::update($m[1], input()),
        $method === 'DELETE' && preg_match('#^/menu/([^/]+)$#', $path, $m) === 1 => MenuController::delete($m[1]),

        $method === 'GET' && $path === '/notifications' => NotificationController::list(),
        $method === 'PATCH' && preg_match('#^/notifications/([^/]+)/read$#', $path, $m) === 1 => NotificationController::markRead($m[1]),
        $method === 'PATCH' && $path === '/notifications/read-all' => NotificationController::markAllRead(),

        $method === 'GET' && $path === '/progress' => ProgressController::get(),
        $method === 'POST' && $path === '/progress/weight' => ProgressController::addWeight(input()),

        $method === 'GET' && $path === '/admin/stats' => AdminController::stats(),
        $method === 'GET' && $path === '/admin/users' => AdminController::users(),
        $method === 'GET' && $path === '/admin/activities/pending' => AdminController::pendingActivities(),
        $method === 'PATCH' && preg_match('#^/admin/activities/([^/]+)/review$#', $path, $m) === 1 => AdminController::reviewActivity($m[1], input()),

        $method === 'GET' && $path === '/superadmin/users' => SuperAdminController::users(),
        $method === 'PATCH' && preg_match('#^/superadmin/users/([^/]+)/role$#', $path, $m) === 1 => SuperAdminController::setRole($m[1], input()),
        $method === 'PATCH' && preg_match('#^/superadmin/users/([^/]+)/premium$#', $path, $m) === 1 => SuperAdminController::setPremium($m[1], input()),
        $method === 'DELETE' && preg_match('#^/superadmin/users/([^/]+)$#', $path, $m) === 1 => SuperAdminController::delete($m[1]),

        default => throw new ApiError('Route introuvable', 404),
    };
} catch (ApiError $e) {
    error_out($e->getMessage(), $e->status);
} catch (Throwable $e) {
    error_log((string) $e);
    error_out('Erreur serveur', 500);
}