<?php
require __DIR__ . '/class/autoloader.php';

try {
  dbcon::conn()->query('SELECT 1');
  dbcon::json(['ok' => true, 'db' => 'connected']);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'DB connection failed: ' . $e->getMessage()], 500);
}
