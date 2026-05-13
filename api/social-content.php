<?php
/**
 * Proxy hacia el endpoint /api/social-content del chatbot (puerto 8089).
 * Ese servicio devuelve los posts de redes sociales con likes, comments_count, etc.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/_db.php';

$base   = rtrim(env('PERSONAS_API_URL', 'http://127.0.0.1:8089'), '/') . '/api/social-content';
$limit  = 500;
$offset = 0;
$all    = [];

while (true) {
    $url  = "{$base}?limit={$limit}&offset={$offset}";
    $ctx  = stream_context_create(['http' => ['method' => 'GET', 'timeout' => 30, 'ignore_errors' => true]]);
    $json = @file_get_contents($url, false, $ctx);

    if ($json === false) {
        http_response_code(502);
        echo json_encode(['error' => "No se pudo conectar al servicio de redes sociales ({$url})"]);
        exit;
    }

    $page = json_decode($json, true);

    // El servicio puede devolver array plano o {data:[...]}
    if (is_array($page) && isset($page['data'])) {
        $rows = $page['data'];
    } elseif (is_array($page) && array_is_list($page)) {
        $rows = $page;
    } else {
        // Respuesta inesperada — devolver el cuerpo para depuración
        http_response_code(502);
        echo json_encode(['error' => 'Respuesta inesperada del servicio', 'raw' => substr($json, 0, 500)]);
        exit;
    }

    if (empty($rows)) break;

    foreach ($rows as $r) {
        $all[] = [
            'id'              => $r['id']              ?? null,
            'platform'        => $r['platform']        ?? null,
            'content_type'    => $r['content_type']    ?? null,
            'external_id'     => $r['external_id']     ?? null,
            'parent_id'       => $r['parent_id']       ?? null,
            'username'        => $r['username']        ?? null,
            'content'         => $r['content']         ?? null,
            'url'             => $r['url']              ?? null,
            'likes'           => isset($r['likes'])          ? (int)$r['likes']          : 0,
            'comments_count'  => isset($r['comments_count']) ? (int)$r['comments_count'] : 0,
            'posted_date'     => $r['posted_date']     ?? null,
            'created_at'      => $r['created_at']      ?? null,
            'scrap_realizado' => $r['scrap_realizado'] ?? null,
            'sentiment'       => $r['sentiment']       ?? null,
            'key_id'          => $r['key_id']          ?? null,
        ];
    }

    // Si el servicio devolvió array plano, no hay paginación
    if (is_array($page) && array_is_list($page)) break;
    if (count($rows) < $limit) break;
    $offset += $limit;
}

echo json_encode($all, JSON_UNESCAPED_UNICODE);
