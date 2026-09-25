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
$details = trim((string)($in['details'] ?? ''));

if ($admin_id <= 0) json(['ok' => false, 'error' => 'Admin login required.'], 401);
if ($user_id <= 0) json(['ok' => false, 'error' => 'Select a user first.'], 400);
if ($project === '' || strlen($project) > 150) json(['ok' => false, 'error' => 'Project name is required (max 150 chars).'], 400);
if (strlen($details) > 2000) json(['ok' => false, 'error' => 'Details too long (max 2000 chars).'], 400);

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
  $stmt->execute([$admin_id]);
  if (!$stmt->fetch()) json(['ok' => false, 'error' => 'Admin not found.'], 401);
  $stmt = $pdo->prepare('SELECT id, first_name, middle_name, last_name FROM users WHERE id = ? LIMIT 1');
  $stmt->execute([$user_id]);
  $account = $stmt->fetch();
  if (!$account) json(['ok' => false, 'error' => 'User not found.'], 404);
  $username = trim(implode(' ', array_filter([$account['first_name'], $account['middle_name'], $account['last_name']])));

  try {
    $stmt = $pdo->prepare('INSERT INTO projects (user_id, username, project_name, details) VALUES (?, ?, ?, ?)');
    $stmt->execute([$user_id, $username, $project, $details]);
  } catch (PDOException $e) {
    if ($e->getCode() === '23000') json(['ok' => false, 'error' => 'This project already exists for the user.'], 409);
    throw $e;
  }
  json(['ok' => true, 'message' => 'Project added.', 'project_id' => (int)$pdo->lastInsertId()]);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
