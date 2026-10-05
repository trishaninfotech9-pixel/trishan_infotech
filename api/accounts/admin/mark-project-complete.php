<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
dbcon::requireAdmin();
dbcon::requireCsrf();
// Target user/project the admin wants to flag (identity comes from the session above).
$user_id = (int)($in['user_id'] ?? 0);
$project = trim((string)($in['project_name'] ?? ''));
$complete = isset($in['complete']) ? (int)((bool)$in['complete']) : 1;
if ($user_id <= 0 || $project === '') dbcon::json(['ok' => false, 'error' => 'Project not found.'], 404);

try {
  $account = dbcon::userRow($user_id);
  if (!$account) dbcon::json(['ok' => false, 'error' => 'User not found.'], 404);
  (new project())->setFlag($user_id, dbcon::fullName($account), $project, 'complete', (bool)$complete);
  dbcon::json(['ok' => true, 'message' => $complete ? 'Marked as complete.' : 'Moved back to pending.', 'complete' => $complete]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
