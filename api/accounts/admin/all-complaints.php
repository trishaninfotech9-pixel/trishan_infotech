<?php
require dirname(__DIR__, 2) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$admin_id = (int)($_GET['admin_id'] ?? 0);
if ($admin_id <= 0) json(['ok' => false, 'error' => 'Admin login required.'], 401);

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
  $stmt->execute([$admin_id]);
  if (!$stmt->fetch()) json(['ok' => false, 'error' => 'Admin not found.'], 401);

  $filter = strtolower(trim($_GET['filter'] ?? 'all'));
  // Solved state is driven ONLY by the admin checkbox (complaints.is_solved).
  // New page shows ALL complaints (solved stay visible, checked);
  // Solved page shows only solved.
  if ($filter === 'solved') { $where = 'c.is_solved = 1'; }
  elseif ($filter === 'new') { $where = 'c.is_solved = 0'; }
  else { $where = '1'; }

  $complaints = $pdo->query(
    'SELECT c.id, c.project_name, c.created_at, c.username, c.is_solved, u.first_name, u.middle_name, u.last_name, u.email, u.phone
     FROM complaints c JOIN users u ON u.id = c.user_id
     WHERE ' . $where . '
     ORDER BY c.id DESC'
  )->fetchAll();

  $iStmt = $pdo->prepare('SELECT description, created_at FROM complaint_issues WHERE complaint_id = ? ORDER BY id ASC');
  $rStmt = $pdo->prepare('SELECT r.response, r.created_at, a.username AS admin FROM complaint_responses r LEFT JOIN admins a ON a.id = r.admin_id WHERE r.complaint_id = ? ORDER BY r.id ASC');
  foreach ($complaints as &$c) {
    $iStmt->execute([$c['id']]);
    $c['issues'] = $iStmt->fetchAll();
    $rStmt->execute([$c['id']]);
    $c['responses'] = $rStmt->fetchAll();
  }
  json(['ok' => true, 'complaints' => $complaints]);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
