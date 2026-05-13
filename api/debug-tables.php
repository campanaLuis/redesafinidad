<?php
// Archivo temporal de diagnóstico — eliminar después
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/_db.php';

try {
    $pdo = get_pdo();

    // Listar todas las tablas en todos los schemas (excepto sistema)
    $stmt = $pdo->query("
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name
    ");
    echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (PDOException $e) {
    http_response_code(502);
    echo json_encode(['error' => $e->getMessage()]);
}
