<?php
/**
 * Proxy de media de Twilio para que las fotos registradas en reportes
 * puedan mostrarse en el dashboard sin exponer Basic Auth en el frontend.
 */
$mediaUrl = $_GET['url'] ?? '';
if (!is_string($mediaUrl) || $mediaUrl === '') {
    http_response_code(400);
    echo 'Missing url';
    exit;
}

$parts = parse_url($mediaUrl);
$allowedHosts = ['api.twilio.com', 'mcs.us1.twilio.com', 'mcs.us2.twilio.com'];
if (!$parts || !isset($parts['scheme'], $parts['host']) || $parts['scheme'] !== 'https' || !in_array($parts['host'], $allowedHosts, true)) {
    http_response_code(400);
    echo 'Invalid media url';
    exit;
}

$accountSid = getenv('TWILIO_ACCOUNT_SID');
$authToken  = getenv('TWILIO_AUTH_TOKEN');

$ch = curl_init($mediaUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 3,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_USERPWD => $accountSid . ':' . $authToken,
    CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
    CURLOPT_HEADER => false,
]);

$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'application/octet-stream';
$error = curl_error($ch);
curl_close($ch);

if ($body === false || $status < 200 || $status >= 300) {
    http_response_code($status >= 400 ? $status : 502);
    echo $error ?: 'Error loading media';
    exit;
}

header('Content-Type: ' . $contentType);
header('Cache-Control: private, max-age=300');
echo $body;
