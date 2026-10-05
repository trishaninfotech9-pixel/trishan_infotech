<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('GET');
dbcon::requireAdmin();

try {
  $users = (new user())->listUsers();
  dbcon::json(['ok' => true, 'users' => $users]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
