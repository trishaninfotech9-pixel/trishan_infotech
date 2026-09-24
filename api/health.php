<?php
require __DIR__ . '/db.php';

try {
  db()->query('SELECT 1');
  json(['ok' => true, 'db' => 'connected']);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'DB connection failed: ' . $e->getMessage()], 500);
}
