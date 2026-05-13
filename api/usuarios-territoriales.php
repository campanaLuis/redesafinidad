<?php
/**
 * GET /api/usuarios-territoriales
 * Devuelve la lista de operadores de la estructura territorial
 * desde la tabla usuarios_territoriales en el PostgreSQL del chatbot.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/_db.php';

try {
    $pdo  = get_pdo();
    $stmt = $pdo->query(
        "SELECT id, nombre, celular, tipo_usuario, programa,
                municipio, localidad, superior_id, activo, created_at
         FROM usuarios_territoriales
         WHERE activo = TRUE
         ORDER BY
           CASE tipo_usuario
             WHEN 'estatal'  THEN 1
             WHEN 'regional' THEN 2
             WHEN 'enlace'   THEN 3
             WHEN 'vocal'    THEN 4
             WHEN 'promotor' THEN 5
             ELSE 6
           END,
           nombre ASC"
    );

    $rows = [];
    foreach ($stmt->fetchAll() as $r) {
        $rows[] = [
            'id'          => (string)$r['id'],
            'nombre'      => $r['nombre'],
            'celular'     => $r['celular'],
            'tipo_usuario'=> $r['tipo_usuario'],
            'programa'    => $r['programa'],
            'municipio'   => $r['municipio'],
            'localidad'   => $r['localidad'],
            'superior_id' => $r['superior_id'] !== null ? (string)$r['superior_id'] : null,
            'activo'      => (bool)$r['activo'],
            'creado_en'   => $r['created_at'],
        ];
    }

    echo json_encode($rows, JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(502);
    echo json_encode(['error' => $e->getMessage()]);
}
