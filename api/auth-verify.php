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

// base64url decode (RFC 7515) — simétrico al encode en auth.php
function jwt_base64url_decode(string $data): string {
    $pad  = strlen($data) % 4;
    if ($pad) $data .= str_repeat('=', 4 - $pad);
    return (string)base64_decode(strtr($data, '-_', '+/'), strict: true);
}

$env    = load_env(__DIR__ . '/../.env');
$secret = $env['APP_TOKEN_SECRET'] ?? '';
if ($secret === '') { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'No configurado.']); exit; }

// Extraer token de Authorization: Bearer … o body.token
$token = '';
$auth  = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (str_starts_with($auth, 'Bearer ')) $token = substr($auth, 7);
if (!$token) {
    $body  = json_decode((string)file_get_contents('php://input'), true) ?? [];
    $token = (string)($body['token'] ?? '');
}
if (!$token) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Token requerido.']); exit; }

// Estructura: header.payload.signature (3 partes)
$parts = explode('.', $token);
if (count($parts) !== 3) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Token malformado.']); exit; }

[$b64_header, $b64_payload, $b64_sig] = $parts;

// 1. Verificar cada parte es base64url válido antes de decodificar
if (!preg_match('/^[A-Za-z0-9_\-]+$/', $b64_header) ||
    !preg_match('/^[A-Za-z0-9_\-]+$/', $b64_payload) ||
    !preg_match('/^[A-Za-z0-9_\-]+$/', $b64_sig)) {
    http_response_code(401);
    echo json_encode(['ok'=>false,'error'=>'Token contiene caracteres inválidos.']);
    exit;
}

// 2. Verificar algoritmo ANTES de validar firma (previene algorithm confusion attacks)
$header_data = json_decode(jwt_base64url_decode($b64_header), true) ?? [];
if (($header_data['alg'] ?? '') !== 'HS256') {
    http_response_code(401);
    echo json_encode(['ok'=>false,'error'=>'Algoritmo no soportado.']);
    exit;
}

// 3. Verificar firma en tiempo constante — immune a timing attacks
function jwt_base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
$expected_sig = jwt_base64url_encode(hash_hmac('sha256', "{$b64_header}.{$b64_payload}", $secret, true));
if (!hash_equals($expected_sig, $b64_sig)) {
    http_response_code(401);
    echo json_encode(['ok'=>false,'error'=>'Firma inválida.']);
    exit;
}

// 4. Verificar expiración
$data = json_decode(jwt_base64url_decode($b64_payload), true) ?? [];
if (!isset($data['exp']) || !is_int($data['exp']) || $data['exp'] < time()) {
    http_response_code(401);
    echo json_encode(['ok'=>false,'error'=>'Token expirado.']);
    exit;
}

echo json_encode(['ok'=>true,'login'=>$data['login'],'role'=>$data['role'],'exp'=>$data['exp']]);
