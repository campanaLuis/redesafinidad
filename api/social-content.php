<?php
/**
 * Agrega posts de todas las plataformas desde las tablas redes_sociales.*_posts
 * en el PostgreSQL de reportes (REPORTES_PG*) y los transforma al formato
 * SocialPost que espera el frontend.
 *
 * Tablas consultadas:
 *   redes_sociales.facebook_posts
 *   redes_sociales.instagram_posts
 *   redes_sociales.tiktok_posts
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/_db.php';

$platforms = [
    'facebook'  => 'redes_sociales.facebook_posts',
    'instagram' => 'redes_sociales.instagram_posts',
    'tiktok'    => 'redes_sociales.tiktok_posts',
];

$all = [];

try {
    $pdo = get_pdo();

    foreach ($platforms as $platform => $table) {
        $stmt = $pdo->query("SELECT * FROM {$table} ORDER BY posted_date DESC");
        $rows = $stmt->fetchAll();

        foreach ($rows as $r) {
            $all[] = [
                'id'              => $platform . '_' . $r['post_id'],
                'platform'        => $platform,
                'content_type'    => 'post',
                'external_id'     => (string)$r['post_id'],
                'parent_id'       => null,
                'username'        => $r['username']        ?? null,
                'content'         => $r['caption']         ?? null,
                'url'             => $r['url']              ?? null,
                'likes'           => (int)($r['likes']      ?? 0),
                'comments_count'  => (int)($r['comentarios'] ?? 0),
                'posted_date'     => $r['posted_date']     ?? null,
                'created_at'      => $r['created_at']      ?? null,
                'scrap_realizado' => $r['scrap_realizado']  ?? null,
                'sentiment'       => null,
                'key_id'          => null,
            ];
        }
    }

    echo json_encode($all, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(502);
    echo json_encode(['error' => $e->getMessage()]);
}
