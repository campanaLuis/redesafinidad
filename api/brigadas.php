<?php
/**
 * /api/brigadas/{recurso}[/{id}[/{accion}]]
 *
 * Rutas soportadas:
 *   GET    /api/brigadas/team?owner_login=X
 *   PUT    /api/brigadas/team               body: {owner_login, memberId, role}
 *   PUT    /api/brigadas/team/batch         body: {owner_login, members:[{memberId,role}]}
 *   DELETE /api/brigadas/team?owner_login=X&memberId=Y
 *
 *   GET    /api/brigadas/apoyos?owner_login=X
 *   PUT    /api/brigadas/apoyos             body: {id, owner_login, name, tasks, beneficiaryMemberIds}
 *   DELETE /api/brigadas/apoyos/{id}
 *
 *   GET    /api/brigadas/equipo-no-reg
 *   POST   /api/brigadas/equipo-no-reg      body: [{nombre,celular,rol,...}]
 *   DELETE /api/brigadas/equipo-no-reg/{id}
 *   PATCH  /api/brigadas/equipo-no-reg/{id}/rol    body: {rol}
 *   PATCH  /api/brigadas/equipo-no-reg/{id}/coords body: {lat,lng}
 *
 *   GET    /api/brigadas/apoyos-no-reg?owner_login=X
 *   GET    /api/brigadas/apoyos-no-reg-telefonos?owner_login=X&apoyo_id=Y
 *   POST   /api/brigadas/apoyos-no-reg      body: [{owner_login,apoyo_id,apoyo_nombre,...}]
 *   DELETE /api/brigadas/apoyos-no-reg/{id}
 *   PATCH  /api/brigadas/apoyos-no-reg/{id}/coords body: {lat,lng}
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/_db.php';

$method  = $_SERVER['REQUEST_METHOD'];
$path    = trim($_SERVER['PATH_INFO'] ?? '', '/');
$parts   = $path === '' ? [] : explode('/', $path);
$recurso = $parts[0] ?? '';
$id      = $parts[1] ?? null;
$accion  = $parts[2] ?? null;

function body(): array {
    static $data = null;
    if ($data !== null) return $data;
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    return $data;
}

function ok(mixed $data = null): void {
    echo json_encode($data ?? ['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

function err(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

try {
    $pdo = get_pdo();
} catch (PDOException $e) {
    err(502, 'DB connection failed: ' . $e->getMessage());
}

/* ══════════════════════════════════════════════════════════
   /api/brigadas/team
══════════════════════════════════════════════════════════ */
if ($recurso === 'team') {

    if ($method === 'GET') {
        $owner = $_GET['owner_login'] ?? '';
        $stmt  = $pdo->prepare("SELECT member_id AS \"memberId\", role FROM admin_team WHERE owner_login = :o ORDER BY id");
        $stmt->execute([':o' => $owner]);
        ok($stmt->fetchAll());
    }

    if ($method === 'PUT' && $id === 'batch') {
        $b      = body();
        $owner  = $b['owner_login'] ?? '';
        $members = $b['members'] ?? [];
        if (!$owner || !is_array($members)) err(400, 'owner_login y members requeridos');
        $stmt = $pdo->prepare(
            "INSERT INTO admin_team (owner_login, member_id, role)
             VALUES (:o, :m, :r)
             ON CONFLICT (owner_login, member_id) DO UPDATE SET role = EXCLUDED.role"
        );
        foreach ($members as $entry) {
            $stmt->execute([':o' => $owner, ':m' => (int)($entry['memberId'] ?? 0), ':r' => $entry['role'] ?? 'vocal']);
        }
        ok();
    }

    if ($method === 'PUT') {
        $b = body();
        $owner = $b['owner_login'] ?? '';
        $mid   = (int)($b['memberId'] ?? 0);
        $role  = $b['role'] ?? 'vocal';
        if (!$owner || !$mid) err(400, 'owner_login y memberId requeridos');
        $stmt = $pdo->prepare(
            "INSERT INTO admin_team (owner_login, member_id, role)
             VALUES (:o, :m, :r)
             ON CONFLICT (owner_login, member_id) DO UPDATE SET role = EXCLUDED.role"
        );
        $stmt->execute([':o' => $owner, ':m' => $mid, ':r' => $role]);
        ok();
    }

    if ($method === 'DELETE') {
        $owner = $_GET['owner_login'] ?? '';
        $mid   = (int)($_GET['memberId'] ?? 0);
        if (!$owner || !$mid) err(400, 'owner_login y memberId requeridos');
        $stmt = $pdo->prepare("DELETE FROM admin_team WHERE owner_login = :o AND member_id = :m");
        $stmt->execute([':o' => $owner, ':m' => $mid]);
        ok();
    }

    err(405, 'Método no permitido');
}

