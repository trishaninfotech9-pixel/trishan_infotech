<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
dbcon::requireAdmin();
dbcon::requireCsrf();
// Target user/project the admin wants to flag (identity comes from the session above).
$user_id = (int)($in['user_id'] ?? 0);
$project = trim((string)($in['project_name'] ?? ''));
$process = isset($in['process']) ? (int)((bool)$in['process']) : 1;
if ($user_id <= 0 || $project === '') dbcon::json(['ok' => false, 'error' => 'Project not found.'], 404);

try {
  $account = dbcon::userRow($user_id);
  if (!$account) dbcon::json(['ok' => false, 'error' => 'User not found.'], 404);
  (new project())->setFlag($user_id, dbcon::fullName($account), $project, 'process', (bool)$process);
  dbcon::json(['ok' => true, 'message' => $process ? 'Marked as work under process.' : 'Removed from work under process.', 'process' => $process]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
