<?php
require dirname(__DIR__, 1) . '/class/autoloader.php';
dbcon::method('POST');
try {
  dbcon::json(['ok' => true, 'message' => 'Enquiry received.', 'enquiry_id' => (new enquiry())->submitValidated(dbcon::input())]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
