<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/_db.php';

$limit  = min((int)($_GET['limit']  ?? 500), 2_000_000);
$offset = max((int)($_GET['offset'] ?? 0),   0);

$result = supabase_get('peticiones', $limit, $offset, 'creado_en.desc');

if ($result === null) {
    http_response_code(502);
    echo json_encode(['error' => 'No se pudo conectar a Supabase. Verifica SUPABASE_URL y SUPABASE_ANON_KEY en EasyPanel.']);
    exit;
}

// El frontend espera { rows: [], total: N }
echo json_encode(['rows' => $result['data'], 'total' => $result['total']], JSON_UNESCAPED_UNICODE);
