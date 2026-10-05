<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
$admin_id = dbcon::requireAdmin();
dbcon::requireCsrf();
$complaint_id = (int)($in['complaint_id'] ?? 0);
$response = trim((string)($in['response'] ?? ''));
if ($complaint_id <= 0) dbcon::json(['ok' => false, 'error' => 'Complaint not found.'], 404);
if ($response === '' || strlen($response) > 5000) dbcon::json(['ok' => false, 'error' => 'Response is required (max 5000 chars).'], 400);

try {
  $c = new complaint();
  $row = $c->mustExist($complaint_id);
  $rid = $c->reply($complaint_id, $row['username'], $admin_id, $response);
  dbcon::json(['ok' => true, 'message' => 'Response sent.', 'response_id' => $rid]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
