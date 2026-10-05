<?php
// Destroys the caller's session (admin or user). Requires the session CSRF token.
require dirname(__DIR__, 1) . '/class/autoloader.php';

dbcon::method('POST');
dbcon::startSession();

if (empty($_SESSION['admin_id']) && empty($_SESSION['user_id'])) {
  dbcon::json(['ok' => false, 'error' => 'Login required.'], 401);
}
dbcon::requireCsrf();
dbcon::destroySession();
dbcon::json(['ok' => true, 'message' => 'Logged out.']);
