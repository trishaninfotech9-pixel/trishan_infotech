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
  $stmt = $pdo->prepare('SELECT id, is_solved, solved_at, created_at FROM complaints WHERE user_id = ? AND LOWER(project_name) = LOWER(?) ORDER BY created_at');
  $stmt->execute([$user_id, $project]);
  $complaints = $stmt->fetchAll();
  $stmt = $pdo->prepare('SELECT event, created_at FROM project_status_log WHERE user_id = ? AND LOWER(project_name) = LOWER(?) ORDER BY created_at');
  $stmt->execute([$user_id, $project]);
  $events = $stmt->fetchAll();
  json(['ok' => true, 'complaints' => $complaints, 'events' => $events]);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
