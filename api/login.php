<?php
require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$identifier = trim($in['identifier'] ?? $in['phone'] ?? $in['email'] ?? '');
$pass  = (string)($in['password'] ?? '');

if ($identifier === '' || $pass === '') {
  json(['ok' => false, 'error' => 'Phone/email and password required.'], 400);
}

try {
  $stmt = db()->prepare('SELECT id, first_name, last_name, phone, email, password_hash FROM users WHERE phone = ? OR email = ? LIMIT 1');
  $stmt->execute([$identifier, strtolower($identifier)]);
  $user = $stmt->fetch();
  if (!$user || !password_verify($pass, $user['password_hash'])) {
    json(['ok' => false, 'error' => 'Invalid login or password.'], 401);
  }
  unset($user['password_hash']);
  json(['ok' => true, 'message' => 'Login successful.', 'user' => $user]);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
