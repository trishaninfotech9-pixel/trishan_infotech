<?php
require __DIR__ . '/db.php';

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

  $complaints = $pdo->query(
    'SELECT c.id, c.project_name, c.created_at, u.first_name, u.middle_name, u.last_name, u.email, u.phone
     FROM complaints c JOIN users u ON u.id = c.user_id
     WHERE NOT EXISTS (SELECT 1 FROM complaint_responses r WHERE r.complaint_id = c.id)
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
