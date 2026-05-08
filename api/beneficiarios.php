<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/_db.php';

$limit  = min((int)($_GET['limit']  ?? 500), 2_000_000);
$offset = max((int)($_GET['offset'] ?? 0),   0);

try {
    $pdo  = get_pdo();
    $stmt = $pdo->prepare("SELECT * FROM beneficiarios ORDER BY creado_en DESC LIMIT :lim OFFSET :off");
    $stmt->bindValue(':lim', $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
    $stmt->execute();
    echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(502);
    echo json_encode(['error' => $e->getMessage()]);
}
