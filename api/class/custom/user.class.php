<?php
// User entity. Mirrors vendor/classess/custom/customer.class.php pattern.
class user extends dbcon {
  public function listUsers(): array {
    return self::conn()->query('SELECT id, first_name, middle_name, last_name, email, phone, created_at FROM users ORDER BY first_name ASC, id ASC')->fetchAll();
  }

  public function getById(int $user_id): ?array {
    $stmt = self::conn()->prepare('SELECT id, first_name, middle_name, last_name, email, phone FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$user_id]);
    return $stmt->fetch() ?: null;
  }

  public function deleteUser(int $user_id): void {
    $pdo = self::conn();
    $pdo->prepare('DELETE FROM project_details WHERE user_id = ?')->execute([$user_id]);
    $pdo->prepare('DELETE FROM project_status_log WHERE user_id = ?')->execute([$user_id]);
    $pdo->prepare('DELETE r FROM complaint_responses r JOIN complaints c ON c.id = r.complaint_id WHERE c.user_id = ?')->execute([$user_id]);
    $pdo->prepare('DELETE i FROM complaint_issues i JOIN complaints c ON c.id = i.complaint_id WHERE c.user_id = ?')->execute([$user_id]);
    $pdo->prepare('DELETE FROM complaints WHERE user_id = ?')->execute([$user_id]);
    $pdo->prepare('DELETE FROM projects WHERE user_id = ?')->execute([$user_id]);
    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$user_id]);
  }

  public function markSeen(int $user_id): int {
    $pdo = self::conn();
    $stmt = $pdo->prepare('UPDATE complaint_responses r JOIN complaints c ON c.id = r.complaint_id SET r.seen = 1 WHERE c.user_id = ? AND r.seen = 0');
    $stmt->execute([$user_id]);
    $marked = $stmt->rowCount();
    $pdo->prepare('UPDATE users SET status_seen_at = NOW() WHERE id = ?')->execute([$user_id]);
    return $marked;
  }

  // Admin bell feed: signups the admin has not opened yet (newest first).
  public function unseenSignups(): array {
    return self::conn()->query('SELECT id, first_name, middle_name, last_name, email, phone, created_at FROM users WHERE seen_admin = 0 ORDER BY id DESC')->fetchAll();
  }

  public function markSignupSeen(int $user_id): void {
    self::conn()->prepare('UPDATE users SET seen_admin = 1 WHERE id = ?')->execute([$user_id]);
  }
}
