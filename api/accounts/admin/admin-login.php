<?php
require dirname(__DIR__, 2) . '/class/Database.class.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  Database::json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$username = trim($in['username'] ?? '');
$pass = (string)($in['password'] ?? '');

if ($username === '' || $pass === '') {
  Database::json(['ok' => false, 'error' => 'Username and password required.'], 400);
}

try {
  $stmt = Database::conn()->prepare('SELECT id, username, password_hash FROM admins WHERE LOWER(username) = LOWER(?) LIMIT 1');
  $stmt->execute([$username]);
  $admin = $stmt->fetch();
  if (!$admin || !password_verify($pass, $admin['password_hash'])) {
    Database::json(['ok' => false, 'error' => 'Invalid username or password.'], 401);
  }
  unset($admin['password_hash']);
  Database::json(['ok' => true, 'message' => 'Admin login successful.', 'admin' => $admin]);
} catch (PDOException $e) {
  Database::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
