<?php
// Base DB + shared helpers. Mirrors vendor/classess/default/dbcon.class.php pattern.
// All other api/class/* classes extend dbcon.
class dbcon {
  private static ?PDO $pdo = null;

  public static function conn(): PDO {
    if (self::$pdo === null) {
      self::$pdo = new PDO(
        'mysql:host=127.0.0.1;port=3306;dbname=trishan_db;charset=utf8mb4',
        'root',
        '',
        [
          PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
          PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
      );
      self::migrate(self::$pdo);
    }
    return self::$pdo;
  }

  public static function json($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
  }

  // ---- shared request helpers (removes repetition across 22 endpoints) ----
  public static function method(string $want): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $want) {
      self::json(['ok' => false, 'error' => 'Method not allowed.'], 405);
    }
  }

  public static function input(): array {
    $in = json_decode(file_get_contents('php://input'), true);
    if (!is_array($in)) $in = $_POST;
    return $in;
  }

  public static function fullName(array $account): string {
    return trim(implode(' ', array_filter([
      $account['first_name'] ?? '', $account['middle_name'] ?? '', $account['last_name'] ?? ''
    ])));
  }

  // ---- secure server-side sessions (S-01 fix; identity NEVER comes from the request) ----
  // One session cookie (TRISHAN_SESS) with strictly separate identity keys:
  // requireAdmin() reads ONLY $_SESSION['admin_id'], requireUser() ONLY
  // $_SESSION['user_id']. Each key is set solely by its own verified login,
  // and each login clears the other key, so a user session can never act as
  // admin. (Two cookie names were tried first, but PHP reuses the previous
  // session ID across a mid-request session_name() switch, which resumed the
  // wrong session file and overwrote the good cookie — verified empirically.)
  private const SESSION_IDLE = 1800;      // 30 min inactivity
  private const SESSION_USER_MAX = 28800; // 8 hours absolute (users)
  private const SESSION_ADMIN_MAX = 7200; // 2 hours absolute (admins)

  // Starts (or resumes) the session with hardened cookie + mode flags.
  public static function startSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) { self::checkExpiry(); return; }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
      'lifetime' => 0, 'path' => '/', 'httponly' => true,
      'samesite' => 'Lax', 'secure' => $secure,
    ]);
    session_name('TRISHAN_SESS');
    session_start();
    self::checkExpiry();
  }

  private static function checkExpiry(): void {
    $now = time();
    if (!isset($_SESSION['created'])) {
      $_SESSION['created'] = $now;
      $_SESSION['last_activity'] = $now;
      return;
    }
    $isAdmin = !empty($_SESSION['admin_id']);
    $max = $isAdmin ? self::SESSION_ADMIN_MAX : self::SESSION_USER_MAX;
    if (($now - (int)$_SESSION['created'] > $max)
      || ($now - (int)$_SESSION['last_activity'] > self::SESSION_IDLE)) {
      self::destroySession();
      self::json(['ok' => false, 'error' => $isAdmin ? 'Admin login required.' : 'Login required.'], 401);
    }
    $_SESSION['last_activity'] = $now;
  }

  public static function destroySession(): void {
    $_SESSION = [];
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    // Current name + legacy names from the earlier two-cookie attempt.
    foreach (['TRISHAN_SESS', 'TRISHAN_ADMIN', 'TRISHAN_USER'] as $name) {
      setcookie($name, '', [
        'expires' => time() - 3600, 'path' => '/', 'httponly' => true,
        'samesite' => 'Lax', 'secure' => $secure,
      ]);
    }
    if (session_status() === PHP_SESSION_ACTIVE) session_destroy();
  }

  // Identity comes ONLY from $_SESSION['admin_id'] (set by verified admin login).
  public static function requireAdmin(): int {
    self::startSession();
    $admin_id = (int)($_SESSION['admin_id'] ?? 0);
    if ($admin_id <= 0) self::json(['ok' => false, 'error' => 'Admin login required.'], 401);
    $stmt = self::conn()->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
    $stmt->execute([$admin_id]);
    if (!$stmt->fetch()) { self::destroySession(); self::json(['ok' => false, 'error' => 'Admin login required.'], 401); }
    return $admin_id;
  }

  // Identity comes ONLY from $_SESSION['user_id'] (set by verified user login).
  public static function requireUser(): int {
    self::startSession();
    $user_id = (int)($_SESSION['user_id'] ?? 0);
    if ($user_id <= 0) self::json(['ok' => false, 'error' => 'Login required.'], 401);
    $stmt = self::conn()->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$user_id]);
    if (!$stmt->fetch()) { self::destroySession(); self::json(['ok' => false, 'error' => 'Login required.'], 401); }
    return $user_id;
  }

  // Plain row fetch, no auth implication. Returns null when missing.
  // Admin endpoints use it for the *target* user they manage (404 on miss).
  public static function userRow(int $user_id): ?array {
    $stmt = self::conn()->prepare('SELECT id, first_name, middle_name, last_name, email, phone FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$user_id]);
    return $stmt->fetch() ?: null;
  }

  // ---- CSRF: one token per session, sent via X-CSRF-Token on POST ----
  public static function csrfToken(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
  }

  public static function requireCsrf(): void {
    $sent = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $want = (string)($_SESSION['csrf'] ?? '');
    if ($want === '' || $sent === '' || !hash_equals($want, $sent)) {
      self::json(['ok' => false, 'error' => 'Invalid CSRF token.'], 403);
    }
  }

  // Returns the token for the current session (either role). 401 when logged out.
  public static function sessionCsrf(): string {
    self::startSession();
    if (empty($_SESSION['admin_id']) && empty($_SESSION['user_id'])) {
      self::json(['ok' => false, 'error' => 'Login required.'], 401);
    }
    return self::csrfToken();
  }

  private static function migrate(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(50) NOT NULL,
      middle_name VARCHAR(50) NULL,
      last_name VARCHAR(50) NOT NULL,
      phone VARCHAR(15) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      status_seen_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $stmt = $pdo->prepare("INSERT IGNORE INTO admins (username, password_hash) VALUES ('admin', ?)");
    $stmt->execute([password_hash('1234', PASSWORD_BCRYPT)]);
    $pdo->exec("CREATE TABLE IF NOT EXISTS complaints (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      username VARCHAR(150) NOT NULL DEFAULT '',
      project_name VARCHAR(150) NOT NULL,
      solved_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");
    try {
      $pdo->exec("ALTER TABLE complaints ADD COLUMN username VARCHAR(150) NOT NULL DEFAULT ''");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    try {
      $pdo->exec("ALTER TABLE complaints ADD COLUMN is_solved TINYINT(1) NOT NULL DEFAULT 0");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    try {
      $pdo->exec("ALTER TABLE complaints ADD COLUMN is_ignored TINYINT(1) NOT NULL DEFAULT 0");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    try {
      $pdo->exec("ALTER TABLE complaints ADD COLUMN seen_admin TINYINT(1) NOT NULL DEFAULT 0");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    try {
      $pdo->exec("ALTER TABLE complaints ADD COLUMN solved_at TIMESTAMP NULL DEFAULT NULL");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    // Create child tables BEFORE catch-up UPDATEs that reference them (fresh DB safe).
    try {
      $pdo->exec("ALTER TABLE users ADD COLUMN status_seen_at TIMESTAMP NULL DEFAULT NULL");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    $pdo->exec("CREATE TABLE IF NOT EXISTS complaint_issues (
      id INT AUTO_INCREMENT PRIMARY KEY,
      complaint_id INT NOT NULL,
      username VARCHAR(150) NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS complaint_responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      complaint_id INT NOT NULL,
      username VARCHAR(150) NOT NULL DEFAULT '',
      admin_id INT NULL,
      response TEXT NOT NULL,
      seen TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
    )");
    // One-time catch-up: already-solved complaints get their latest response time as solved time.
    $pdo->exec("UPDATE complaints c SET c.solved_at = (SELECT MAX(r.created_at) FROM complaint_responses r WHERE r.complaint_id = c.id) WHERE c.is_solved = 1 AND c.solved_at IS NULL AND EXISTS (SELECT 1 FROM complaint_responses r WHERE r.complaint_id = c.id)");
    $pdo->exec("UPDATE complaints c JOIN users u ON u.id = c.user_id SET c.username = TRIM(CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)) WHERE c.username = ''");
    try {
      $pdo->exec("ALTER TABLE complaint_responses ADD COLUMN seen TINYINT(1) NOT NULL DEFAULT 0");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    foreach (['complaint_issues', 'complaint_responses'] as $t) {
      try {
        $pdo->exec("ALTER TABLE $t ADD COLUMN username VARCHAR(150) NOT NULL DEFAULT ''");
      } catch (PDOException $e) {
        if ($e->getCode() !== '42S21') throw $e;
      }
    }
    $pdo->exec("UPDATE complaint_issues i JOIN complaints c ON c.id = i.complaint_id SET i.username = c.username WHERE i.username = ''");
    $pdo->exec("UPDATE complaint_responses r JOIN complaints c ON c.id = r.complaint_id SET r.username = c.username WHERE r.username = ''");
    $pdo->exec("CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      username VARCHAR(150) NOT NULL DEFAULT '',
      project_name VARCHAR(150) NOT NULL,
      details TEXT NOT NULL,
      is_complete TINYINT(1) NOT NULL DEFAULT 0,
      is_under_process TINYINT(1) NOT NULL DEFAULT 0,
      status_updated_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_project (user_id, project_name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");
    try {
      $pdo->exec("ALTER TABLE projects ADD COLUMN details TEXT NOT NULL");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    try {
      $pdo->exec("ALTER TABLE projects ADD COLUMN username VARCHAR(150) NOT NULL DEFAULT ''");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    try {
      $pdo->exec("ALTER TABLE projects ADD COLUMN is_complete TINYINT(1) NOT NULL DEFAULT 0");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    try {
      $pdo->exec("ALTER TABLE projects ADD COLUMN is_under_process TINYINT(1) NOT NULL DEFAULT 0");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    try {
      $pdo->exec("ALTER TABLE projects ADD COLUMN status_updated_at TIMESTAMP NULL DEFAULT NULL");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    // One-time catch-up: projects already flagged before timestamps existed notify once.
    $pdo->exec("UPDATE projects SET status_updated_at = NOW() WHERE status_updated_at IS NULL AND (is_complete = 1 OR is_under_process = 1)");
    $pdo->exec("UPDATE projects p JOIN users u ON u.id = p.user_id SET p.username = TRIM(CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)) WHERE p.username = ''");
    $pdo->exec("CREATE OR REPLACE VIEW user_all_projects AS
      SELECT p.user_id, TRIM(CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)) AS username, p.project_name, p.details, 'assigned' AS source, p.created_at
      FROM projects p JOIN users u ON u.id = p.user_id
      UNION
      SELECT c.user_id, TRIM(CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)) AS username, c.project_name, '' AS details, 'complaint' AS source, MIN(c.created_at) AS created_at
      FROM complaints c JOIN users u ON u.id = c.user_id GROUP BY c.user_id, c.project_name");
    $pdo->exec("CREATE TABLE IF NOT EXISTS project_details (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL DEFAULT 0,
      username VARCHAR(150) NOT NULL DEFAULT '',
      email VARCHAR(100) NOT NULL DEFAULT '',
      phone_no VARCHAR(15) NOT NULL DEFAULT '',
      project_name VARCHAR(150) NOT NULL,
      project_details TEXT NOT NULL,
      budget DECIMAL(12,2) NULL DEFAULT NULL,
      domain_name VARCHAR(150) NOT NULL DEFAULT '',
      domain_booking_date DATE NULL,
      domain_amount DECIMAL(12,2) NULL DEFAULT NULL,
      server_name VARCHAR(150) NOT NULL DEFAULT '',
      server_renewal_date DATE NULL,
      server_amount DECIMAL(12,2) NULL DEFAULT NULL,
      amc_date DATE NULL,
      amc_amount DECIMAL(12,2) NULL DEFAULT NULL,
      mmc_date DATE NULL,
      mmc_amount DECIMAL(12,2) NULL DEFAULT NULL,
      paid_amount DECIMAL(12,2) NULL DEFAULT NULL,
      due_amount DECIMAL(12,2) NULL DEFAULT NULL,
      next_payment_date DATE NULL,
      last_pay_amount DECIMAL(12,2) NULL DEFAULT NULL,
      last_pay_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $pdCols = [
      "domain_name VARCHAR(150) NOT NULL DEFAULT ''",
      "domain_booking_date DATE NULL",
      "domain_amount DECIMAL(12,2) NULL DEFAULT NULL",
      "server_name VARCHAR(150) NOT NULL DEFAULT ''",
      "server_renewal_date DATE NULL",
      "server_amount DECIMAL(12,2) NULL DEFAULT NULL",
      "amc_date DATE NULL",
      "amc_amount DECIMAL(12,2) NULL DEFAULT NULL",
      "mmc_date DATE NULL AFTER amc_amount",
      "mmc_amount DECIMAL(12,2) NULL DEFAULT NULL AFTER mmc_date",
      "paid_amount DECIMAL(12,2) NULL DEFAULT NULL",
      "due_amount DECIMAL(12,2) NULL DEFAULT NULL",
      "next_payment_date DATE NULL",
      "last_pay_amount DECIMAL(12,2) NULL DEFAULT NULL",
      "last_pay_date DATE NULL",
    ];
    foreach ($pdCols as $def) {
      try { $pdo->exec("ALTER TABLE project_details ADD COLUMN $def"); }
      catch (PDOException $e) { if ($e->getCode() !== '42S21') throw $e; }
    }
    // Keep MMC columns right beside the AMC ones.
    $pdo->exec("ALTER TABLE project_details MODIFY COLUMN mmc_date DATE NULL AFTER amc_amount");
    $pdo->exec("ALTER TABLE project_details MODIFY COLUMN mmc_amount DECIMAL(12,2) NULL DEFAULT NULL AFTER mmc_date");
    // Total Cost field retired: drop the column from existing databases.
    try { $pdo->exec("ALTER TABLE project_details DROP COLUMN total_cost"); }
    catch (PDOException $e) { /* already gone — ignore */ }
    try {
      $pdo->exec("ALTER TABLE project_details ADD COLUMN user_id INT NOT NULL DEFAULT 0");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
    try {
      $pdo->exec("ALTER TABLE project_details ADD UNIQUE KEY uq_pd_user_project (user_id, project_name)");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21' && ($e->errorInfo[1] ?? 0) != 1061) throw $e;
    }
    // Project status history: one row per admin flag change (process / complete).
    $pdo->exec("CREATE TABLE IF NOT EXISTS project_status_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      project_name VARCHAR(150) NOT NULL,
      event VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_psl_user_project (user_id, project_name)
    )");
    // One-time catch-up for flags set before the log existed.
    $pdo->exec("INSERT INTO project_status_log (user_id, project_name, event, created_at)
      SELECT p.user_id, p.project_name, 'complete', COALESCE(p.status_updated_at, p.created_at) FROM projects p
      WHERE p.is_complete = 1 AND NOT EXISTS (SELECT 1 FROM project_status_log l WHERE l.user_id = p.user_id AND l.project_name = p.project_name AND l.event = 'complete')");
    $pdo->exec("INSERT INTO project_status_log (user_id, project_name, event, created_at)
      SELECT p.user_id, p.project_name, 'process', COALESCE(p.status_updated_at, p.created_at) FROM projects p
      WHERE p.is_under_process = 1 AND NOT EXISTS (SELECT 1 FROM project_status_log l WHERE l.user_id = p.user_id AND l.project_name = p.project_name AND l.event = 'process')");
    // Website enquiries (contact form). Public submit, admin lists/deletes.
    $pdo->exec("CREATE TABLE IF NOT EXISTS enquiries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      seen_admin TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_enq_seen (seen_admin)
    )");
    try { $pdo->exec("ALTER TABLE enquiries DROP COLUMN company"); }
    catch (PDOException $e) { /* already gone — ignore */ }
    // Per-project user enquiry threads (like complaints): who asked + which project.
    foreach ([
      "user_id INT NOT NULL DEFAULT 0",
      "username VARCHAR(150) NOT NULL DEFAULT ''",
      "project_name VARCHAR(150) NOT NULL DEFAULT ''",
    ] as $def) {
      try { $pdo->exec("ALTER TABLE enquiries ADD COLUMN $def"); }
      catch (PDOException $e) { if ($e->getCode() !== '42S21') throw $e; }
    }
    $pdo->exec("CREATE TABLE IF NOT EXISTS enquiry_responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      enquiry_id INT NOT NULL,
      username VARCHAR(150) NOT NULL DEFAULT '',
      admin_id INT NULL,
      response TEXT NOT NULL,
      seen TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
    )");
    // Brute-force protection: per-identifier failure counters + lockouts.
    // locked_until is a UNIX timestamp (INT) so PHP/MySQL timezone settings
    // can never skew the wait math.
    $pdo->exec("CREATE TABLE IF NOT EXISTS login_attempts (
      login_key VARCHAR(190) NOT NULL PRIMARY KEY,
      kind VARCHAR(10) NOT NULL DEFAULT '',
      failures INT NOT NULL DEFAULT 0,
      locks INT NOT NULL DEFAULT 0,
      locked_until BIGINT NULL DEFAULT NULL
    )");
    // Earlier revision stored wall-clock TIMESTAMPs (timezone-skew prone);
    // normalize once to UNIX timestamps. Harmless if already BIGINT.
    try { $pdo->exec("ALTER TABLE login_attempts MODIFY COLUMN locked_until BIGINT NULL DEFAULT NULL"); }
    catch (PDOException $e) {}
    // Heal rows written in the wall-clock era (values ~2e13 >> real UNIX ~1.8e9).
    try { $pdo->exec("UPDATE login_attempts SET locked_until = NULL WHERE locked_until > 9999999999"); }
    catch (PDOException $e) {}
    // New-user signups notify the admin bell. Backfill runs ONLY on the migrate
    // that first creates the column (existing rows predate notifications);
    // later signups keep DEFAULT 0 so the bell fires for them.
    try {
      $pdo->exec("ALTER TABLE users ADD COLUMN seen_admin TINYINT(1) NOT NULL DEFAULT 0");
      $pdo->exec("UPDATE users SET seen_admin = 1");
    } catch (PDOException $e) {
      if ($e->getCode() !== '42S21') throw $e;
    }
  }
}
