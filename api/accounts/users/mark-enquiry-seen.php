<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$user_id = dbcon::requireUser();
dbcon::requireCsrf();
try {
  dbcon::json(['ok' => true, 'marked' => (new enquiry())->markUserSeen($user_id)]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
