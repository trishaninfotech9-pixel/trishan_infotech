<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
dbcon::requireAdmin();
dbcon::requireCsrf();
$project_id = (int)($in['project_id'] ?? 0);
// Target user/project the admin wants to delete (identity comes from the session above).
$user_id = (int)($in['user_id'] ?? 0);
$project_name = trim((string)($in['project_name'] ?? ''));

try {
  $p = new project();
  if ($project_id > 0) {
    $p->deleteById($project_id);
    dbcon::json(['ok' => true, 'message' => 'Project deleted.']);
  }
  if ($user_id <= 0 || $project_name === '') dbcon::json(['ok' => false, 'error' => 'Project not found.'], 404);
  $p->deleteComplaintProject($user_id, $project_name);
  dbcon::json(['ok' => true, 'message' => 'Project and its complaints deleted.']);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
