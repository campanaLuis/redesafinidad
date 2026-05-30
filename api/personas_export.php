<?php
/**
 * API Maestro de Personas — Redes Afinidad
 *
 * GET /api/personas_export.php?mode=full[&page=1&per_page=500]
 * GET /api/personas_export.php?mode=incremental&since=2026-01-01T00:00:00Z[&page=1&per_page=500]
 *
 * Autenticación: Authorization: Bearer <PERSONAS_API_TOKEN>
 *                o header:        X-Agent-Token: <PERSONAS_API_TOKEN>
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Agent-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

require_once __DIR__ . '/_db.php';

// ---------------------------------------------------------------------------
// Autenticación — PERSONAS_API_TOKEN en .env
// ---------------------------------------------------------------------------
function bearer_token(): string {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (str_starts_with($auth, 'Bearer ')) return substr($auth, 7);
    return $_SERVER['HTTP_X_AGENT_TOKEN'] ?? '';
}

$token    = bearer_token();
$expected = env('PERSONAS_API_TOKEN', '');

if ($expected === '') {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'PERSONAS_API_TOKEN no está configurado en el servidor.']);
    exit;
}

if (!hash_equals($expected, $token)) {
    log_personas_access('UNAUTHORIZED', null, 0);
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Token inválido o ausente.']);
    exit;
}

// ---------------------------------------------------------------------------
// Parámetros
// ---------------------------------------------------------------------------
$mode     = $_GET['mode'] ?? 'full';
$page     = max(1, (int)($_GET['page'] ?? 1));
$per_page = min(2000, max(1, (int)($_GET['per_page'] ?? 500)));
$since    = $_GET['since'] ?? null;

if (!in_array($mode, ['full', 'incremental'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => "El parámetro 'mode' debe ser 'full' o 'incremental'."]);
    exit;
}

if ($mode === 'incremental' && !$since) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => "El parámetro 'since' es requerido para mode=incremental (ISO 8601, ej: 2026-01-01T00:00:00Z)."]);
    exit;
}

$since_pg = null;
if ($since) {
    $parsed = DateTime::createFromFormat(DateTime::ATOM, $since)
           ?: DateTime::createFromFormat('Y-m-d\TH:i:s\Z', $since)
           ?: DateTime::createFromFormat('Y-m-d', $since);
    if (!$parsed) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Formato inválido para 'since'. Use ISO 8601 (ej: 2026-01-01T00:00:00Z)."]);
        exit;
    }
    $since_pg = $parsed->format('Y-m-d H:i:s');
}

// ---------------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------------
try {
    $pdo = get_pdo();
} catch (PDOException $e) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'No se pudo conectar a la base de datos.']);
    exit;
}

$offset = ($page - 1) * $per_page;

try {
    if ($mode === 'full') {
        $count_stmt = $pdo->query('SELECT COUNT(*) FROM personas');
        $total      = (int)$count_stmt->fetchColumn();

        $stmt = $pdo->prepare('SELECT * FROM personas ORDER BY id ASC LIMIT :limit OFFSET :offset');
        $stmt->execute([':limit' => $per_page, ':offset' => $offset]);
    } else {
        // Incremental: nuevos (created_at) + actualizados (ultimo_mensaje_timestamp)
        $count_stmt = $pdo->prepare(
            "SELECT COUNT(*) FROM personas
             WHERE created_at >= :since1 OR ultimo_mensaje_timestamp >= :since2"
        );
        $count_stmt->execute([':since1' => $since_pg, ':since2' => $since_pg]);
        $total = (int)$count_stmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT * FROM personas
             WHERE created_at >= :since1 OR ultimo_mensaje_timestamp >= :since2
             ORDER BY GREATEST(created_at, COALESCE(ultimo_mensaje_timestamp, '1970-01-01'::timestamp)) ASC,
                      id ASC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->execute([':since1' => $since_pg, ':since2' => $since_pg, ':limit' => $per_page, ':offset' => $offset]);
    }

    $rows = $stmt->fetchAll();
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error al consultar personas: ' . $e->getMessage()]);
    exit;
}

$data = array_map('format_persona', $rows);

log_personas_access($mode, $since, count($data));

echo json_encode([
    'success'  => true,
    'mode'     => $mode,
    'total'    => $total,
    'page'     => $page,
    'per_page' => $per_page,
    'pages'    => $per_page > 0 ? (int)ceil($total / $per_page) : 1,
    'since'    => $since,
    'data'     => $data,
], JSON_UNESCAPED_UNICODE);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function format_persona(array $p): array {
    return [
        'id'                           => isset($p['id']) ? (int)$p['id'] : null,
        'path'                         => $p['path'] ?? null,
        'refiereid'                    => isset($p['refiereid']) ? (int)$p['refiereid'] : null,
        'nombre'                       => $p['nombre'] ?? null,
        'codigopostal'                 => $p['codigopostal'] ?? null,
        'colonia'                      => $p['colonia'] ?? null,
        'selfie_url'                   => $p['selfie_url'] ?? null,
        'hash_code'                    => $p['hash_code'] ?? null,
        'twitter_handle'               => $p['twitter_handle'] ?? null,
        'instagram_handle'             => $p['instagram_handle'] ?? null,
        'facebook_handle'              => $p['facebook_handle'] ?? null,
        'tiktok_handle'                => $p['tiktok_handle'] ?? null,
        'intereses_text'               => $p['intereses_text'] ?? null,
        'intereses_voice_note_url'     => $p['intereses_voice_note_url'] ?? null,
        'telefono'                     => $p['telefono'] ?? null,
        'telefonoformulario'           => $p['telefonoformulario'] ?? null,
        'sexo'                         => $p['sexo'] ?? null,
        'fechadenacimiento'            => $p['fechadenacimiento'] ?? null,
        'tienehijos'                   => $p['tienehijos'] ?? null,
        'numhijos'                     => $p['numhijos'] ?? null,
        'profesion'                    => $p['profesion'] ?? null,
        'niveldeestudios'              => $p['niveldeestudios'] ?? null,
        'contenidofavorito'            => $p['contenidofavorito'] ?? null,
        'tipodeparticipacionpreferida' => $p['tipodeparticipacionpreferida'] ?? null,
        'rolquebusca'                  => $p['rolquebusca'] ?? null,
        'respuestaabierta'             => $p['respuestaabierta'] ?? null,
        'redessocialesfavoritas'       => $p['redessocialesfavoritas'] ?? null,
        'hobbies'                      => $p['hobbies'] ?? null,
        'origen'                       => $p['origen'] ?? null,
        'wa_message'                   => $p['wa_message'] ?? null,
        'fecha_registro'               => $p['fecha_registro'] ?? null,
        'eventoid'                     => isset($p['eventoid']) ? (int)$p['eventoid'] : null,
        'ultimo_mensaje_timestamp'     => $p['ultimo_mensaje_timestamp'] ?? null,
        'direct_descendants_count'     => isset($p['direct_descendants_count']) ? (int)$p['direct_descendants_count'] : null,
        'total_descendants_count'      => isset($p['total_descendants_count'])  ? (int)$p['total_descendants_count']  : null,
        'created_at'                   => $p['created_at'] ?? null,
    ];
}

function log_personas_access(string $mode, ?string $since, int $count): void {
    $ip     = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $tok    = bearer_token();
    $masked = strlen($tok) > 8 ? substr($tok, 0, 4) . '****' . substr($tok, -4) : '****';
    // Sanitizar campos antes de escribir al log — previene log injection via newlines/pipes
    $safe_mode  = preg_replace('/[^a-z]/', '', $mode);
    $safe_since = $since ? preg_replace('/[^\d\-T:Z+.]/', '', $since) : '-';
    $safe_ip    = preg_replace('/[^\d.:a-fA-F,\s]/', '', $ip);
    $line       = implode(' | ', [
        date('c'),
        "ip={$safe_ip}",
        "mode={$safe_mode}",
        "since={$safe_since}",
        "records={$count}",
        "token={$masked}",
    ]);

    // Log a archivo
    $log_dir = __DIR__ . '/../logs';
    if (!is_dir($log_dir)) @mkdir($log_dir, 0750, true);
    @file_put_contents("{$log_dir}/personas_api.log", $line . PHP_EOL, FILE_APPEND | LOCK_EX);

    // Log a tabla en BD (se crea si no existe)
    try {
        $pdo = get_pdo();
        $pdo->exec("CREATE TABLE IF NOT EXISTS api_access_log (
            id SERIAL PRIMARY KEY,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            ip TEXT,
            token_masked TEXT,
            endpoint TEXT,
            mode TEXT,
            since TEXT,
            records_returned INTEGER
        )");
        $stmt = $pdo->prepare(
            "INSERT INTO api_access_log (ip, token_masked, endpoint, mode, since, records_returned)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$ip, $masked, 'personas_export', $mode, $since, $count]);
    } catch (Throwable) {
        // El log en archivo es el fallback; no se interrumpe la respuesta
    }
}