/* ══════════════════════════════════════════════════════════
   /api/brigadas/apoyos[/{id}]
══════════════════════════════════════════════════════════ */
if ($recurso === 'apoyos') {

    if ($method === 'GET') {
        $owner = $_GET['owner_login'] ?? '';
        $stmt  = $pdo->prepare(
            "SELECT id, owner_login, name, tasks, beneficiary_member_ids AS beneficiaryMemberIds, created_at, updated_at
             FROM team_apoyos WHERE owner_login = :o ORDER BY created_at DESC"
        );
        $stmt->execute([':o' => $owner]);
        $rows = array_map(function ($r) {
            return [
                'id'                   => $r['id'],
                'owner_login'          => $r['owner_login'],
                'name'                 => $r['name'],
                'tasks'                => json_decode($r['tasks'], true) ?? [],
                'beneficiaryMemberIds' => json_decode($r['beneficiarymemberids'], true) ?? [],
                'created_at'           => $r['created_at'],
                'updated_at'           => $r['updated_at'],
            ];
        }, $stmt->fetchAll());
        ok($rows);
    }

    if ($method === 'PUT') {
        $b    = body();
        $apid = $b['id'] ?? null;
        $owner= $b['owner_login'] ?? '';
        $name = $b['name'] ?? '';
        if (!$apid || !$owner || !$name) err(400, 'id, owner_login y name requeridos');
        $tasks = json_encode($b['tasks'] ?? []);
        $bids  = json_encode($b['beneficiaryMemberIds'] ?? []);
        $stmt  = $pdo->prepare(
            "INSERT INTO team_apoyos (id, owner_login, name, tasks, beneficiary_member_ids, updated_at)
             VALUES (:id, :o, :n, :t, :b, now())
             ON CONFLICT (id) DO UPDATE
               SET owner_login = EXCLUDED.owner_login,
                   name        = EXCLUDED.name,
                   tasks       = EXCLUDED.tasks,
                   beneficiary_member_ids = EXCLUDED.beneficiary_member_ids,
                   updated_at  = now()"
        );
        $stmt->execute([':id' => $apid, ':o' => $owner, ':n' => $name, ':t' => $tasks, ':b' => $bids]);
        ok();
    }

    if ($method === 'DELETE' && $id) {
        $stmt = $pdo->prepare("DELETE FROM team_apoyos WHERE id = :id");
        $stmt->execute([':id' => $id]);
        ok();
    }

    err(405, 'Método no permitido');
}

/* ══════════════════════════════════════════════════════════
   /api/brigadas/equipo-no-reg[/{id}[/{accion}]]
══════════════════════════════════════════════════════════ */
if ($recurso === 'equipo-no-reg') {

    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM equipo_no_registrados ORDER BY importado_en DESC");
        ok($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $rows = body();
        if (!is_array($rows) || empty($rows)) err(400, 'Array de filas requerido');
        $stmt = $pdo->prepare(
            "INSERT INTO equipo_no_registrados
               (nombre, celular, rol, municipio, localidad, colonia, calle, numero_exterior, codigo_postal)
             VALUES (:nombre, :celular, :rol, :municipio, :localidad, :colonia, :calle, :num_ext, :cp)
             RETURNING *"
        );
        $inserted = [];
        foreach ($rows as $r) {
            $stmt->execute([
                ':nombre'     => $r['nombre']          ?? null,
                ':celular'    => $r['celular']          ?? '',
                ':rol'        => $r['rol']              ?? 'vocal',
                ':municipio'  => $r['municipio']        ?? null,
                ':localidad'  => $r['localidad']        ?? null,
                ':colonia'    => $r['colonia']           ?? null,
                ':calle'      => $r['calle']             ?? null,
                ':num_ext'    => $r['numero_exterior']  ?? null,
                ':cp'         => $r['codigo_postal']    ?? null,
            ]);
            $row = $stmt->fetch();
            if ($row) $inserted[] = $row;
        }
        ok($inserted);
    }

    if ($method === 'DELETE' && $id) {
        $stmt = $pdo->prepare("DELETE FROM equipo_no_registrados WHERE id = :id");
        $stmt->execute([':id' => $id]);
        ok();
    }

    if ($method === 'PATCH' && $id && $accion === 'rol') {
        $rol  = body()['rol'] ?? null;
        if (!$rol) err(400, 'rol requerido');
        $stmt = $pdo->prepare("UPDATE equipo_no_registrados SET rol = :rol WHERE id = :id");
        $stmt->execute([':rol' => $rol, ':id' => $id]);
        ok();
    }

    if ($method === 'PATCH' && $id && $accion === 'coords') {
        $b = body();
        $lat = $b['lat'] ?? null; $lng = $b['lng'] ?? null;
        if ($lat === null || $lng === null) err(400, 'lat y lng requeridos');
        $stmt = $pdo->prepare("UPDATE equipo_no_registrados SET lat = :lat, lng = :lng WHERE id = :id");
        $stmt->execute([':lat' => (float)$lat, ':lng' => (float)$lng, ':id' => $id]);
        ok();
    }

    err(405, 'Método no permitido');
}

