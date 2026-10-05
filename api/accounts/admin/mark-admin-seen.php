<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
dbcon::requireAdmin();
dbcon::requireCsrf();
$complaint_id = (int)($in['complaint_id'] ?? 0);
if ($complaint_id <= 0) dbcon::json(['ok' => false, 'error' => 'Complaint not found.'], 404);

try {
  (new complaint())->markAdminSeen($complaint_id);
  dbcon::json(['ok' => true, 'message' => 'Marked as seen.']);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
