<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('GET');
dbcon::requireAdmin();
// Target user the admin wants to manage (identity comes from the session above).
$user_id = (int)($_GET['user_id'] ?? 0);
if ($user_id <= 0) dbcon::json(['ok' => false, 'error' => 'Select a user first.'], 400);
try {
  $account = dbcon::userRow($user_id);
  if (!$account) dbcon::json(['ok' => false, 'error' => 'User not found.'], 404);
  dbcon::json(['ok' => true, 'projects' => (new project())->forAdmin($user_id, dbcon::fullName($account))]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
