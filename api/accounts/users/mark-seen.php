<?php
require dirname(__DIR__, 2) . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$user_id = (int)($in['user_id'] ?? 0);
if ($user_id <= 0) json(['ok' => false, 'error' => 'Login required.'], 401);

try {
  $pdo = db();
  $stmt = $pdo->prepare('UPDATE complaint_responses r JOIN complaints c ON c.id = r.complaint_id SET r.seen = 1 WHERE c.user_id = ? AND r.seen = 0');
  $stmt->execute([$user_id]);
  $marked = $stmt->rowCount();
  $stmt = $pdo->prepare('UPDATE users SET status_seen_at = NOW() WHERE id = ?');
  $stmt->execute([$user_id]);
  json(['ok' => true, 'marked' => $marked]);
} catch (PDOException $e) {
  json(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
