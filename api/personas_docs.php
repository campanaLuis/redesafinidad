<?php
/**
 * Documentación ReDoc del API de Personas — HTTP Basic Auth.
 * Credenciales: PERSONAS_DOCS_USER / PERSONAS_DOCS_PASSWORD en .env
 *
 * Seguridad:
 *   - HTTP Basic Auth (seguro solo sobre HTTPS — forzar HTTPS en nginx/servidor)
 *   - hash_equals() en tiempo constante — immune a timing attacks
 *   - Sin sesiones PHP (session_start nunca se llama)
 *   - Headers de seguridad: nosniff, no-store, DENY framing, CSP
 *   - YAML servido por ruta fija — sin path traversal posible
 */
declare(strict_types=1);

require_once __DIR__ . '/_db.php';

// --- Headers de seguridad (antes de cualquier output) ---
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Referrer-Policy: no-referrer');

$user     = env('PERSONAS_DOCS_USER', 'api');
$password = env('PERSONAS_DOCS_PASSWORD', '');

if ($password === '') {
    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'PERSONAS_DOCS_PASSWORD no está configurado en el servidor.';
    exit;
}

// --- HTTP Basic Auth ---
$auth_user = $_SERVER['PHP_AUTH_USER'] ?? '';
$auth_pass = $_SERVER['PHP_AUTH_PW']   ?? '';

// hash_equals: tiempo constante, immune a timing attacks
// Comparamos ambos siempre (& bitwise, no &&) para evitar short-circuit
$ok = hash_equals($user, $auth_user) & hash_equals($password, $auth_pass);
if (!$ok) {
    header('WWW-Authenticate: Basic realm="Personas API Docs", charset="UTF-8"');
    http_response_code(401);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Acceso no autorizado.';
    exit;
}

// --- Servir el YAML (ruta fija, sin path traversal) ---
if (($_GET['file'] ?? '') === 'openapi.yaml') {
    $yaml_path = realpath(__DIR__ . '/../docs/personas-api.yaml');
    $docs_dir  = realpath(__DIR__ . '/../docs');

    // Verificar que el archivo resuelto esté dentro del directorio permitido
    if ($yaml_path === false || $docs_dir === false || !str_starts_with($yaml_path, $docs_dir)) {
        http_response_code(404);
        echo 'Archivo no encontrado.';
        exit;
    }

    header('Content-Type: application/yaml; charset=UTF-8');
    header('Cache-Control: no-store');
    readfile($yaml_path);
    exit;
}

// --- Inyectar token server-side (la página ya está protegida por Basic Auth) ---
// El token nunca viaja sin autenticación previa.
$api_token = env('PERSONAS_API_TOKEN', '');

header('Content-Type: text/html; charset=UTF-8');
header("Content-Security-Policy: default-src 'self' https://unpkg.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://unpkg.com; script-src 'self' 'unsafe-inline' https://unpkg.com;");
?>
<!DOCTYPE html>
<html lang="es">
  <head>
    <title>API Maestro de Personas — Redes Afinidad</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
    <style>
      body { margin: 0; }
      .swagger-ui .topbar { background-color: #1a3a52; }
      .swagger-ui .topbar-wrapper img { display: none; }
      .swagger-ui .topbar-wrapper::before {
        content: 'API Maestro de Personas';
        color: #fff; font-size: 1.1rem; font-weight: 600; padding-left: 1rem;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      const ui = SwaggerUIBundle({
        url: '?file=openapi.yaml',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
        deepLinking: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
        requestInterceptor: (req) => {
          req.headers['Accept'] = 'application/json';
          return req;
        },
      });
      // Pre-cargar el Bearer token (inyectado server-side, página ya autenticada)
      window.addEventListener('load', () => {
        const token = <?= json_encode($api_token) ?>;
        if (token) {
          ui.preauthorizeApiKey('bearerAuth', token);
          ui.preauthorizeApiKey('agentToken', token);
        }
      });
    </script>
  </body>
</html>
