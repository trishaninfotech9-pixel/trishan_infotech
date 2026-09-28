<?php
require dirname(__DIR__, 2) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$admin_id = (int)($in['admin_id'] ?? 0);
$user_id = (int)($in['user_id'] ?? 0);
$project = trim((string)($in['project_name'] ?? ''));
$process = isset($in['process']) ? (int)((bool)$in['process']) : 1;
if ($admin_id <= 0) json(['ok' => false, 'error' => 'Admin login required.'], 401);
if ($user_id <= 0 || $project === '') json(['ok' => false, 'error' => 'Project not found.'], 404);

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
  $stmt->execute([$admin_id]);
  if (!$stmt->fetch()) json(['ok' => false, 'error' => 'Admin not found.'], 401);
  $stmt = $pdo->prepare('SELECT id, first_name, middle_name, last_name FROM users WHERE id = ? LIMIT 1');
  $stmt->execute([$user_id]);
  $account = $stmt->fetch();
  if (!$account) json(['ok' => false, 'error' => 'User not found.'], 404);

  // Complaint-only names get adopted as assigned rows so the flag has a home.
  // Under Process and Complete are mutually exclusive: starting process clears complete.
  $username = trim(implode(' ', array_filter([$account['first_name'], $account['middle_name'], $account['last_name']])));
  if ($process) {
    $stmt = $pdo->prepare('INSERT INTO projects (user_id, username, project_name, details, is_complete, is_under_process, status_updated_at) VALUES (?, ?, ?, ?, 0, 1, NOW()) ON DUPLICATE KEY UPDATE is_under_process = 1, is_complete = 0, status_updated_at = NOW()');
    $stmt->execute([$user_id, $username, $project, '']);
  } else {
    $stmt = $pdo->prepare('INSERT INTO projects (user_id, username, project_name, details, is_complete, is_under_process, status_updated_at) VALUES (?, ?, ?, ?, 0, 0, NOW()) ON DUPLICATE KEY UPDATE is_under_process = 0, status_updated_at = NOW()');
    $stmt->execute([$user_id, $username, $project, '']);
  }
  json(['ok' => true, 'message' => $process ? 'Marked as work under process.' : 'Removed from work under process.', 'process' => $process]);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
