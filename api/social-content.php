<?php
/**
 * Agrega comentarios de todas las plataformas desde el chatbot backend
 * y los transforma al formato SocialPost que espera el frontend.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/_db.php';

$platforms = ['twitter', 'instagram', 'facebook', 'tiktok'];
$all = [];

foreach ($platforms as $platform) {
    $rows = chatbot_get("/chatbot/comentarios/{$platform}");
    if (!is_array($rows)) continue;

    foreach ($rows as $r) {
        $all[] = [
            'id'              => (string)($r['id']            ?? uniqid()),
            'platform'        => $platform,
            'content_type'    => 'comment',
            'external_id'     => isset($r['post_id']) ? (string)$r['post_id'] : null,
            'parent_id'       => null,
            'username'        => $r['username']    ?? $r['usuario']  ?? null,
            'content'         => $r['comentario']  ?? $r['comment']  ?? null,
            'url'             => null,
            'likes'           => 0,
            'comments_count'  => 0,
            'posted_date'     => $r['fecha']       ?? $r['created_at'] ?? null,
            'created_at'      => $r['created_at']  ?? $r['fecha']    ?? null,
            'scrap_realizado' => null,
            'sentiment'       => $r['sentimiento'] ?? $r['sentiment'] ?? null,
            'key_id'          => null,
        ];
    }
}

echo json_encode($all, JSON_UNESCAPED_UNICODE);
