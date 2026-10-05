<?php
// Returns the CSRF token for the caller's current session (admin-first).
// Login responses already include it; use this to refresh it without re-login.
require dirname(__DIR__, 1) . '/class/autoloader.php';

dbcon::method('GET');
dbcon::json(['ok' => true, 'csrf' => dbcon::sessionCsrf()]);
