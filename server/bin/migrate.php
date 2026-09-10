<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
use Kakeizu\App;
App::boot();
App::migrate();
echo "Database is up to date.\n";
