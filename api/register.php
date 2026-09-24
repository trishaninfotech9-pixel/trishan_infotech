<?php
require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$first  = trim($in['first_name'] ?? '');
$middle = trim($in['middle_name'] ?? '');
$last   = trim($in['last_name'] ?? '');
$phone  = trim($in['phone'] ?? '');
$email  = strtolower(trim($in['email'] ?? ''));
$pass   = (string)($in['password'] ?? '');
$confirm = (string)($in['confirm_password'] ?? '');

if ($first === '' || $last === '' || $phone === '' || $email === '' || $pass === '' || $confirm === '') {
  json(['ok' => false, 'error' => 'All required fields must be filled.'], 400);
}
if ($pass !== $confirm) {
  json(['ok' => false, 'error' => 'Passwords do not match.'], 400);
}
if (strlen($pass) < 4) {
  json(['ok' => false, 'error' => 'Password must be at least 4 characters.'], 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  json(['ok' => false, 'error' => 'Enter a valid email address.'], 400);
}

try {
  $hash = password_hash($pass, PASSWORD_BCRYPT);
  $stmt = db()->prepare('INSERT INTO users (first_name, middle_name, last_name, phone, email, password_hash) VALUES (?, ?, ?, ?, ?, ?)');
  $stmt->execute([$first, $middle !== '' ? $middle : null, $last, $phone, $email, $hash]);
  json(['ok' => true, 'message' => 'Account created. Please login.']);
} catch (PDOException $e) {
  if ($e->getCode() === '23000') {
    json(['ok' => false, 'error' => 'Phone number or email already registered.'], 409);
  }
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
