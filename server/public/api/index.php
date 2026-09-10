<?php
declare(strict_types=1);

use Kakeizu\App;

$root = dirname(__DIR__, 2);
require $root . '/bootstrap.php';
require $root . '/src/api_helpers.php';

App::boot();
App::migrate();
$db = App::db();
$route = rtrim(App::route(), '/') ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
App::protectRequest($method);

try {
    require $root . '/src/routes/auth.php';
    require $root . '/src/routes/charts.php';
    require $root . '/src/routes/settings.php';
    App::fail(404, 'NOT_FOUND', 'APIが見つかりません');
} catch (Throwable $error) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log($error->__toString());
    App::fail(500, 'SERVER_ERROR', 'サーバー処理に失敗しました');
}
