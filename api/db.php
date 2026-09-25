<?php
// Shared MySQL connection (PDO). Local DB: root / 123456 / trishan_db
function db() {
  static $pdo = null;
  if ($pdo === null) {
    $pdo = new PDO(
      'mysql:host=127.0.0.1;port=3306;dbname=trishan_db;charset=utf8mb4',
      'root',
      '',
      [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      ]
    );
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(50) NOT NULL,
      middle_name VARCHAR(50) NULL,
      last_name VARCHAR(50) NOT NULL,
      phone VARCHAR(15) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
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
    $pdo->exec("UPDATE complaints c JOIN users u ON u.id = c.user_id SET c.username = TRIM(CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)) WHERE c.username = ''");
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
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
  }
  return $pdo;
}

function json($data, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode($data);
  exit;
}
