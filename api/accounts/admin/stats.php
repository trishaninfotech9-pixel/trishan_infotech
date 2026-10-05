<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('GET');
dbcon::requireAdmin();

try {
  dbcon::json(['ok' => true, 'stats' => (new project())->stats()]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
