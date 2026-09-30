<?php
require dirname(__DIR__, 2) . '/class/Database.class.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  Database::json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$admin_id = (int)($in['admin_id'] ?? 0);
$complaint_id = (int)($in['complaint_id'] ?? 0);
if ($admin_id <= 0) Database::json(['ok' => false, 'error' => 'Admin login required.'], 401);
if ($complaint_id <= 0) Database::json(['ok' => false, 'error' => 'Complaint not found.'], 404);

try {
  $pdo = Database::conn();
  $stmt = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
  $stmt->execute([$admin_id]);
  if (!$stmt->fetch()) Database::json(['ok' => false, 'error' => 'Admin not found.'], 401);

  $stmt = $pdo->prepare('UPDATE complaints SET seen_admin = 1 WHERE id = ?');
  $stmt->execute([$complaint_id]);
  Database::json(['ok' => true, 'message' => 'Marked as seen.']);
} catch (PDOException $e) {
  Database::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
