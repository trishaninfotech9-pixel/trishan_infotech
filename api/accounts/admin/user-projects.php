<?php
require dirname(__DIR__, 2) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$admin_id = (int)($_GET['admin_id'] ?? 0);
$user_id = (int)($_GET['user_id'] ?? 0);
if ($admin_id <= 0) json(['ok' => false, 'error' => 'Admin login required.'], 401);
if ($user_id <= 0) json(['ok' => false, 'error' => 'Select a user first.'], 400);

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
  $stmt->execute([$admin_id]);
  if (!$stmt->fetch()) json(['ok' => false, 'error' => 'Admin not found.'], 401);

  $stmt = $pdo->prepare('SELECT id, project_name, details, created_at FROM projects WHERE user_id = ? ORDER BY id DESC');
  $stmt->execute([$user_id]);
  $assigned = $stmt->fetchAll();

  // Plus distinct project names from the user's complaints.
  $stmt = $pdo->prepare('SELECT project_name, MIN(created_at) AS created_at FROM complaints WHERE user_id = ? GROUP BY project_name ORDER BY created_at DESC');
  $stmt->execute([$user_id]);
  $fromComplaints = $stmt->fetchAll();

  // Latest complaint issue text per project name, used as details fallback.
  $stmt = $pdo->prepare('SELECT c.project_name, i.description FROM complaint_issues i JOIN complaints c ON c.id = i.complaint_id WHERE c.user_id = ? ORDER BY i.id DESC');
  $stmt->execute([$user_id]);
  $issueDetails = [];
  foreach ($stmt->fetchAll() as $row) {
    $key = strtolower(trim($row['project_name']));
    if (!isset($issueDetails[$key])) $issueDetails[$key] = $row['description'];
  }

  // Names with at least one unreplied complaint count as open.
  $stmt = $pdo->prepare('SELECT DISTINCT LOWER(TRIM(project_name)) AS nm FROM complaints c WHERE c.user_id = ? AND NOT EXISTS (SELECT 1 FROM complaint_responses r WHERE r.complaint_id = c.id)');
  $stmt->execute([$user_id]);
  $openNames = [];
  foreach ($stmt->fetchAll() as $row) { $openNames[$row['nm']] = true; }

  $seen = [];
  foreach ($assigned as &$p) {
    $p['source'] = 'assigned';
    $key = strtolower(trim($p['project_name']));
    $seen[$key] = true;
    $p['open'] = isset($openNames[$key]);
  }
  unset($p);
  foreach ($fromComplaints as $c) {
    $key = strtolower(trim($c['project_name']));
    if ($key === '' || isset($seen[$key])) continue;
    $seen[$key] = true;
    $assigned[] = ['id' => 0, 'project_name' => $c['project_name'], 'details' => $issueDetails[$key] ?? '', 'created_at' => $c['created_at'], 'source' => 'complaint', 'open' => isset($openNames[$key])];
  }
  json(['ok' => true, 'projects' => $assigned]);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
