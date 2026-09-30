<?php
require dirname(__DIR__, 2) . '/class/Database.class.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  Database::json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$user_id = (int)($_GET['user_id'] ?? 0);
if ($user_id <= 0) Database::json(['ok' => false, 'error' => 'Login required.'], 401);

try {
  $pdo = Database::conn();
  $stmt = $pdo->prepare('SELECT id, first_name, middle_name, last_name, email, phone, status_seen_at FROM users WHERE id = ? LIMIT 1');
  $stmt->execute([$user_id]);
  $account = $stmt->fetch();
  if (!$account) Database::json(['ok' => false, 'error' => 'User not found.'], 401);
  $uname = trim(implode(' ', array_filter([$account['first_name'], $account['middle_name'], $account['last_name']])));

  $stmt = $pdo->prepare('SELECT id, project_name, details, is_complete, is_under_process, status_updated_at, created_at FROM projects WHERE user_id = ? ORDER BY id DESC');
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

  // Budget per project name from project_details snapshots.
  $stmt = $pdo->prepare('SELECT project_name, budget FROM project_details WHERE user_id = ?');
  $stmt->execute([$user_id]);
  $budgets = [];
  foreach ($stmt->fetchAll() as $row) { $budgets[strtolower(trim($row['project_name']))] = $row['budget']; }

  // project_details row id per project name (for the ID column).
  $stmt = $pdo->prepare('SELECT id, project_name FROM project_details WHERE user_id = ?');
  $stmt->execute([$user_id]);
  $pdIds = [];
  foreach ($stmt->fetchAll() as $row) { $pdIds[strtolower(trim($row['project_name']))] = $row['id']; }

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
    $p['budget'] = $budgets[$key] ?? null;
    $p['pd_id'] = $pdIds[$key] ?? null;
    $p['username'] = $uname;
    $p['email'] = $account['email'];
    $p['phone_no'] = $account['phone'];
    $p['status'] = ((int)($p['is_complete'] ?? 0) === 1) ? 'complete' : (((int)($p['is_under_process'] ?? 0) === 1) ? 'process' : 'pending');
  }
  unset($p);
  foreach ($fromComplaints as $c) {
    $key = strtolower(trim($c['project_name']));
    if ($key === '' || isset($seen[$key])) continue;
    $seen[$key] = true;
    $assigned[] = ['id' => 0, 'pd_id' => $pdIds[$key] ?? null, 'username' => $uname, 'email' => $account['email'], 'phone_no' => $account['phone'], 'project_name' => $c['project_name'], 'details' => $issueDetails[$key] ?? '', 'budget' => $budgets[$key] ?? null, 'created_at' => $c['created_at'], 'source' => 'complaint', 'status' => 'pending'];
  }
  Database::json(['ok' => true, 'projects' => $assigned, 'status_seen_at' => $account['status_seen_at']]);
} catch (PDOException $e) {
  Database::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
