<?php
/**
 * Maneja las rutas /api/social-legacy/* consultando PostgreSQL.
 *
 * Rutas soportadas (PATH_INFO):
 *   GET  /{platform}/posts?limit&offset
 *   GET  /{platform}/comments?limit&offset&full=1
 *   GET  /{platform}/comments-for-post?post_id=N
 *   GET  /{platform}/post-meta?ids=1,2,3
 *   POST /member-comment-search   body: {platform, targetNorm, variants[]}
 *
 * Tablas esperadas: {Platform}_publicaciones, {Platform}_comentarios
 * donde Platform = Twitter | Instagram | Facebook | TikTok
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/_db.php';

// PATH_INFO viene del nginx (ej. /twitter/posts)
$path   = trim($_SERVER['PATH_INFO'] ?? '', '/');
$parts  = explode('/', $path);
$method = $_SERVER['REQUEST_METHOD'];

// ── Mapeo de plataforma → nombres de tabla ──────────────────────────────
$platformMap = [
    'twitter'   => ['posts' => 'Twitter_publicaciones',   'comments' => 'Twitter_comentarios'],
    'instagram' => ['posts' => 'Instagram_publicaciones', 'comments' => 'Instagram_comentarios'],
    'facebook'  => ['posts' => 'Facebook_publicaciones',  'comments' => 'Facebook_comentarios'],
    'tiktok'    => ['posts' => 'TikTok_publicaciones',    'comments' => 'TikTok_comentarios'],
];

// ── POST /member-comment-search ─────────────────────────────────────────
if ($method === 'POST' && $path === 'member-comment-search') {
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $platform = strtolower($body['platform'] ?? '');
    $target   = $body['targetNorm'] ?? '';
    $variants = array_values(array_filter((array)($body['variants'] ?? []), 'is_string'));

    if (!isset($platformMap[$platform]) || empty($variants)) {
        echo json_encode([]); exit;
    }
    $tbl = $platformMap[$platform]['comments'];

    try {
        $pdo = get_pdo();
        $placeholders = implode(',', array_fill(0, count($variants), '?'));
        $sql  = "SELECT post_id, comentario, sentimiento, username
                 FROM \"{$tbl}\"
                 WHERE LOWER(username) IN ({$placeholders})
                 LIMIT 2000";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_map('strtolower', $variants));
        echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(502);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ── GET /{platform}/{resource} ──────────────────────────────────────────
$platform = strtolower($parts[0] ?? '');
$resource = $parts[1] ?? '';

if (!isset($platformMap[$platform])) {
    http_response_code(404);
    echo json_encode(['error' => "Plataforma desconocida: {$platform}"]);
    exit;
}

$tblPosts    = $platformMap[$platform]['posts'];
$tblComments = $platformMap[$platform]['comments'];
$limit  = min((int)($_GET['limit']  ?? 1000), 5000);
$offset = max((int)($_GET['offset'] ?? 0),    0);

try {
    $pdo = get_pdo();

    if ($resource === 'posts') {
        $stmt = $pdo->prepare(
            "SELECT id AS post_id, username, fecha AS posted_date, url, contenido AS caption,
                    COALESCE(likes, 0) AS likes, COALESCE(comentarios, 0) AS comentarios
             FROM \"{$tblPosts}\"
             ORDER BY id ASC
             LIMIT :lim OFFSET :off"
        );
        $stmt->bindValue(':lim', $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);

    } elseif ($resource === 'comments') {
        $full   = ($_GET['full'] ?? '0') === '1';
        $select = $full
            ? "post_id, username, sentimiento, comentario"
            : "post_id, username, sentimiento";
        $stmt = $pdo->prepare(
            "SELECT {$select}
             FROM \"{$tblComments}\"
             ORDER BY id ASC
             LIMIT :lim OFFSET :off"
        );
        $stmt->bindValue(':lim', $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);

    } elseif ($resource === 'comments-for-post') {
        $postId = (int)($_GET['post_id'] ?? 0);
        $stmt   = $pdo->prepare(
            "SELECT username, comentario, sentimiento
             FROM \"{$tblComments}\"
             WHERE post_id = :pid
             LIMIT 500"
        );
        $stmt->bindValue(':pid', $postId, PDO::PARAM_INT);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);

    } elseif ($resource === 'post-meta') {
        $ids = array_filter(array_map('intval', explode(',', $_GET['ids'] ?? '')));
        if (empty($ids)) { echo json_encode([]); exit; }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare(
            "SELECT id AS post_id, url, contenido AS caption
             FROM \"{$tblPosts}\"
             WHERE id IN ({$placeholders})"
        );
        $stmt->execute(array_values($ids));
        $result = [];
        foreach ($stmt->fetchAll() as $row) {
            $result[(string)$row['post_id']] = ['url' => $row['url'], 'caption' => $row['caption']];
        }
        echo json_encode($result, JSON_UNESCAPED_UNICODE);

    } else {
        http_response_code(404);
        echo json_encode(['error' => "Recurso desconocido: {$resource}"]);
    }

} catch (PDOException $e) {
    http_response_code(502);
    echo json_encode(['error' => 'DB error: ' . $e->getMessage()]);
}
