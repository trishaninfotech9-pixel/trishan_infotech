<?php
require __DIR__ . '/class/Database.class.php';

try {
  Database::conn()->query('SELECT 1');
  Database::json(['ok' => true, 'db' => 'connected']);
} catch (PDOException $e) {
  Database::json(['ok' => false, 'error' => 'DB connection failed: ' . $e->getMessage()], 500);
}
