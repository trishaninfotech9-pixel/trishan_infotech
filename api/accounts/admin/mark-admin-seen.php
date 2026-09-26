<?php
require dirname(__DIR__, 2) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$admin_id = (int)($in['admin_id'] ?? 0);
$complaint_id = (int)($in['complaint_id'] ?? 0);
if ($admin_id <= 0) json(['ok' => false, 'error' => 'Admin login required.'], 401);
if ($complaint_id <= 0) json(['ok' => false, 'error' => 'Complaint not found.'], 404);

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
  $stmt->execute([$admin_id]);
  if (!$stmt->fetch()) json(['ok' => false, 'error' => 'Admin not found.'], 401);

  $stmt = $pdo->prepare('UPDATE complaints SET seen_admin = 1 WHERE id = ?');
  $stmt->execute([$complaint_id]);
  json(['ok' => true, 'message' => 'Marked as seen.']);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