/* ══════════════════════════════════════════════════════════
   /api/brigadas/apoyos-no-reg-telefonos
══════════════════════════════════════════════════════════ */
if ($recurso === 'apoyos-no-reg-telefonos') {
    $owner   = $_GET['owner_login'] ?? '';
    $apoyoid = $_GET['apoyo_id']    ?? '';
    $stmt    = $pdo->prepare(
        "SELECT telefono FROM apoyos_no_registrados
         WHERE owner_login = :o AND apoyo_id = :a AND telefono IS NOT NULL"
    );
    $stmt->execute([':o' => $owner, ':a' => $apoyoid]);
    ok(array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'telefono'));
}

/* ══════════════════════════════════════════════════════════
   /api/brigadas/apoyos-no-reg[/{id}[/{accion}]]
══════════════════════════════════════════════════════════ */
if ($recurso === 'apoyos-no-reg') {

    if ($method === 'GET') {
        $owner = $_GET['owner_login'] ?? '';
        $stmt  = $pdo->prepare("SELECT * FROM apoyos_no_registrados WHERE owner_login = :o ORDER BY importado_en DESC");
        $stmt->execute([':o' => $owner]);
        ok($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $rows = body();
        if (!is_array($rows) || empty($rows)) err(400, 'Array de filas requerido');
        $stmt = $pdo->prepare(
            "INSERT INTO apoyos_no_registrados
               (owner_login, apoyo_id, apoyo_nombre, curp, nombre_completo, programa,
                municipio, localidad, colonia, calle, numero_interior, numero_exterior,
                codigo_postal, telefono, numero_de_seccion)
             VALUES
               (:owner_login, :apoyo_id, :apoyo_nombre, :curp, :nombre_completo, :programa,
                :municipio, :localidad, :colonia, :calle, :numero_interior, :numero_exterior,
                :codigo_postal, :telefono, :numero_de_seccion)
             RETURNING *"
        );
        $inserted = [];
        foreach ($rows as $r) {
            $stmt->execute([
                ':owner_login'       => $r['owner_login']       ?? '',
                ':apoyo_id'          => $r['apoyo_id']          ?? '',
                ':apoyo_nombre'      => $r['apoyo_nombre']      ?? '',
                ':curp'              => $r['curp']              ?? null,
                ':nombre_completo'   => $r['nombre_completo']   ?? null,
                ':programa'          => $r['programa']          ?? null,
                ':municipio'         => $r['municipio']         ?? null,
                ':localidad'         => $r['localidad']         ?? null,
                ':colonia'           => $r['colonia']           ?? null,
                ':calle'             => $r['calle']             ?? null,
                ':numero_interior'   => $r['numero_interior']   ?? null,
                ':numero_exterior'   => $r['numero_exterior']   ?? null,
                ':codigo_postal'     => $r['codigo_postal']     ?? null,
                ':telefono'          => $r['telefono']          ?? null,
                ':numero_de_seccion' => $r['numero_de_seccion'] ?? null,
            ]);
            $row = $stmt->fetch();
            if ($row) $inserted[] = $row;
        }
        ok($inserted);
    }

    if ($method === 'DELETE' && $id) {
        $stmt = $pdo->prepare("DELETE FROM apoyos_no_registrados WHERE id = :id");
        $stmt->execute([':id' => $id]);
        ok();
    }

    if ($method === 'PATCH' && $id && $accion === 'coords') {
        $b = body();
        $lat = $b['lat'] ?? null; $lng = $b['lng'] ?? null;
        if ($lat === null || $lng === null) err(400, 'lat y lng requeridos');
        $stmt = $pdo->prepare("UPDATE apoyos_no_registrados SET lat = :lat, lng = :lng WHERE id = :id");
        $stmt->execute([':lat' => (float)$lat, ':lng' => (float)$lng, ':id' => $id]);
        ok();
    }

    err(405, 'Método no permitido');
}

err(404, "Recurso desconocido: {$recurso}");
