<?php
require dirname(__DIR__, 2) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$admin_id = (int)($in['admin_id'] ?? 0);
$complaint_id = (int)($in['complaint_id'] ?? 0);
$solved = !empty($in['solved']) ? 1 : 0;

if ($admin_id <= 0) json(['ok' => false, 'error' => 'Admin login required.'], 401);
if ($complaint_id <= 0) json(['ok' => false, 'error' => 'Complaint not found.'], 404);

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
  $stmt->execute([$admin_id]);
  if (!$stmt->fetch()) json(['ok' => false, 'error' => 'Admin not found.'], 401);

  $stmt = $pdo->prepare('SELECT id FROM complaints WHERE id = ? LIMIT 1');
  $stmt->execute([$complaint_id]);
  if (!$stmt->fetch()) json(['ok' => false, 'error' => 'Complaint not found.'], 404);

  // Guard: a complaint can only be marked solved AFTER a response was sent.
  if ($solved) {
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM complaint_responses WHERE complaint_id = ?');
    $stmt->execute([$complaint_id]);
    if ((int)$stmt->fetchColumn() === 0) {
      json(['ok' => false, 'error' => 'Please write and send a response first. Then you can mark it solved.'], 400);
    }
  }

  $stmt = $pdo->prepare('UPDATE complaints SET is_solved = ? WHERE id = ?');
  $stmt->execute([$solved, $complaint_id]);
  json(['ok' => true, 'message' => $solved ? 'Marked as solved.' : 'Moved back to new.', 'is_solved' => $solved]);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
