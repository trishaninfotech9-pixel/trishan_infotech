<?php
require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$username = trim($in['username'] ?? '');
$pass = (string)($in['password'] ?? '');

if ($username === '' || $pass === '') {
  json(['ok' => false, 'error' => 'Username and password required.'], 400);
}

try {
  $stmt = db()->prepare('SELECT id, username, password_hash FROM admins WHERE LOWER(username) = LOWER(?) LIMIT 1');
  $stmt->execute([$username]);
  $admin = $stmt->fetch();
  if (!$admin || !password_verify($pass, $admin['password_hash'])) {
    json(['ok' => false, 'error' => 'Invalid username or password.'], 401);
  }
  unset($admin['password_hash']);
  json(['ok' => true, 'message' => 'Admin login successful.', 'admin' => $admin]);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
