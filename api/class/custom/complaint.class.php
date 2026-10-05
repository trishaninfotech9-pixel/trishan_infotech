<?php
// Complaint entity. Mirrors vendor/classess/custom/*.class.php pattern.
class complaint extends dbcon {
  // $user_id is the session identity supplied by the endpoint (never read from $in).
  public function createValidated(array $in, int $user_id): int {
    $project = trim($in['project_name'] ?? '');
    $descriptions = $in['descriptions'] ?? $in['issues'] ?? [];
    if (!is_array($descriptions)) $descriptions = [$descriptions];
    $descriptions = array_values(array_filter(array_map(fn($d) => trim((string)$d), $descriptions), fn($d) => $d !== ''));
    if ($project === '' || strlen($project) > 150) self::json(['ok' => false, 'error' => 'Project name is required (max 150 chars).'], 400);
    if (count($descriptions) === 0) self::json(['ok' => false, 'error' => 'Describe at least one issue.'], 400);
    if (count($descriptions) > 10) self::json(['ok' => false, 'error' => 'Maximum 10 issues allowed.'], 400);
    $account = self::userRow($user_id);
    if (!$account) self::json(['ok' => false, 'error' => 'Login required. Please login again.'], 401);
    return $this->create($user_id, self::fullName($account), $project, $descriptions);
  }

  public function create(int $user_id, string $username, string $project, array $descriptions): int {
    $pdo = self::conn();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('INSERT INTO complaints (user_id, username, project_name) VALUES (?, ?, ?)');
    $stmt->execute([$user_id, $username, $project]);
    $complaint_id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare('INSERT INTO complaint_issues (complaint_id, username, description) VALUES (?, ?, ?)');
    foreach ($descriptions as $idx => $desc) {
      if (strlen($desc) > 5000) {
        $pdo->rollBack();
        self::json(['ok' => false, 'error' => 'Issue ' . ($idx + 1) . ' description too long.'], 400);
      }
      $stmt->execute([$complaint_id, $username, $desc]);
    }
    $pdo->commit();
    return $complaint_id;
  }

  public function myComplaints(int $user_id): array {
    $pdo = self::conn();
    $stmt = $pdo->prepare('SELECT id, project_name, is_solved, created_at FROM complaints WHERE user_id = ? ORDER BY id DESC');
    $stmt->execute([$user_id]);
    $complaints = $stmt->fetchAll();
    $iStmt = $pdo->prepare('SELECT description, created_at FROM complaint_issues WHERE complaint_id = ? ORDER BY id ASC');
    $rStmt = $pdo->prepare('SELECT r.response, r.created_at, r.seen, a.username AS admin FROM complaint_responses r LEFT JOIN admins a ON a.id = r.admin_id WHERE r.complaint_id = ? ORDER BY r.id ASC');
    foreach ($complaints as &$c) {
      $iStmt->execute([$c['id']]);
      $c['issues'] = $iStmt->fetchAll();
      $rStmt->execute([$c['id']]);
      $c['responses'] = $rStmt->fetchAll();
    }
    return $complaints;
  }

  public function allComplaints(string $filter): array {
    $filter = strtolower(trim($filter));
    if ($filter === 'solved') { $where = 'c.is_solved = 1 AND c.is_ignored = 0'; }
    elseif ($filter === 'new' || $filter === 'pending') { $where = 'c.is_solved = 0 AND c.is_ignored = 0'; }
    elseif ($filter === 'ignored') { $where = 'c.is_ignored = 1'; }
    elseif ($filter === 'unseen') { $where = 'c.is_solved = 0 AND c.is_ignored = 0 AND c.seen_admin = 0'; }
    else { $where = 'c.is_ignored = 0'; }
    $pdo = self::conn();
    $complaints = $pdo->query(
      'SELECT c.id, c.project_name, c.created_at, c.username, c.is_solved, u.first_name, u.middle_name, u.last_name, u.email, u.phone
       FROM complaints c JOIN users u ON u.id = c.user_id
       WHERE ' . $where . '
       ORDER BY c.id DESC'
    )->fetchAll();
    $iStmt = $pdo->prepare('SELECT description, created_at FROM complaint_issues WHERE complaint_id = ? ORDER BY id ASC');
    $rStmt = $pdo->prepare('SELECT r.response, r.created_at, a.username AS admin FROM complaint_responses r LEFT JOIN admins a ON a.id = r.admin_id WHERE r.complaint_id = ? ORDER BY r.id ASC');
    foreach ($complaints as &$c) {
      $iStmt->execute([$c['id']]);
      $c['issues'] = $iStmt->fetchAll();
      $rStmt->execute([$c['id']]);
      $c['responses'] = $rStmt->fetchAll();
    }
    return $complaints;
  }

  public function reply(int $complaint_id, string $username, int $admin_id, string $response): int {
    $pdo = self::conn();
    $stmt = $pdo->prepare('INSERT INTO complaint_responses (complaint_id, username, admin_id, response) VALUES (?, ?, ?, ?)');
    $stmt->execute([$complaint_id, $username, $admin_id, $response]);
    return (int)$pdo->lastInsertId();
  }

  public function setSolved(int $complaint_id, int $solved): void {
    if ($solved) {
      $stmt = self::conn()->prepare('SELECT COUNT(*) FROM complaint_responses WHERE complaint_id = ?');
      $stmt->execute([$complaint_id]);
      if ((int)$stmt->fetchColumn() === 0) {
        self::json(['ok' => false, 'error' => 'Please write and send a response first. Then you can mark it solved.'], 400);
      }
    }
    $stmt = self::conn()->prepare('UPDATE complaints SET is_solved = ?, solved_at = IF(? , NOW(), NULL) WHERE id = ?');
    $stmt->execute([$solved, $solved, $complaint_id]);
  }

  public function setIgnored(int $complaint_id, int $ignored): bool {
    $pdo = self::conn();
    $stmt = $pdo->prepare('UPDATE complaints SET is_ignored = ? WHERE id = ?');
    $stmt->execute([$ignored, $complaint_id]);
    if ($stmt->rowCount() === 0) {
      $chk = $pdo->prepare('SELECT id FROM complaints WHERE id = ? LIMIT 1');
      $chk->execute([$complaint_id]);
      if (!$chk->fetch()) self::json(['ok' => false, 'error' => 'Complaint not found.'], 404);
      return false;
    }
    return true;
  }

  public function deleteComplaint(int $complaint_id): void {
    $pdo = self::conn();
    $pdo->prepare('DELETE FROM complaint_responses WHERE complaint_id = ?')->execute([$complaint_id]);
    $pdo->prepare('DELETE FROM complaint_issues WHERE complaint_id = ?')->execute([$complaint_id]);
    $pdo->prepare('DELETE FROM complaints WHERE id = ?')->execute([$complaint_id]);
  }

  public function markAdminSeen(int $complaint_id): void {
    self::conn()->prepare('UPDATE complaints SET seen_admin = 1 WHERE id = ?')->execute([$complaint_id]);
  }

  public function mustExist(int $complaint_id): array {
    $stmt = self::conn()->prepare('SELECT id, username FROM complaints WHERE id = ? LIMIT 1');
    $stmt->execute([$complaint_id]);
    $row = $stmt->fetch();
    if (!$row) self::json(['ok' => false, 'error' => 'Complaint not found.'], 404);
    return $row;
  }
}
