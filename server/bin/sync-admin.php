<?php
declare(strict_types=1);

use Kakeizu\App;

require dirname(__DIR__) . '/bootstrap.php';
App::boot();
App::migrate();
App::syncAdmin();
fwrite(STDOUT, "Administrator credentials synchronized.\n");
