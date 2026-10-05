<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$in = dbcon::input();
$username = trim($in['username'] ?? '');
$pass = (string)($in['password'] ?? '');
if ($username === '' || $pass === '') dbcon::json(['ok' => false, 'error' => 'Username and password required.'], 400);

try {
  $admin = (new auth())->adminLogin($username, $pass);
  dbcon::json(['ok' => true, 'message' => 'Admin login successful.', 'admin' => $admin, 'csrf' => dbcon::csrfToken()]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
