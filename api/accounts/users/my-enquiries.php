<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('GET');
$user_id = dbcon::requireUser();

try {
  dbcon::json(['ok' => true, 'enquiries' => (new enquiry())->myEnquiries($user_id)]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
