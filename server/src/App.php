<?php
declare(strict_types=1);
namespace Kakeizu;

use PDO;
final class App
{
    private static array $env = [];
    private static ?array $input = null;

    public static function boot(): void
    {
        self::loadEnv();
        date_default_timezone_set('UTC');
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: same-origin');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
        header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
        header('Cross-Origin-Opener-Policy: same-origin');
    }

    private static function loadEnv(): void
    {
        $path = getenv('KAKEIZU_ENV') ?: dirname(__DIR__) . '/.env';
        if (!is_file($path)) return;
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
            [$key, $value] = explode('=', $line, 2);
            self::$env[trim($key)] = trim($value, " \t\n\r\0\x0B\"'");
        }
    }

    public static function env(string $key, string $default = ''): string
    {
        return getenv($key) ?: (self::$env[$key] ?? $default);
    }

    public static function db(): PDO
    {
        static $db;
        if ($db) return $db;
        $path = self::env('DB_PATH', dirname(__DIR__, 2) . '/data/kakeizu.sqlite');
        if (!is_dir(dirname($path))) mkdir(dirname($path), 0770, true);
        $db = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $db->exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000');
        return $db;
    }

    public static function migrate(): void
    {
        $db = self::db();
        $db->exec('CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
        $files = glob(dirname(__DIR__) . '/migrations/*.sql') ?: [];
        sort($files);
        foreach ($files as $file) {
            $version = basename($file);
            $q = $db->prepare('SELECT 1 FROM schema_migrations WHERE version=?');
            $q->execute([$version]);
            if ($q->fetchColumn()) continue;
            $db->beginTransaction();
            try {
                $db->exec((string)file_get_contents($file));
                $db->prepare('INSERT OR IGNORE INTO schema_migrations(version) VALUES(?)')->execute([$version]);
                $db->commit();
            } catch (\Throwable $e) {
                if ($db->inTransaction()) $db->rollBack();
                throw $e;
            }
        }
    }

    public static function syncAdmin(): void
    {
        $db = self::db();
        $loginId = trim(self::env('ADMIN_LOGIN_ID'));
        $password = self::env('ADMIN_PASSWORD');
        if ($loginId !== '' && $password !== '') {
            $q = $db->prepare('SELECT id,password_hash,email_verified_at FROM users WHERE login_id=?');
            $q->execute([$loginId]);
            $admin = $q->fetch();
            if ($admin) {
                if (!password_verify($password, $admin['password_hash']) || !$admin['email_verified_at']) {
                    $db->prepare('UPDATE users SET password_hash=?,email_verified_at=COALESCE(email_verified_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=?')
                        ->execute([password_hash($password, PASSWORD_DEFAULT), $admin['id']]);
                }
            } else {
                $userId = self::id();
                $db->prepare('INSERT INTO users(id,email,login_id,password_hash,email_verified_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)')
                    ->execute([$userId, $loginId . '@local.invalid', $loginId, password_hash($password, PASSWORD_DEFAULT)]);
                self::seed($userId);
            }
        }
    }

    public static function id(): string { return bin2hex(random_bytes(16)); }
    public static function token(): string { return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='); }
    public static function now(string $offset = '+0 seconds'): string { return gmdate('Y-m-d H:i:s', strtotime($offset)); }

    public static function input(): array
    {
        if (self::$input !== null) return self::$input;
        $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($length > 65536) self::fail(413, 'PAYLOAD_TOO_LARGE', '送信データが大きすぎます');
        $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
        if ($length > 0 && $contentType !== 'application/json') {
            self::fail(415, 'UNSUPPORTED_MEDIA_TYPE', 'JSON形式で送信してください');
        }
        $raw = file_get_contents('php://input') ?: '{}';
        if (strlen($raw) > 65536) self::fail(413, 'PAYLOAD_TOO_LARGE', '送信データが大きすぎます');
        $data = json_decode($raw, true);
        if (!is_array($data)) self::fail(400, 'INVALID_JSON', 'JSON形式が正しくありません');
        return self::$input = $data;
    }

    public static function ok(mixed $data = null, int $status = 200, array $extra = []): never
    {
        http_response_code($status);
        echo json_encode(self::utf8(['data' => $data, 'error' => null] + $extra), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    public static function fail(int $status, string $code, string $message, array $fields = []): never
    {
        http_response_code($status);
        echo json_encode(['data' => null, 'error' => ['code' => $code, 'message' => $message, 'fields' => (object)$fields]], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    public static function validColor(mixed $value): bool
    {
        return is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value) === 1;
    }

    public static function utf8(mixed $value): mixed
    {
        if (is_array($value)) return array_map([self::class, 'utf8'], $value);
        if (!is_string($value) || mb_check_encoding($value, 'UTF-8')) return $value;
        foreach (['SJIS-win', 'EUC-JP'] as $encoding) {
            if (mb_check_encoding($value, $encoding)) return mb_convert_encoding($value, 'UTF-8', $encoding);
        }
        return mb_convert_encoding($value, 'UTF-8', 'UTF-8');
    }

    public static function route(): string
    {
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $prefix = rtrim(self::env('APP_BASE_PATH', '/'), '/') . '/api';
        return str_starts_with($uri, $prefix) ? (substr($uri, strlen($prefix)) ?: '/') : $uri;
    }

    public static function protectRequest(string $method): void
    {
        if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) return;
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $expected = self::origin(self::env('APP_URL'));
        if ($expected !== '' && !hash_equals($expected, self::origin($origin))) {
            self::fail(403, 'ORIGIN_MISMATCH', '不正な送信元です');
        }
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 65536) {
            self::fail(413, 'PAYLOAD_TOO_LARGE', '送信データが大きすぎます');
        }
    }

    private static function origin(string $url): string
    {
        $parts = parse_url($url);
        if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) return '';
        $port = isset($parts['port']) ? ':' . $parts['port'] : '';
        return strtolower($parts['scheme'] . '://' . $parts['host'] . $port);
    }

    public static function user(bool $csrf = false): array
    {
        $raw = $_COOKIE['kakeizu_session'] ?? '';
        if (!$raw) self::fail(401, 'UNAUTHENTICATED', 'ログインが必要です');
        $hash = hash('sha256', $raw);
        $q = self::db()->prepare("SELECT u.id,u.login_id,s.csrf_token,s.last_seen_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id_hash=? AND s.expires_at>CURRENT_TIMESTAMP AND COALESCE(s.last_seen_at,s.created_at)>datetime('now','-12 hours')");
        $q->execute([$hash]);
        $user = $q->fetch();
        if (!$user) {
            self::db()->prepare('DELETE FROM sessions WHERE id_hash=?')->execute([$hash]);
            self::setSessionCookie('', time() - 3600);
            self::fail(401, 'SESSION_EXPIRED', 'セッションの有効期限が切れました');
        }
        if ($csrf && !hash_equals($user['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
            self::fail(419, 'CSRF_MISMATCH', '画面を再読み込みしてから再度お試しください');
        }
        if (strtotime((string)$user['last_seen_at']) < time() - 300) {
            self::db()->prepare('UPDATE sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id_hash=?')->execute([$hash]);
        }
        return $user;
    }

    public static function setSessionCookie(string $token, int $expires): void
    {
        $secure = str_starts_with(self::origin(self::env('APP_URL')), 'https://');
        if (!$secure) $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        setcookie('kakeizu_session', $token, [
            'expires' => $expires,
            'path' => self::env('APP_BASE_PATH', '/'),
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    public static function assertLoginAllowed(string $loginId, int $limit = 10): void
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $identifier = hash('sha256', strtolower(trim($loginId)));
        $db = self::db();
        $db->exec("DELETE FROM login_attempts WHERE attempted_at < datetime('now','-1 day')");
        $q = $db->prepare("SELECT COUNT(*) FROM login_attempts WHERE ip=? AND action='login' AND attempted_at>datetime('now','-15 minutes')");
        $q->execute([$ip]);
        if ((int)$q->fetchColumn() >= 50) self::fail(429, 'RATE_LIMITED', '試行回数が多すぎます。15分後にお試しください');
        $q = $db->prepare("SELECT COUNT(*) FROM login_attempts WHERE ip=? AND action='login' AND identifier_hash=? AND attempted_at>datetime('now','-15 minutes')");
        $q->execute([$ip, $identifier]);
        if ((int)$q->fetchColumn() >= $limit) self::fail(429, 'RATE_LIMITED', '試行回数が多すぎます。15分後にお試しください');
    }

    public static function recordLoginFailure(string $loginId): void
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        self::db()->prepare("INSERT INTO login_attempts(ip,action,identifier_hash) VALUES(?,'login',?)")
            ->execute([$ip, hash('sha256', strtolower(trim($loginId)))]);
    }

    public static function clearLoginFailures(string $loginId): void
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        self::db()->prepare("DELETE FROM login_attempts WHERE ip=? AND action='login' AND identifier_hash=?")
            ->execute([$ip, hash('sha256', strtolower(trim($loginId)))]);
    }

    public static function seed(string $userId): void
    {
        $db = self::db();
        $relations = [
            ['本人','self','below','solid','#52645e'], ['父','parent','above','solid','#52645e'],
            ['母','parent','above','solid','#52645e'], ['兄','other','left','solid','#52645e'],
            ['姉','other','left','solid','#52645e'], ['弟','other','right','solid','#52645e'],
            ['妹','other','right','solid','#52645e'], ['配偶者','partner','right','solid','#9b7440'],
            ['子','child','below','solid','#52645e'], ['離婚','partner','right','solid','#9b7440'],
        ];
        $q = $db->prepare('INSERT INTO relationship_definitions(id,user_id,name,kind,direction,line_style,line_color,sort_order) VALUES(?,?,?,?,?,?,?,?)');
        foreach ($relations as $i => $r) $q->execute([self::id(), $userId, ...$r, $i]);
        $db->prepare("UPDATE relationship_definitions SET diagram_role='sibling' WHERE user_id=? AND name IN('兄','姉','弟','妹')")->execute([$userId]);
        $db->prepare("UPDATE relationship_definitions SET diagram_role='divorce' WHERE user_id=? AND name='離婚'")->execute([$userId]);
        $genders = [['男性','square','#6f94a6','#ffffff'],['女性','circle','#d8785b','#ffffff'],['その他','diamond','#c99b54','#ffffff']];
        $q = $db->prepare('INSERT INTO gender_definitions(id,user_id,name,shape,fill_color,text_color,sort_order) VALUES(?,?,?,?,?,?,?)');
        foreach ($genders as $i => $g) $q->execute([self::id(), $userId, ...$g, $i]);
    }
}
