<?php
// Same pattern as vendor/autoloader.php in reference project.
function trishan_autoloader($class) {
  $base = __DIR__;
  $directories = array_filter(glob($base . '/*', GLOB_ONLYDIR), 'is_dir');
  foreach ($directories as $dir) {
    $file = $dir . '/' . $class . '.class.php';
    if (file_exists($file)) { include_once $file; return; }
    // case-insensitive fallback (Database vs database)
    foreach (glob($dir . '/*.class.php') as $candidate) {
      if (strtolower(basename($candidate, '.class.php')) === strtolower($class)) {
        include_once $candidate; return;
      }
    }
  }
  $root = $base . '/' . $class . '.class.php';
  if (file_exists($root)) include_once $root;
}
spl_autoload_register('trishan_autoloader');
