<?php
/**
 * Consulta directamente la tabla `personas` en PostgreSQL
 * usando las credenciales REPORTES_PG* del entorno.
 * Normaliza los campos al formato que espera NetworkMember en el frontend.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$host   = getenv('REPORTES_PGHOST')     ?: 'localhost';
$port   = getenv('REPORTES_PGPORT')     ?: '5432';
$user   = getenv('REPORTES_PGUSER')     ?: '';
$pass   = getenv('REPORTES_PGPASSWORD') ?: '';
$dbname = getenv('REPORTES_PGDATABASE') ?: '';

try {
    $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT            => 10,
    ]);
} catch (PDOException $e) {
    http_response_code(502);
    echo json_encode(['error' => 'No se pudo conectar a la base de datos: ' . $e->getMessage()]);
    exit;
}

try {
    $stmt = $pdo->query("SELECT * FROM personas ORDER BY id ASC");
    $rows = $stmt->fetchAll();
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al consultar personas: ' . $e->getMessage()]);
    exit;
}

$all = [];
foreach ($rows as $p) {
    $all[] = [
        'id'                           => isset($p['id']) ? (int)$p['id'] : null,
        'path'                         => $p['path'] ?? (string)($p['id'] ?? ''),
        'refiereid'                    => $p['refiereid'] ?? null,
        'nombre'                       => $p['nombre'] ?? '',
        'codigopostal'                 => $p['codigopostal'] ?? null,
        'colonia'                      => $p['colonia'] ?? null,
        'selfie_url'                   => $p['selfie_url'] ?? null,
        'hash_code'                    => $p['hash_code'] ?? null,
        // Redes sociales: soporta _handle y _username como nombres de columna
        'twitter_username'             => ($p['twitter_handle']   ?? $p['twitter_username']   ?? null) ?: null,
        'instagram_username'           => ($p['instagram_handle'] ?? $p['instagram_username'] ?? null) ?: null,
        'facebook_username'            => ($p['facebook_handle']  ?? $p['facebook_username']  ?? null) ?: null,
        'tiktok_username'              => ($p['tiktok_handle']    ?? $p['tiktok_username']    ?? null) ?: null,
        // Intereses
        'temas_mas_interesantes'       => $p['intereses_text'] ?? $p['temas_mas_interesantes'] ?? null,
        // Teléfono
        'telefono'                     => $p['telefono'] ?? $p['telefonoformulario'] ?? null,
        'created_at'                   => $p['created_at'] ?? null,
        // Campos demográficos
        'fechadenacimiento'            => $p['fechadenacimiento'] ?? null,
        'fecha_nacimiento'             => $p['fecha_nacimiento']  ?? null,
        'sexo'                         => $p['sexo'] ?? null,
        'profesion'                    => $p['profesion'] ?? null,
        'niveldeestudios'              => $p['niveldeestudios'] ?? null,
        'hobbies'                      => $p['hobbies'] ?? null,
        'contenidofavorito'            => $p['contenidofavorito'] ?? null,
        'redessocialesfavoritas'       => $p['redessocialesfavoritas'] ?? null,
        'tipodeparticipacionpreferida' => $p['tipodeparticipacionpreferida'] ?? null,
        'origen'                       => $p['origen'] ?? null,
        'direct_descendants_count'     => isset($p['direct_descendants_count']) ? (int)$p['direct_descendants_count'] : null,
        'total_descendants_count'      => isset($p['total_descendants_count'])  ? (int)$p['total_descendants_count']  : null,
        'wa_message'                   => $p['wa_message'] ?? null,
    ];
}

echo json_encode($all, JSON_UNESCAPED_UNICODE);
