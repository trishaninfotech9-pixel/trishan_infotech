<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
dbcon::requireAdmin();
dbcon::requireCsrf();
$complaint_id = (int)($in['complaint_id'] ?? 0);
$solved = !empty($in['solved']) ? 1 : 0;
if ($complaint_id <= 0) dbcon::json(['ok' => false, 'error' => 'Complaint not found.'], 404);

try {
  $c = new complaint();
  $c->mustExist($complaint_id);
  $c->setSolved($complaint_id, $solved);
  dbcon::json(['ok' => true, 'message' => $solved ? 'Marked as solved.' : 'Moved back to new.', 'is_solved' => $solved]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
