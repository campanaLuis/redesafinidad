<?php
/**
 * GET /api/ejercito-digital?limit=N&offset=N
 * Devuelve registros de la tabla `personas` con los nombres de columna
 * originales que espera el módulo Ejército Digital del frontend.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/_db.php';

$limit  = min((int)($_GET['limit']  ?? 500), 2_000_000);
$offset = max((int)($_GET['offset'] ?? 0),   0);

try {
    $pdo  = get_pdo();
    $stmt = $pdo->prepare("SELECT * FROM personas ORDER BY id ASC LIMIT :lim OFFSET :off");
    $stmt->bindValue(':lim', $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();
} catch (PDOException $e) {
    http_response_code(502);
    echo json_encode(['error' => 'DB error: ' . $e->getMessage()]);
    exit;
}

// El frontend espera campo fecha_registro; si no existe en la tabla, usa created_at
$out = [];
foreach ($rows as $r) {
    $r['fecha_registro'] = $r['fecha_registro'] ?? $r['created_at'] ?? null;
    $out[] = $r;
}

echo json_encode($out, JSON_UNESCAPED_UNICODE);
