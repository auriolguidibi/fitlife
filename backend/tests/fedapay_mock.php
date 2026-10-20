<?php
// Faux serveur FedaPay pour les tests automatiques (aucun appel réel, aucun argent).
// Réponses au format de l'API v1 : objets enveloppés dans « v1/transaction ».
$store = sys_get_temp_dir() . '/fedapay_mock.json';
$db = is_file($store) ? json_decode(file_get_contents($store), true) : ['next' => 1000, 'tx' => []];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
header('Content-Type: application/json');
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!str_starts_with($path, '/__') && $auth !== 'Bearer sk_sandbox_ci_test') {
    http_response_code(401);
    echo json_encode(['message' => 'Clé invalide']);
    exit;
}
$save = function () use (&$db, $store) {
    file_put_contents($store, json_encode($db));
};
if ($method === 'POST' && $path === '/v1/transactions') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    if (($body['currency']['iso'] ?? '') !== 'XOF' || empty($body['customer']['email']) || !is_int($body['amount'] ?? null)) {
        http_response_code(422);
        echo json_encode(['message' => 'Requête invalide']);
        exit;
    }
    $id = $db['next']++;
    $db['tx'][$id] = ['id' => $id, 'status' => 'pending', 'amount' => $body['amount'], 'currency' => ['iso' => 'XOF'], 'description' => $body['description'] ?? ''];
    $save();
    echo json_encode(['v1/transaction' => $db['tx'][$id]]);
    exit;
}
if ($method === 'POST' && preg_match('#^/v1/transactions/(\d+)/token$#', $path, $m)) {
    echo json_encode(['token' => 'tok_' . $m[1], 'url' => 'https://process.fedapay.com/tok_' . $m[1]]);
    exit;
}
if ($method === 'GET' && preg_match('#^/v1/transactions/(\d+)$#', $path, $m) && isset($db['tx'][$m[1]])) {
    echo json_encode(['v1/transaction' => $db['tx'][$m[1]]]);
    exit;
}
// Pilotage du test : /__set/{id}/{status}[/{amount}]
if (preg_match('#^/__set/(\d+)/(\w+)(?:/(\d+))?$#', $path, $m) && isset($db['tx'][$m[1]])) {
    $db['tx'][$m[1]]['status'] = $m[2];
    if (!empty($m[3])) {
        $db['tx'][$m[1]]['amount'] = (int) $m[3];
    }
    $save();
    echo json_encode(['ok' => true]);
    exit;
}
http_response_code(404);
echo json_encode(['message' => 'Introuvable']);
