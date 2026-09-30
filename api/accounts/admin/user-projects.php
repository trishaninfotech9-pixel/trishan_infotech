<?php
require dirname(__DIR__, 2) . '/class/Database.class.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  Database::json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$admin_id = (int)($_GET['admin_id'] ?? 0);
$user_id = (int)($_GET['user_id'] ?? 0);
if ($admin_id <= 0) Database::json(['ok' => false, 'error' => 'Admin login required.'], 401);
if ($user_id <= 0) Database::json(['ok' => false, 'error' => 'Select a user first.'], 400);

try {
  $pdo = Database::conn();
  $stmt = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
  $stmt->execute([$admin_id]);
  if (!$stmt->fetch()) Database::json(['ok' => false, 'error' => 'Admin not found.'], 401);

  $stmt = $pdo->prepare('SELECT id, first_name, middle_name, last_name FROM users WHERE id = ? LIMIT 1');
  $stmt->execute([$user_id]);
  $account = $stmt->fetch();
  if (!$account) Database::json(['ok' => false, 'error' => 'User not found.'], 404);
  $uname = trim(implode(' ', array_filter([$account['first_name'], $account['middle_name'], $account['last_name']])));

  $stmt = $pdo->prepare('SELECT id, project_name, details, is_complete, is_under_process, created_at FROM projects WHERE user_id = ? ORDER BY id DESC');
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

  // Budget per project name from project_details snapshots.
  $stmt = $pdo->prepare('SELECT project_name, budget FROM project_details WHERE user_id = ?');
  $stmt->execute([$user_id]);
  $budgets = [];
  foreach ($stmt->fetchAll() as $row) { $budgets[strtolower(trim($row['project_name']))] = $row['budget']; }

  // Full project_details snapshot per project name (for card details).
  $stmt = $pdo->prepare('SELECT * FROM project_details WHERE user_id = ?');
  $stmt->execute([$user_id]);
  $pdMap = [];
  foreach ($stmt->fetchAll() as $row) { $pdMap[strtolower(trim($row['project_name']))] = $row; }
  foreach ($assigned as &$p) {
    $p['pd'] = $pdMap[strtolower(trim($p['project_name']))] ?? null;
  }
  unset($p);
  $seen = [];
  foreach ($assigned as &$p) {
    $p['source'] = 'assigned';
    $key = strtolower(trim($p['project_name']));
    $seen[$key] = true;
    $p['open'] = isset($openNames[$key]);
    $p['budget'] = $budgets[$key] ?? null;
    $p['username'] = $uname;
  }
  unset($p);
  foreach ($fromComplaints as $c) {
    $key = strtolower(trim($c['project_name']));
    if ($key === '' || isset($seen[$key])) continue;
    $seen[$key] = true;
    $assigned[] = ['id' => 0, 'project_name' => $c['project_name'], 'details' => $issueDetails[$key] ?? '', 'budget' => $budgets[$key] ?? null, 'username' => $uname, 'created_at' => $c['created_at'], 'source' => 'complaint', 'status' => 'pending', 'open' => isset($openNames[$key])];
  }
  // Status is driven ONLY by the admin checkboxes (projects.is_complete / is_under_process).
  foreach ($assigned as &$p) {
    $p['status'] = ((int)($p['is_complete'] ?? 0) === 1) ? 'complete' : (((int)($p['is_under_process'] ?? 0) === 1) ? 'process' : 'pending');
  }
  unset($p);
  // Latest complaint per project name → deep link to the section it belongs to.
  $stmt = $pdo->prepare('SELECT c.id, c.project_name, c.is_solved, c.is_ignored, EXISTS(SELECT 1 FROM complaint_responses r WHERE r.complaint_id = c.id) AS has_resp FROM complaints c WHERE c.user_id = ? ORDER BY c.id DESC');
  $stmt->execute([$user_id]);
  $linkMap = [];
  foreach ($stmt->fetchAll() as $row) {
    $key = strtolower(trim($row['project_name']));
    if (isset($linkMap[$key])) continue;
    if ((int)$row['is_ignored'] === 1) $sec = 'all_ignore_complaint';
    elseif ((int)$row['is_solved'] === 1) $sec = 'all_sloved_complaint';
    elseif (!(int)$row['has_resp']) $sec = 'all_pending_complaint';
    else $sec = 'all_complaint';
    $linkMap[$key] = ['complaint_id' => (int)$row['id'], 'page' => $sec];
  }
  foreach ($assigned as &$p) {
    $key = strtolower(trim($p['project_name']));
    $p['complaint_id'] = $linkMap[$key]['complaint_id'] ?? 0;
    $p['page'] = $linkMap[$key]['page'] ?? '';
  }
  unset($p);
  Database::json(['ok' => true, 'projects' => $assigned]);
} catch (PDOException $e) {
  Database::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
