<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false,'error'=>'Method Not Allowed']); exit; }

function load_env(string $path): array {
    if (!file_exists($path)) return [];
    $env = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (!str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $env[trim($key)] = trim(trim($val), '"\'');
    }
    return $env;
}

$env    = load_env(__DIR__ . '/../.env');
$secret = $env['APP_TOKEN_SECRET'] ?? '';
if ($secret === '') { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'APP_TOKEN_SECRET no configurado.']); exit; }

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$login    = strtolower(trim($body['login'] ?? ''));
$password = $body['password'] ?? '';
if ($login === '' || $password === '') { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'login y password requeridos.']); exit; }

// Cargar usuarios APP_USER_1..20
$matched = null;
for ($i = 1; $i <= 20; $i++) {
    $raw = $env["APP_USER_{$i}"] ?? '';
    if ($raw === '') continue;
    $parts = explode('|', $raw, 3);
    if (count($parts) < 2) continue;
    $uLogin = strtolower(trim($parts[0]));
    $uPass  = trim($parts[1]);
    $uRole  = trim($parts[2] ?? 'viewer');
    if ($uLogin === $login && hash_equals($uPass, $password)) {
        $matched = ['login' => $uLogin, 'role' => $uRole];
        break;
    }
}

if (!$matched) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Credenciales inválidas.']); exit; }

$header  = base64_encode(json_encode(['alg'=>'HS256','typ'=>'JWT']));
$payload = base64_encode(json_encode(['login'=>$matched['login'],'role'=>$matched['role'],'exp'=>time()+86400*30]));
$sig     = hash_hmac('sha256', "{$header}.{$payload}", $secret, true);
$token   = "{$header}.{$payload}." . base64_encode($sig);

echo json_encode(['ok'=>true,'token'=>$token,'login'=>$matched['login'],'role'=>$matched['role']]);
