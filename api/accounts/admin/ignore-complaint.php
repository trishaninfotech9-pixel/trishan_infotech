<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
dbcon::requireAdmin();
dbcon::requireCsrf();
$complaint_id = (int)($in['complaint_id'] ?? 0);
$ignored = isset($in['ignored']) ? (int)((bool)$in['ignored']) : 1;
if ($complaint_id <= 0) dbcon::json(['ok' => false, 'error' => 'Complaint not found.'], 404);

try {
  (new complaint())->setIgnored($complaint_id, $ignored);
  dbcon::json(['ok' => true, 'message' => $ignored ? 'Complaint ignored.' : 'Complaint restored.']);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
