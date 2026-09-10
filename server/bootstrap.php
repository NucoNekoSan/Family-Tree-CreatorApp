<?php
declare(strict_types=1);
$composer = __DIR__ . '/vendor/autoload.php';
if (is_file($composer)) {
    require $composer;
} else {
    require __DIR__ . '/src/App.php';
}
