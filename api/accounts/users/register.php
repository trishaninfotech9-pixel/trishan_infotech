<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';
dbcon::method('POST');
try {
  (new auth())->registerValidated(json_decode(file_get_contents('php://input'), true) ?: []);
  dbcon::json(['ok' => true, 'message' => 'Account created. Please login.']);
} catch (PDOException $e) {
  if ($e->getCode() === '23000') dbcon::json(['ok' => false, 'error' => 'Phone number or email already registered.'], 409);
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
