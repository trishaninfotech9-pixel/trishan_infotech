<?php
require dirname(__DIR__, 2) . '/class/Database.class.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  Database::json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$admin_id = (int)($_GET['admin_id'] ?? 0);
if ($admin_id <= 0) Database::json(['ok' => false, 'error' => 'Admin login required.'], 401);

try {
  $pdo = Database::conn();
  $stmt = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
  $stmt->execute([$admin_id]);
  if (!$stmt->fetch()) Database::json(['ok' => false, 'error' => 'Admin not found.'], 401);

  Database::json(['ok' => true, 'stats' => [
    'users' => (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),
    'pending' => (int)$pdo->query('SELECT COUNT(*) FROM complaints c WHERE NOT EXISTS (SELECT 1 FROM complaint_responses r WHERE r.complaint_id = c.id)')->fetchColumn(),
    'solved' => (int)$pdo->query('SELECT COUNT(*) FROM complaints WHERE is_solved = 1')->fetchColumn(),
    'responses' => (int)$pdo->query('SELECT COUNT(*) FROM complaint_responses')->fetchColumn(),
  ]]);
} catch (PDOException $e) {
  Database::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
