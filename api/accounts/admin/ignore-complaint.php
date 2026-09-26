<?php
require dirname(__DIR__, 2) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$admin_id = (int)($in['admin_id'] ?? 0);
$complaint_id = (int)($in['complaint_id'] ?? 0);
$ignored = isset($in['ignored']) ? (int)((bool)$in['ignored']) : 1;
if ($admin_id <= 0) json(['ok' => false, 'error' => 'Admin login required.'], 401);
if ($complaint_id <= 0) json(['ok' => false, 'error' => 'Complaint not found.'], 404);

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
  $stmt->execute([$admin_id]);
  if (!$stmt->fetch()) json(['ok' => false, 'error' => 'Admin not found.'], 401);

  $stmt = $pdo->prepare('UPDATE complaints SET is_ignored = ? WHERE id = ?');
  $stmt->execute([$ignored, $complaint_id]);
  if ($stmt->rowCount() === 0) {
    $chk = $pdo->prepare('SELECT id FROM complaints WHERE id = ? LIMIT 1');
    $chk->execute([$complaint_id]);
    if (!$chk->fetch()) json(['ok' => false, 'error' => 'Complaint not found.'], 404);
  }
  json(['ok' => true, 'message' => $ignored ? 'Complaint ignored.' : 'Complaint restored.']);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
