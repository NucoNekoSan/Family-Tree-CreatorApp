<?php
declare(strict_types=1);

const BASE_URL = 'http://127.0.0.1:18080/test/api';
const ORIGIN = 'http://127.0.0.1:18080';

function request(string $method, string $path, ?array $body = null, array $headers = []): array
{
    $content = $body === null ? '' : (string)json_encode($body, JSON_UNESCAPED_UNICODE);
    $allHeaders = array_merge(['Accept: application/json'], $headers);
    $hasContentType = (bool)array_filter($allHeaders, fn(string $header): bool => stripos($header, 'Content-Type:') === 0);
    if ($body !== null && !$hasContentType) $allHeaders[] = 'Content-Type: application/json';
    $context = stream_context_create(['http' => [
        'method' => $method,
        'header' => implode("\r\n", $allHeaders),
        'content' => $content,
        'ignore_errors' => true,
        'timeout' => 5,
    ]]);
    $raw = file_get_contents(BASE_URL . $path, false, $context);
    $responseHeaders = $http_response_header ?? [];
    preg_match('/\s(\d{3})\s/', $responseHeaders[0] ?? '', $match);
    return [(int)($match[1] ?? 0), json_decode((string)$raw, true), $responseHeaders];
}

function expect(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}

function cookieFrom(array $headers): string
{
    foreach ($headers as $header) {
        if (stripos($header, 'Set-Cookie: kakeizu_session=') === 0) {
            preg_match('/kakeizu_session=([^;]+)/', $header, $match);
            return 'Cookie: kakeizu_session=' . ($match[1] ?? '');
        }
    }
    return '';
}

[$status, $json] = request('POST', '/auth/register', [], ['Origin: ' . ORIGIN]);
expect($status === 404 && ($json['error']['code'] ?? '') === 'NOT_FOUND', 'Registration endpoint must be disabled.');

[$status] = request('POST', '/auth/login', ['loginId' => 'admin', 'password' => 'wrong'], ['Origin: ' . ORIGIN]);
expect($status === 401, 'Invalid login must return 401; got ' . $status . ' ' . json_encode($json));

[$status, $json, $headers] = request('POST', '/auth/login', ['loginId' => 'admin', 'password' => 'test-password'], ['Origin: ' . ORIGIN]);
expect($status === 200, 'Valid login must succeed.');
$cookie = cookieFrom($headers);
expect($cookie !== '', 'Session cookie must be issued.');
expect((bool)array_filter($headers, fn(string $h): bool => stripos($h, 'Set-Cookie:') === 0 && stripos($h, 'HttpOnly') !== false && stripos($h, 'SameSite=Lax') !== false), 'Cookie must be HttpOnly and SameSite=Lax.');
$csrf = (string)($json['data']['csrfToken'] ?? '');
expect($csrf !== '', 'CSRF token must be returned after login.');

[$status] = request('POST', '/charts', ['title' => 'security'], ['Origin: https://attacker.invalid', $cookie, 'X-CSRF-Token: ' . $csrf]);
expect($status === 403, 'Foreign Origin must be rejected.');

[$status] = request('POST', '/charts', ['title' => 'security'], ['Origin: ' . ORIGIN, $cookie]);
expect($status === 419, 'Missing CSRF token must be rejected.');

[$status] = request('POST', '/charts', ['title' => 'security'], ['Origin: ' . ORIGIN, $cookie, 'X-CSRF-Token: ' . $csrf]);
expect($status === 201, 'Authenticated same-origin request with CSRF token must succeed.');

[$status] = request('POST', '/auth/login', [], ['Origin: ' . ORIGIN, 'Content-Type: text/plain']);
expect($status === 415, 'Non-JSON request body must be rejected.');

for ($i = 0; $i < 6; $i++) {
    [$status] = request('POST', '/auth/login', ['loginId' => 'admin', 'password' => 'test-password'], ['Origin: ' . ORIGIN]);
    expect($status === 200, 'Repeated valid login must succeed.');
}

$db = new PDO('sqlite:' . (getenv('DB_PATH') ?: '/tmp/kakeizu-security.sqlite'));
$count = (int)$db->query("SELECT COUNT(*) FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.login_id='admin'")->fetchColumn();
expect($count <= 5, 'Concurrent sessions must be capped at five.');

echo "HTTP security smoke test passed.\n";
