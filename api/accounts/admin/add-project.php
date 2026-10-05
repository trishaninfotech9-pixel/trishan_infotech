<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
dbcon::requireAdmin();
dbcon::requireCsrf();
try {
  // Target user comes from the body; identity comes from the session above.
  $account = dbcon::userRow((int)($in['user_id'] ?? 0));
  if (!$account) dbcon::json(['ok' => false, 'error' => 'User not found.'], 404);
  dbcon::json(['ok' => true, 'message' => 'Project added.', 'project_id' => (new project())->createValidated($in, $account)]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
