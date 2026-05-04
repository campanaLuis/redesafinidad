<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$base   = 'http://127.0.0.1:8089/api/social-content';
$limit  = 100;
$offset = 0;
$all    = [];

while (true) {
    $url  = "{$base}?limit={$limit}&offset={$offset}";
    $json = @file_get_contents($url);
    if ($json === false) { http_response_code(502); echo json_encode(['error' => 'Cannot reach upstream API']); exit; }

    $page = json_decode($json, true);
    if (!is_array($page) || empty($page['data'])) break;

    foreach ($page['data'] as $r) {
        $all[] = [
            'id'              => $r['id']              ?? null,
            'platform'        => $r['platform']        ?? null,
            'content_type'    => $r['content_type']    ?? null,
            'external_id'     => $r['external_id']     ?? null,
            'parent_id'       => $r['parent_id']       ?? null,
            'username'        => $r['username']         ?? null,
            'content'         => $r['content']         ?? null,
            'url'             => $r['url']              ?? null,
            'likes'           => isset($r['likes'])     ? (int)$r['likes']           : 0,
            'comments_count'  => isset($r['comments_count']) ? (int)$r['comments_count'] : 0,
            'posted_date'     => $r['posted_date']     ?? null,
            'created_at'      => $r['created_at']      ?? null,
            'scrap_realizado' => $r['scrap_realizado'] ?? null,
            'sentiment'       => $r['sentiment']       ?? null,
            'key_id'          => $r['key_id']          ?? null,
        ];
    }

    if (count($page['data']) < $limit) break;
    $offset += $limit;
}

echo json_encode($all, JSON_UNESCAPED_UNICODE);
