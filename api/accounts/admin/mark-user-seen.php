<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
dbcon::requireAdmin();
dbcon::requireCsrf();
$id = (int)($in['user_id'] ?? $in['id'] ?? 0);
if ($id <= 0) dbcon::json(['ok' => false, 'error' => 'User not found.'], 404);
try {
  (new user())->markSignupSeen($id);
  dbcon::json(['ok' => true, 'message' => 'Marked as seen.']);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
