<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$identifier = trim($in['identifier'] ?? $in['phone'] ?? $in['email'] ?? '');
$pass  = (string)($in['password'] ?? '');
if ($identifier === '' || $pass === '') dbcon::json(['ok' => false, 'error' => 'Phone/email and password required.'], 400);

try {
  $user = (new auth())->userLogin($identifier, $pass);
  dbcon::json(['ok' => true, 'message' => 'Login successful.', 'user' => $user, 'csrf' => dbcon::csrfToken()]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
