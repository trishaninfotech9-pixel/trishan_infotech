<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('GET');
dbcon::requireAdmin();

try {
  $complaints = (new complaint())->allComplaints($_GET['filter'] ?? 'all');
  dbcon::json(['ok' => true, 'complaints' => $complaints]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
