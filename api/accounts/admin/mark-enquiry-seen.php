<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
dbcon::requireAdmin();
dbcon::requireCsrf();
$id = (int)($in['enquiry_id'] ?? $in['id'] ?? 0);
if ($id <= 0) dbcon::json(['ok' => false, 'error' => 'Enquiry not found.'], 404);
try {
  (new enquiry())->markSeen($id);
  dbcon::json(['ok' => true, 'message' => 'Marked as seen.']);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
