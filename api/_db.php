<?php
/**
 * Helper: devuelve una conexión PDO al PostgreSQL usando REPORTES_PG*.
 * Llamar con require_once __DIR__ . '/_db.php';
 */
function get_pdo(): PDO {
    $env = [];
    $envFile = __DIR__ . '/../.env';
    if (file_exists($envFile)) {
        foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
            [$k, $v] = explode('=', $line, 2);
            $env[trim($k)] = trim(trim($v), '"\'');
        }
    }
    // Las vars del contenedor tienen precedencia sobre el .env
    $host   = getenv('REPORTES_PGHOST')     ?: ($env['REPORTES_PGHOST']     ?? 'localhost');
    $port   = getenv('REPORTES_PGPORT')     ?: ($env['REPORTES_PGPORT']     ?? '5432');
    $user   = getenv('REPORTES_PGUSER')     ?: ($env['REPORTES_PGUSER']     ?? '');
    $pass   = getenv('REPORTES_PGPASSWORD') ?: ($env['REPORTES_PGPASSWORD'] ?? '');
    $dbname = getenv('REPORTES_PGDATABASE') ?: ($env['REPORTES_PGDATABASE'] ?? '');

    return new PDO(
        "pgsql:host={$host};port={$port};dbname={$dbname}",
        $user, $pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT            => 10,
        ]
    );
}
