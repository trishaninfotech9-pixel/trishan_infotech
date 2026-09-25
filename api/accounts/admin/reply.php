<?php
require dirname(__DIR__, 2) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$admin_id = (int)($in['admin_id'] ?? 0);
$complaint_id = (int)($in['complaint_id'] ?? 0);
$response = trim((string)($in['response'] ?? ''));

if ($admin_id <= 0) json(['ok' => false, 'error' => 'Admin login required.'], 401);
if ($complaint_id <= 0) json(['ok' => false, 'error' => 'Complaint not found.'], 404);
if ($response === '' || strlen($response) > 5000) json(['ok' => false, 'error' => 'Response is required (max 5000 chars).'], 400);

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
  $stmt->execute([$admin_id]);
  if (!$stmt->fetch()) json(['ok' => false, 'error' => 'Admin not found.'], 401);
  $stmt = $pdo->prepare('SELECT id, username FROM complaints WHERE id = ? LIMIT 1');
  $stmt->execute([$complaint_id]);
  $complaint = $stmt->fetch();
  if (!$complaint) json(['ok' => false, 'error' => 'Complaint not found.'], 404);

  $stmt = $pdo->prepare('INSERT INTO complaint_responses (complaint_id, username, admin_id, response) VALUES (?, ?, ?, ?)');
  $stmt->execute([$complaint_id, $complaint['username'], $admin_id, $response]);
  json(['ok' => true, 'message' => 'Response sent.', 'response_id' => (int)$pdo->lastInsertId()]);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
