<?php
require dirname(__DIR__, 2) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$admin_id = (int)($in['admin_id'] ?? 0);
$project_id = (int)($in['project_id'] ?? 0);
$user_id = (int)($in['user_id'] ?? 0);
$project_name = trim((string)($in['project_name'] ?? ''));
if ($admin_id <= 0) json(['ok' => false, 'error' => 'Admin login required.'], 401);

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
  $stmt->execute([$admin_id]);
  if (!$stmt->fetch()) json(['ok' => false, 'error' => 'Admin not found.'], 401);

  if ($project_id > 0) {
    $stmt = $pdo->prepare('DELETE FROM projects WHERE id = ?');
    $stmt->execute([$project_id]);
    if ($stmt->rowCount() === 0) json(['ok' => false, 'error' => 'Project not found.'], 404);
    json(['ok' => true, 'message' => 'Project deleted.']);
  }

  // Complaint-sourced project: delete matching complaint(s) + their issues/responses.
  if ($user_id <= 0 || $project_name === '') json(['ok' => false, 'error' => 'Project not found.'], 404);
  $stmt = $pdo->prepare('DELETE FROM complaints WHERE user_id = ? AND project_name = ?');
  $stmt->execute([$user_id, $project_name]);
  if ($stmt->rowCount() === 0) json(['ok' => false, 'error' => 'Project not found.'], 404);
  json(['ok' => true, 'message' => 'Project and its complaints deleted.']);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
