<?php
/**
 * Proxy interno hacia http://127.0.0.1:8089/api/personas
 * Agrega todas las páginas (límite 100 por petición) y normaliza
 * los nombres de campos para que coincidan con NetworkMember del frontend.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$PAGE_SIZE   = 100;
$offset      = 0;
$all         = [];
$API_BASE    = rtrim(getenv('PERSONAS_API_URL') ?: 'http://127.0.0.1:8089', '/');

do {
    $url  = "{$API_BASE}/api/personas?limit={$PAGE_SIZE}&offset={$offset}";
    $raw  = @file_get_contents($url);

    if ($raw === false) {
        http_response_code(502);
        echo json_encode(['error' => 'No se pudo conectar al servicio de personas']);
        exit;
    }

    $body = json_decode($raw, true);

    if (!is_array($body) || !isset($body['data']) || !is_array($body['data'])) {
        break;
    }

    $rows = $body['data'];

    foreach ($rows as $p) {
        // Normaliza campos de redes sociales (_handle → _username)
        // y el resto de campos al formato que espera NetworkMember
        $all[] = [
            'id'                        => isset($p['id']) ? (int)$p['id'] : null,
            'path'                      => $p['path'] ?? (string)($p['id'] ?? ''),
            'refiereid'                 => $p['refiereid'] ?? null,
            'nombre'                    => $p['nombre'] ?? '',
            'codigopostal'              => $p['codigopostal'] ?? null,
            'colonia'                   => $p['colonia'] ?? null,
            'selfie_url'                => $p['selfie_url'] ?? null,
            'hash_code'                 => $p['hash_code'] ?? null,
            // Redes sociales: la API usa _handle, el frontend espera _username
            'twitter_username'          => ($p['twitter_handle']   !== null && $p['twitter_handle']   !== '')
                                            ? $p['twitter_handle']   : null,
            'instagram_username'        => ($p['instagram_handle'] !== null && $p['instagram_handle'] !== '')
                                            ? $p['instagram_handle'] : null,
            'facebook_username'         => ($p['facebook_handle']  !== null && $p['facebook_handle']  !== '')
                                            ? $p['facebook_handle']  : null,
            'tiktok_username'           => ($p['tiktok_handle']    !== null && $p['tiktok_handle']    !== '')
                                            ? $p['tiktok_handle']    : null,
            // Intereses
            'temas_mas_interesantes'    => $p['intereses_text'] ?? null,
            // Teléfono: preferir campo telefono, si no el de formulario
            'telefono'                  => $p['telefono'] ?? $p['telefonoformulario'] ?? null,
            'created_at'                => $p['created_at'] ?? null,
            // Campos demográficos
            'fechadenacimiento'         => $p['fechadenacimiento'] ?? null,
            'fecha_nacimiento'          => $p['fecha_nacimiento']  ?? null,
            'sexo'                      => $p['sexo'] ?? null,
            'profesion'                 => $p['profesion'] ?? null,
            'niveldeestudios'           => $p['niveldeestudios'] ?? null,
            'hobbies'                   => $p['hobbies'] ?? null,
            'contenidofavorito'         => $p['contenidofavorito'] ?? null,
            'redessocialesfavoritas'    => $p['redessocialesfavoritas'] ?? null,
            'tipodeparticipacionpreferida' => $p['tipodeparticipacionpreferida'] ?? null,
            'origen'                    => $p['origen'] ?? null,
            // Campos requeridos por NetworkMember que este origen no provee
            'direct_descendants_count'  => null,
            'total_descendants_count'   => null,
            'wa_message'                => null,
        ];
    }

    $offset += $PAGE_SIZE;

} while (count($rows) === $PAGE_SIZE);

echo json_encode($all, JSON_UNESCAPED_UNICODE);
