<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
$admin_id = dbcon::requireAdmin();
dbcon::requireCsrf();
$enquiry_id = (int)($in['enquiry_id'] ?? $in['id'] ?? 0);
$response = trim((string)($in['response'] ?? ''));
if ($enquiry_id <= 0) dbcon::json(['ok' => false, 'error' => 'Enquiry not found.'], 404);
try {
  dbcon::json(['ok' => true, 'message' => 'Response sent.', 'response_id' => (new enquiry())->reply($enquiry_id, $admin_id, $response)]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
