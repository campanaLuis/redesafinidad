<?php
/**
 * Helpers de conexión compartidos para los scripts PHP.
 */

function load_env_file(): array {
    static $env = null;
    if ($env !== null) return $env;
    $env = [];
    $envFile = __DIR__ . '/../.env';
    if (!file_exists($envFile)) return $env;
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $env[trim($k)] = trim(trim($v), '"\'');
    }
    return $env;
}

function env(string $key, string $default = ''): string {
    $val = getenv($key);
    if ($val !== false && $val !== '') return $val;
    $file = load_env_file();
    return $file[$key] ?? $default;
}

/** Conexión PDO al PostgreSQL del chatbot (REPORTES_PG*). */
function get_pdo(): PDO {
    return new PDO(
        sprintf('pgsql:host=%s;port=%s;dbname=%s', env('REPORTES_PGHOST','localhost'), env('REPORTES_PGPORT','5432'), env('REPORTES_PGDATABASE')),
        env('REPORTES_PGUSER'), env('REPORTES_PGPASSWORD'),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_TIMEOUT => 10]
    );
}

/**
 * Llama a la Supabase REST API.
 * @return array|null  null si falla, array con 'data' y 'total' si tiene éxito.
 */
function supabase_get(string $table, int $limit, int $offset, string $order = 'creado_en.desc'): ?array {
    $url  = rtrim(env('SUPABASE_URL'), '/') . "/rest/v1/{$table}?select=*&limit={$limit}&offset={$offset}&order={$order}";
    $key  = env('SUPABASE_ANON_KEY');
    if (!$key) return null;

    $ctx = stream_context_create(['http' => [
        'method'  => 'GET',
        'header'  => implode("\r\n", [
            "apikey: {$key}",
            "Authorization: Bearer {$key}",
            "Prefer: count=exact",
        ]),
        'timeout' => 15,
        'ignore_errors' => true,
    ]]);

    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) return null;

    // Parsear total desde Content-Range: 0-99/2314
    $total = 0;
    foreach ($http_response_header as $h) {
        if (stripos($h, 'content-range:') === 0) {
            if (preg_match('/\/(\d+)/', $h, $m)) $total = (int)$m[1];
        }
    }

    $data = json_decode($body, true);
    if (!is_array($data)) return null;
    return ['data' => $data, 'total' => $total];
}

/**
 * Llama al backend del chatbot (PERSONAS_API_URL).
 * @return array|null  null si falla.
 */
function chatbot_get(string $path): ?array {
    $url = rtrim(env('PERSONAS_API_URL', 'http://127.0.0.1:8089'), '/') . $path;
    $ctx = stream_context_create(['http' => ['method' => 'GET', 'timeout' => 30, 'ignore_errors' => true]]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) return null;
    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}
