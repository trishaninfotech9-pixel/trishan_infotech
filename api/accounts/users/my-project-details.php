<?php
require dirname(__DIR__, 2) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$user_id = (int)($_GET['user_id'] ?? 0);
$project = trim((string)($_GET['project'] ?? ''));
if ($user_id <= 0) json(['ok' => false, 'error' => 'Login required.'], 401);
if ($project === '') json(['ok' => false, 'error' => 'Project required.'], 400);

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id, username, email, phone_no, project_name, project_details, budget, created_at FROM project_details WHERE user_id = ? AND LOWER(project_name) = LOWER(?) LIMIT 1');
  $stmt->execute([$user_id, $project]);
  $row = $stmt->fetch();
  if ($row) {
    $st = $pdo->prepare('SELECT is_complete FROM projects WHERE user_id = ? AND LOWER(project_name) = LOWER(?) LIMIT 1');
    $st->execute([$user_id, $project]);
    $pr = $st->fetch();
    $row['status'] = ($pr && (int)$pr['is_complete'] === 1) ? 'complete' : 'pending';
  }
  json(['ok' => true, 'details' => $row ?: null]);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
