<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
dbcon::requireAdmin();
dbcon::requireCsrf();
// Target user the admin wants to delete (identity comes from the session above).
$user_id = (int)($in['user_id'] ?? 0);
if ($user_id <= 0) dbcon::json(['ok' => false, 'error' => 'User not found.'], 404);

try {
  $u = (new user());
  if (!$u->getById($user_id)) dbcon::json(['ok' => false, 'error' => 'User not found.'], 404);
  $u->deleteUser($user_id);
  dbcon::json(['ok' => true, 'message' => 'User deleted everywhere.']);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
