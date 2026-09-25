<?php
require dirname(__DIR__, 2) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$user_id = (int)($in['user_id'] ?? 0);
$project = trim($in['project_name'] ?? '');
$descriptions = $in['descriptions'] ?? $in['issues'] ?? [];
if (!is_array($descriptions)) $descriptions = [$descriptions];
$descriptions = array_values(array_filter(array_map(fn($d) => trim((string)$d), $descriptions), fn($d) => $d !== ''));

if ($user_id <= 0) json(['ok' => false, 'error' => 'Login required. Please login again.'], 401);
if ($project === '' || strlen($project) > 150) json(['ok' => false, 'error' => 'Project name is required (max 150 chars).'], 400);
if (count($descriptions) === 0) json(['ok' => false, 'error' => 'Describe at least one issue.'], 400);
if (count($descriptions) > 10) json(['ok' => false, 'error' => 'Maximum 10 issues allowed.'], 400);

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id, first_name, middle_name, last_name FROM users WHERE id = ? LIMIT 1');
  $stmt->execute([$user_id]);
  $account = $stmt->fetch();
  if (!$account) json(['ok' => false, 'error' => 'User not found. Please login again.'], 401);
  $username = trim(implode(' ', array_filter([$account['first_name'], $account['middle_name'], $account['last_name']])));

  $pdo->beginTransaction();
  $stmt = $pdo->prepare('INSERT INTO complaints (user_id, username, project_name) VALUES (?, ?, ?)');
  $stmt->execute([$user_id, $username, $project]);
  $complaint_id = (int)$pdo->lastInsertId();

  $stmt = $pdo->prepare('INSERT INTO complaint_issues (complaint_id, username, description) VALUES (?, ?, ?)');
  foreach ($descriptions as $idx => $desc) {
    if (strlen($desc) > 5000) {
      $pdo->rollBack();
      json(['ok' => false, 'error' => 'Issue ' . ($idx + 1) . ' description too long.'], 400);
    }
    $stmt->execute([$complaint_id, $username, $desc]);
  }
  $pdo->commit();
  json(['ok' => true, 'message' => 'Your complaint has been submitted.', 'complaint_id' => $complaint_id]);
} catch (PDOException $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
