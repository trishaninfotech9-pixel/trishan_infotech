<?php
require dirname(__DIR__, 2) . '/class/Database.class.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  Database::json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$identifier = trim($in['identifier'] ?? $in['phone'] ?? $in['email'] ?? '');
$pass  = (string)($in['password'] ?? '');

if ($identifier === '' || $pass === '') {
  Database::json(['ok' => false, 'error' => 'Phone/email and password required.'], 400);
}

try {
  $stmt = Database::conn()->prepare('SELECT id, first_name, last_name, phone, email, password_hash FROM users WHERE phone = ? OR email = ? LIMIT 1');
  $stmt->execute([$identifier, strtolower($identifier)]);
  $user = $stmt->fetch();
  if (!$user || !password_verify($pass, $user['password_hash'])) {
    Database::json(['ok' => false, 'error' => 'Invalid login or password.'], 401);
  }
  unset($user['password_hash']);
  Database::json(['ok' => true, 'message' => 'Login successful.', 'user' => $user]);
} catch (PDOException $e) {
  Database::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
