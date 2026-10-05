<?php
require dirname(__DIR__, 2) . '/class/autoloader.php';

dbcon::method('GET');
$user_id = dbcon::requireUser();
$project = trim((string)($_GET['project'] ?? ''));
if ($project === '') dbcon::json(['ok' => false, 'error' => 'Project required.'], 400);
try {
  dbcon::json(['ok' => true, 'details' => (new project())->details($user_id, $project)]);
} catch (PDOException $e) {
  dbcon::json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
