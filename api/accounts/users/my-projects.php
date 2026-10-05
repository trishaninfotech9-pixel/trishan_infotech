<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('GET');
$user_id = dbcon::requireUser();

try {
  $data = (new project())->forUser($user_id);
  dbcon::json(['ok' => true, 'projects' => $data['projects'], 'status_seen_at' => $data['status_seen_at']]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
