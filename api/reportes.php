<?php
/**
 * Proxy interno para los reportes de posicionamiento de lonas.
 * La tabla vive en la base local ejercitodigital-chatbot.public.reportes.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
$limit = max(1, min(500, $limit));
$offset = max(0, $offset);

$script = __DIR__ . '/reportes_query.py';
$python = '/usr/bin/python3';
$cmd = escapeshellcmd($python) . ' ' . escapeshellarg($script);

$env = [
    'PATH' => getenv('PATH') ?: '/usr/bin:/bin',
    'PYTHONPATH' => __DIR__ . '/python-vendor',
    'REPORTES_PGHOST' => 'localhost',
    'REPORTES_PGPORT' => '5432',
    'REPORTES_PGUSER' => 'mtonelli',
    'REPORTES_PGPASSWORD' => 'jC0p5g8J',
    'REPORTES_PGDATABASE' => 'ejercitodigital-chatbot',
    'REPORTES_LIMIT' => (string)$limit,
    'REPORTES_OFFSET' => (string)$offset,
];

$descriptors = [
    1 => ['pipe', 'w'],
    2 => ['pipe', 'w'],
];

$process = proc_open($cmd, $descriptors, $pipes, __DIR__, $env);
if (!is_resource($process)) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo iniciar el lector de reportes']);
    exit;
}

$stdout = stream_get_contents($pipes[1]);
$stderr = stream_get_contents($pipes[2]);
fclose($pipes[1]);
fclose($pipes[2]);

$exitCode = proc_close($process);
if ($exitCode !== 0) {
    http_response_code(502);
    echo json_encode([
        'error' => 'No se pudieron cargar los reportes',
        'detail' => trim($stderr),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo $stdout;
