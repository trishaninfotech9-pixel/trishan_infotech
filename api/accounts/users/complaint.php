<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('POST');
$user_id = dbcon::requireUser();
dbcon::requireCsrf();
try {
  dbcon::json(['ok' => true, 'message' => 'Your complaint has been submitted.', 'complaint_id' => (new complaint())->createValidated(dbcon::input(), $user_id)]);
} catch (PDOException $e) {
  $pdo = dbcon::conn();
  if ($pdo->inTransaction()) $pdo->rollBack();
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
