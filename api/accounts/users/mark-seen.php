<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$user_id = dbcon::requireUser();
dbcon::requireCsrf();

try {
  $marked = (new user())->markSeen($user_id);
  dbcon::json(['ok' => true, 'marked' => $marked]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
