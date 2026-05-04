<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

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
if ($secret === '') { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'No configurado.']); exit; }

$token = '';
$auth  = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (str_starts_with($auth, 'Bearer ')) $token = substr($auth, 7);
if (!$token) {
    $body  = json_decode(file_get_contents('php://input'), true) ?? [];
    $token = $body['token'] ?? '';
}
if (!$token) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Token requerido.']); exit; }

$parts = explode('.', $token);
if (count($parts) !== 3) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Token inválido.']); exit; }

[$header, $payload, $sig] = $parts;
$expected = base64_encode(hash_hmac('sha256', "{$header}.{$payload}", $secret, true));
if (!hash_equals($expected, $sig)) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Firma inválida.']); exit; }

$data = json_decode(base64_decode($payload), true) ?? [];
if (($data['exp'] ?? 0) < time()) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Token expirado.']); exit; }

echo json_encode(['ok'=>true,'login'=>$data['login'],'role'=>$data['role'],'exp'=>$data['exp']]);
