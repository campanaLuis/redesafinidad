<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$base   = rtrim(getenv('PERSONAS_API_URL') ?: 'http://127.0.0.1:8089', '/') . '/api/usuarios-territoriales';
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
            'id'           => $r['id']          ?? null,
            'nombre'       => $r['nombre']       ?? null,
            'celular'      => $r['celular']      ?? null,
            'tipo_usuario' => isset($r['tipo_usuario']) ? strtolower($r['tipo_usuario']) : null,
            'programa'     => $r['programa']     ?? null,   // puede ser CSV: "PROG A, PROG B"
            'municipio'    => $r['municipio']    ?? null,
            'localidad'    => $r['localidad']    ?? null,
            'superior_id'  => $r['superior_id']  ?? null,
            'activo'       => $r['activo']       ?? null,
            'creado_en'    => $r['created_at']   ?? null,
        ];
    }

    if (count($page['data']) < $limit) break;
    $offset += $limit;
}

echo json_encode($all, JSON_UNESCAPED_UNICODE);
