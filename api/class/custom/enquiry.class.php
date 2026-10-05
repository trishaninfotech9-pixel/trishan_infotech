<?php
// Website + per-project user enquiry entity. New structure only: ALL enquiry work lives here.
class enquiry extends dbcon {
  // Public website form (no account).
  public function submitValidated(array $in): int {
    $name = trim((string)($in['name'] ?? $in['from_name'] ?? ''));
    $email = strtolower(trim((string)($in['email'] ?? $in['reply_to'] ?? '')));
    $message = trim((string)($in['message'] ?? ''));
    if ($name === '' || strlen($name) > 150) self::json(['ok' => false, 'error' => 'Full name is required (max 150 chars).'], 400);
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) self::json(['ok' => false, 'error' => 'Enter a valid email address.'], 400);
    if ($message === '' || strlen($message) > 5000) self::json(['ok' => false, 'error' => 'Message is required (max 5000 chars).'], 400);
    $stmt = self::conn()->prepare('INSERT INTO enquiries (name, email, message) VALUES (?, ?, ?)');
    $stmt->execute([$name, $email, $message]);
    return (int)self::conn()->lastInsertId();
  }

  // Logged-in user asks about a specific project (like complaint flow).
  // $user_id is the session identity supplied by the endpoint (never read from $in).
  public function askValidated(array $in, int $user_id): int {
    $project = trim((string)($in['project_name'] ?? $in['project'] ?? ''));
    $message = trim((string)($in['message'] ?? $in['question'] ?? ''));
    if ($project === '' || strlen($project) > 150) self::json(['ok' => false, 'error' => 'Project name is required (max 150 chars).'], 400);
    if ($message === '' || strlen($message) > 5000) self::json(['ok' => false, 'error' => 'Question is required (max 5000 chars).'], 400);
    $account = self::userRow($user_id);
    if (!$account) self::json(['ok' => false, 'error' => 'Login required. Please login again.'], 401);
    $username = self::fullName($account);
    $email = $account['email'] ?? '';
    $stmt = self::conn()->prepare('INSERT INTO enquiries (user_id, username, project_name, name, email, message) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$user_id, $username, $project, $username, $email, $message]);
    return (int)self::conn()->lastInsertId();
  }

  public function listAll(string $filter = 'all'): array {
    $filter = strtolower(trim($filter));
    $where = $filter === 'unseen' ? 'WHERE e.seen_admin = 0' : ($filter === 'seen' ? 'WHERE e.seen_admin = 1' : '');
    $rows = self::conn()->query('SELECT e.id, e.user_id, e.username, e.project_name, e.name, e.email, e.message, e.seen_admin, e.created_at FROM enquiries e ' . $where . ' ORDER BY e.id DESC')->fetchAll();
    return $this->withResponses($rows);
  }

  // User's own threads with admin replies (for response page).
  public function myEnquiries(int $user_id): array {
    $stmt = self::conn()->prepare('SELECT e.id, e.project_name, e.message, e.created_at FROM enquiries e WHERE e.user_id = ? ORDER BY e.id DESC');
    $stmt->execute([$user_id]);
    return $this->withResponses($stmt->fetchAll());
  }

  public function reply(int $enquiry_id, int $admin_id, string $response): int {
    $response = trim($response);
    if ($response === '' || strlen($response) > 5000) self::json(['ok' => false, 'error' => 'Response is required (max 5000 chars).'], 400);
    $stmt = self::conn()->prepare('SELECT id, username FROM enquiries WHERE id = ? LIMIT 1');
    $stmt->execute([$enquiry_id]);
    $row = $stmt->fetch();
    if (!$row) self::json(['ok' => false, 'error' => 'Enquiry not found.'], 404);
    $stmt = self::conn()->prepare('INSERT INTO enquiry_responses (enquiry_id, username, admin_id, response) VALUES (?, ?, ?, ?)');
    $stmt->execute([$enquiry_id, $row['username'] ?? '', $admin_id, $response]);
    $rid = (int)self::conn()->lastInsertId();
    // A reply means the admin has handled it: auto-mark as seen.
    self::conn()->prepare('UPDATE enquiries SET seen_admin = 1 WHERE id = ?')->execute([$enquiry_id]);
    return $rid;
  }

  public function markSeen(int $id): void {
    self::conn()->prepare('UPDATE enquiries SET seen_admin = 1 WHERE id = ?')->execute([$id]);
  }

  // User opens response page: their unread admin replies become seen.
  public function markUserSeen(int $user_id): int {
    $stmt = self::conn()->prepare('UPDATE enquiry_responses r JOIN enquiries e ON e.id = r.enquiry_id SET r.seen = 1 WHERE e.user_id = ? AND r.seen = 0');
    $stmt->execute([$user_id]);
    return $stmt->rowCount();
  }

  public function deleteEnquiry(int $id): void {
    $pdo = self::conn();
    $pdo->prepare('DELETE FROM enquiry_responses WHERE enquiry_id = ?')->execute([$id]);
    $stmt = $pdo->prepare('DELETE FROM enquiries WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) self::json(['ok' => false, 'error' => 'Enquiry not found.'], 404);
  }

  public function counts(): array {
    $pdo = self::conn();
    return [
      'total' => (int)$pdo->query('SELECT COUNT(*) FROM enquiries')->fetchColumn(),
      'unseen' => (int)$pdo->query('SELECT COUNT(*) FROM enquiries WHERE seen_admin = 0')->fetchColumn(),
    ];
  }

  private function withResponses(array $rows): array {
    if (!$rows) return $rows;
    $pdo = self::conn();
    $rStmt = $pdo->prepare('SELECT r.response, r.created_at, r.seen, a.username AS admin FROM enquiry_responses r LEFT JOIN admins a ON a.id = r.admin_id WHERE r.enquiry_id = ? ORDER BY r.id ASC');
    foreach ($rows as &$q) {
      $rStmt->execute([$q['id']]);
      $q['responses'] = $rStmt->fetchAll();
    }
    unset($q);
    return $rows;
  }
}
