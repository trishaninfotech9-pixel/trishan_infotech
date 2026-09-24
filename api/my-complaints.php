<?php
require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$user_id = (int)($_GET['user_id'] ?? 0);
if ($user_id <= 0) json(['ok' => false, 'error' => 'Login required.'], 401);

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
  $stmt->execute([$user_id]);
  if (!$stmt->fetch()) json(['ok' => false, 'error' => 'User not found.'], 401);

  $stmt = $pdo->prepare('SELECT id, project_name, created_at FROM complaints WHERE user_id = ? ORDER BY id DESC');
  $stmt->execute([$user_id]);
  $complaints = $stmt->fetchAll();

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
