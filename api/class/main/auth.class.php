<?php
// Auth flows. Mirrors vendor/classess/main/login.class.php pattern.
class auth extends dbcon {
  public function adminLogin(string $username, string $pass): array {
    $stmt = self::conn()->prepare('SELECT id, username, password_hash FROM admins WHERE LOWER(username) = LOWER(?) LIMIT 1');
    $stmt->execute([$username]);
    $admin = $stmt->fetch();
    if (!$admin || !password_verify($pass, $admin['password_hash'])) {
      self::json(['ok' => false, 'error' => 'Invalid username or password.'], 401);
    }
    unset($admin['password_hash']);
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
    $stmt = self::conn()->prepare('SELECT id, first_name, last_name, phone, email, password_hash FROM users WHERE phone = ? OR email = ? LIMIT 1');
    $stmt->execute([$identifier, strtolower($identifier)]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($pass, $user['password_hash'])) {
      self::json(['ok' => false, 'error' => 'Invalid login or password.'], 401);
    }
    unset($user['password_hash']);
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
