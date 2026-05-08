<?php
/**
 * /api/social-legacy/{platform}/{resource}
 * Sirve datos sociales usando el backend del chatbot como fuente.
 *
 * El chatbot expone:  GET /chatbot/comentarios/{platform}
 * → devuelve todos los comentarios de esa plataforma.
 *
 * Rutas:
 *   GET /{platform}/comments?limit&offset&full=1
 *   GET /{platform}/comments-for-post?post_id=N
 *   GET /{platform}/post-meta?ids=1,2,3
 *   GET /{platform}/posts?limit&offset          (sin fuente → array vacío)
 *   POST /member-comment-search                 body: {platform, targetNorm, variants[]}
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/_db.php';

$path    = trim($_SERVER['PATH_INFO'] ?? '', '/');
$parts   = explode('/', $path);
$method  = $_SERVER['REQUEST_METHOD'];

$validPlatforms = ['twitter', 'instagram', 'facebook', 'tiktok'];

// ── Normaliza una fila del chatbot al formato que espera el frontend ──
function normalize_comment(array $r, bool $full): array {
    $row = [
        'post_id'    => isset($r['post_id'])    ? (int)$r['post_id']    : 0,
        'username'   => $r['username']           ?? $r['usuario']        ?? null,
        'sentimiento'=> $r['sentimiento']        ?? $r['sentiment']      ?? null,
    ];
    if ($full) $row['comentario'] = $r['comentario'] ?? $r['comment'] ?? $r['texto'] ?? null;
    return $row;
}

// ── POST /member-comment-search ─────────────────────────────────────────
if ($method === 'POST' && $path === 'member-comment-search') {
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $platform = strtolower($body['platform'] ?? '');
    $variants = array_map('strtolower', array_values(array_filter((array)($body['variants'] ?? []), 'is_string')));

    if (!in_array($platform, $validPlatforms, true) || empty($variants)) { echo json_encode([]); exit; }

    $all = chatbot_get("/chatbot/comentarios/{$platform}");
    if (!$all) { echo json_encode([]); exit; }

    $out = [];
    foreach ($all as $r) {
        $user = strtolower($r['username'] ?? $r['usuario'] ?? '');
        if (in_array($user, $variants, true)) {
            $out[] = [
                'post_id'     => isset($r['post_id']) ? (int)$r['post_id'] : 0,
                'comentario'  => $r['comentario'] ?? $r['comment'] ?? null,
                'sentimiento' => $r['sentimiento'] ?? $r['sentiment'] ?? null,
                'username'    => $r['username'] ?? $r['usuario'] ?? null,
            ];
        }
    }
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    exit;
}

// ── GET /{platform}/{resource} ──────────────────────────────────────────
$platform = strtolower($parts[0] ?? '');
$resource = $parts[1] ?? '';

if (!in_array($platform, $validPlatforms, true)) {
    http_response_code(404);
    echo json_encode(['error' => "Plataforma desconocida: {$platform}"]);
    exit;
}

$limit  = min((int)($_GET['limit']  ?? 1000), 5000);
$offset = max((int)($_GET['offset'] ?? 0),    0);

if ($resource === 'posts') {
    // Sin fuente de posts en el chatbot — devuelve vacío para cortar el loop
    echo json_encode([]);
    exit;
}

if ($resource === 'comments') {
    $all = chatbot_get("/chatbot/comentarios/{$platform}");
    if ($all === null) { http_response_code(502); echo json_encode(['error' => 'Chatbot no disponible']); exit; }
    $full = ($_GET['full'] ?? '0') === '1';
    $page = array_slice($all, $offset, $limit);
    $out  = array_values(array_map(fn($r) => normalize_comment($r, $full), $page));
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($resource === 'comments-for-post') {
    $postId = (int)($_GET['post_id'] ?? 0);
    $all    = chatbot_get("/chatbot/comentarios/{$platform}");
    if ($all === null) { echo json_encode([]); exit; }
    $out = [];
    foreach ($all as $r) {
        if ((int)($r['post_id'] ?? 0) === $postId) {
            $out[] = [
                'username'    => $r['username']    ?? $r['usuario']   ?? null,
                'comentario'  => $r['comentario']  ?? $r['comment']   ?? null,
                'sentimiento' => $r['sentimiento'] ?? $r['sentiment'] ?? null,
            ];
        }
    }
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($resource === 'post-meta') {
    // Sin datos de posts — devuelve objeto vacío
    echo json_encode((object)[]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => "Recurso desconocido: {$resource}"]);
