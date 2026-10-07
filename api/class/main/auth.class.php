<?php
// Auth flows. Mirrors vendor/classess/main/login.class.php pattern.
class auth extends dbcon {
  public function adminLogin(string $username, string $pass): array {
    $key = strtolower(trim($username));
    $this->enforceLock('admin', $key);
    $stmt = self::conn()->prepare('SELECT id, username, password_hash FROM admins WHERE LOWER(username) = LOWER(?) LIMIT 1');
    $stmt->execute([$username]);
    $admin = $stmt->fetch();
    if (!$admin || !password_verify($pass, $admin['password_hash'])) {
      $this->recordFailure('admin', $key);
    }
    unset($admin['password_hash']);
    $this->clearLock('admin', $key);
    // Single-role session: regenerate id only after credentials verified,
    // set the admin key and clear any user key.
    self::startSession();
    session_regenerate_id(true);
    $_SESSION['admin_id'] = (int)$admin['id'];
    unset($_SESSION['user_id']);
    $_SESSION['created'] = time();
    $_SESSION['last_activity'] = time();
    return $admin;
  }

  public function userLogin(string $identifier, string $pass): array {
    $key = strtolower(trim($identifier));
    $this->enforceLock('user', $key);
    $stmt = self::conn()->prepare('SELECT id, first_name, last_name, phone, email, password_hash FROM users WHERE phone = ? OR email = ? LIMIT 1');
    $stmt->execute([$identifier, strtolower($identifier)]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($pass, $user['password_hash'])) {
      $this->recordFailure('user', $key);
    }
    unset($user['password_hash']);
    $this->clearLock('user', $key);
    // Single-role session: regenerate id only after credentials verified,
    // set the user key and clear any admin key.
    self::startSession();
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$user['id'];
    unset($_SESSION['admin_id']);
    $_SESSION['created'] = time();
    $_SESSION['last_activity'] = time();
    return $user;
  }

  // ---- exponential brute-force lockout: every 3rd failure locks 16s * 2^locks ----
  private const LOCK_EVERY = 3;
  private const LOCK_BASE = 16;
  private const LOCK_MAX = 86400; // 24h cap so accounts can't lock forever

  private function lockRow(string $kind, string $key): array {
    $stmt = self::conn()->prepare('SELECT failures, locks, locked_until FROM login_attempts WHERE login_key = ? AND kind = ? LIMIT 1');
    $stmt->execute([$key, $kind]);
    return $stmt->fetch() ?: ['failures' => 0, 'locks' => 0, 'locked_until' => null];
  }

  // 423 Locked with seconds remaining when the identifier is currently locked.
  private function enforceLock(string $kind, string $key): void {
    $row = $this->lockRow($kind, $key);
    if (!empty($row['locked_until']) && (int)$row['locked_until'] > time()) {
      $wait = (int)$row['locked_until'] - time();
      self::json(['ok' => false, 'error' => 'Too many wrong attempts. Try again in ' . $wait . ' seconds.', 'retry_after' => $wait], 423);
    }
  }

  private function recordFailure(string $kind, string $key): void {
    $row = $this->lockRow($kind, $key);
    $failures = (int)$row['failures'] + 1;
    $locks = (int)$row['locks'];
    $wait = 0;
    if ($failures % self::LOCK_EVERY === 0) {
      $wait = min(self::LOCK_BASE * (2 ** $locks), self::LOCK_MAX);
      $locks++;
      $stmt = self::conn()->prepare('INSERT INTO login_attempts (login_key, kind, failures, locks, locked_until) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE failures = VALUES(failures), locks = VALUES(locks), locked_until = VALUES(locked_until)');
      $stmt->execute([$key, $kind, $failures, $locks, time() + $wait]);
      self::json(['ok' => false, 'error' => 'Invalid credentials. Account locked for ' . $wait . ' seconds.', 'retry_after' => $wait], 423);
    }
    $stmt = self::conn()->prepare('INSERT INTO login_attempts (login_key, kind, failures, locks, locked_until) VALUES (?, ?, ?, ?, NULL) ON DUPLICATE KEY UPDATE failures = VALUES(failures), locks = VALUES(locks), locked_until = NULL');
    $stmt->execute([$key, $kind, $failures, $locks]);
    self::json(['ok' => false, 'error' => $kind === 'admin' ? 'Invalid username or password.' : 'Invalid login or password.'], 401);
  }

  private function clearLock(string $kind, string $key): void {
    self::conn()->prepare('DELETE FROM login_attempts WHERE login_key = ? AND kind = ?')->execute([$key, $kind]);
  }

  public function userRegister(string $first, ?string $middle, string $last, string $phone, string $email, string $hash): void {
    $stmt = self::conn()->prepare('INSERT INTO users (first_name, middle_name, last_name, phone, email, password_hash) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$first, $middle !== '' ? $middle : null, $last, $phone, $email, $hash]);
  }

  // All register validation lives here, not in endpoint.
  public function registerValidated(array $in): void {
    $first  = trim($in['first_name'] ?? '');
    $middle = trim($in['middle_name'] ?? '');
    $last   = trim($in['last_name'] ?? '');
    $phone  = trim($in['phone'] ?? '');
    $email  = strtolower(trim($in['email'] ?? ''));
    $pass   = (string)($in['password'] ?? '');
    $confirm = (string)($in['confirm_password'] ?? '');
    if ($first === '' || $last === '' || $phone === '' || $email === '' || $pass === '' || $confirm === '') {
      self::json(['ok' => false, 'error' => 'All required fields must be filled.'], 400);
    }
    if ($pass !== $confirm) self::json(['ok' => false, 'error' => 'Passwords do not match.'], 400);
    if (strlen($pass) < 4) self::json(['ok' => false, 'error' => 'Password must be at least 4 characters.'], 400);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) self::json(['ok' => false, 'error' => 'Enter a valid email address.'], 400);
    $this->userRegister($first, $middle, $last, $phone, $email, password_hash($pass, PASSWORD_BCRYPT));
  }
}
