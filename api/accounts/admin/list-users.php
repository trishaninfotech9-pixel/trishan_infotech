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

  $users = $pdo->query('SELECT id, first_name, middle_name, last_name, email, phone, created_at FROM users ORDER BY first_name ASC, id ASC')->fetchAll();
  json(['ok' => true, 'users' => $users]);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
