<?php
declare(strict_types=1);

use Kakeizu\App;

$database = sys_get_temp_dir() . '/kakeizu-' . bin2hex(random_bytes(6)) . '.sqlite';
putenv('DB_PATH=' . $database);
putenv('ADMIN_LOGIN_ID=test-admin');
putenv('ADMIN_PASSWORD=test-password-12345');
require dirname(__DIR__) . '/bootstrap.php';

try {
    App::boot();
    App::migrate();
    $db = App::db();
    $versions = (int) $db->query('SELECT COUNT(*) FROM schema_migrations')->fetchColumn();
    $columnInfo = $db->query('PRAGMA table_info(chart_nodes)')->fetchAll();
    $columns = array_column($columnInfo, 'name');
    $relationshipFont = array_values(array_filter($columnInfo, fn($column) => $column['name'] === 'relationship_font_size'))[0] ?? null;
    if ($versions !== 8 || !in_array('divorced', $columns, true) || !in_array('scale', $columns, true) || ($relationshipFont['dflt_value'] ?? null) !== '17') {
        throw new RuntimeException('Migration verification failed');
    }
    $sessionColumns = array_column($db->query('PRAGMA table_info(sessions)')->fetchAll(), 'name');
    $attemptColumns = array_column($db->query('PRAGMA table_info(login_attempts)')->fetchAll(), 'name');
    if (!in_array('last_seen_at', $sessionColumns, true) || !in_array('identifier_hash', $attemptColumns, true)) {
        throw new RuntimeException('Authentication migration verification failed');
    }
    echo "Migration smoke test passed.\n";
} finally {
    foreach ([$database, $database . '-shm', $database . '-wal'] as $file) {
        if (is_file($file)) unlink($file);
    }
}
