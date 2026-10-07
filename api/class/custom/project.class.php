<?php
// Project entity. Mirrors vendor/classess/custom/*.class.php pattern.
// ALL project work lives here. Endpoints are thin routers only.
class project extends dbcon {
  // Validates add-project payload (old inline validation moved here).
  // Returns [project, details, budget, opt] or exits with json error.
  public function validateCreate(array $in): array {
    $project = trim((string)($in['project_name'] ?? ''));
    $details = trim((string)($in['details'] ?? ''));
    $budgetRaw = trim((string)($in['budget'] ?? ''));
    $budget = null;
    if ($budgetRaw !== '') {
      if (!is_numeric($budgetRaw) || (float)$budgetRaw < 0) self::json(['ok' => false, 'error' => 'Budget must be a positive number.'], 400);
      $budget = round((float)$budgetRaw, 2);
    }
    $opt = [];
    foreach (['domain_name', 'server_name'] as $k) { $opt[$k] = substr(trim((string)($in[$k] ?? '')), 0, 150); }
    foreach (['domain_booking_date', 'server_renewal_date', 'amc_date', 'mmc_date', 'next_payment_date', 'last_pay_date'] as $k) {
      $v = trim((string)($in[$k] ?? ''));
      if ($v !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) self::json(['ok' => false, 'error' => 'Invalid date for ' . $k . '.'], 400);
      $opt[$k] = $v === '' ? null : $v;
    }
    foreach (['domain_amount', 'server_amount', 'amc_amount', 'mmc_amount', 'paid_amount', 'due_amount', 'last_pay_amount'] as $k) {
      $v = trim((string)($in[$k] ?? ''));
      if ($v !== '' && (!is_numeric($v) || (float)$v < 0)) self::json(['ok' => false, 'error' => 'Invalid amount for ' . $k . '.'], 400);
      $opt[$k] = $v === '' ? null : round((float)$v, 2);
    }
    $user_id = (int)($in['user_id'] ?? 0);
    if ($user_id <= 0) self::json(['ok' => false, 'error' => 'Select a user first.'], 400);
    if ($project === '' || strlen($project) > 150) self::json(['ok' => false, 'error' => 'Project name is required (max 150 chars).'], 400);
    if ($details === '') self::json(['ok' => false, 'error' => 'Project details are required.'], 400);
    if (strlen($details) > 2000) self::json(['ok' => false, 'error' => 'Details too long (max 2000 chars).'], 400);
    if ($budgetRaw === '') self::json(['ok' => false, 'error' => 'Budget is required.'], 400);
    foreach (['domain_name', 'server_name'] as $k) {
      if ($opt[$k] === '') self::json(['ok' => false, 'error' => 'All fields are required: missing ' . $k . '.'], 400);
    }
    foreach (['domain_booking_date', 'server_renewal_date', 'amc_date', 'mmc_date', 'next_payment_date', 'last_pay_date'] as $k) {
      if ($opt[$k] === null) self::json(['ok' => false, 'error' => 'All fields are required: missing ' . $k . '.'], 400);
    }
    foreach (['domain_amount', 'server_amount', 'amc_amount', 'mmc_amount', 'paid_amount', 'last_pay_amount'] as $k) {
      if ($opt[$k] === null) self::json(['ok' => false, 'error' => 'All fields are required: missing ' . $k . '.'], 400);
    }
    $opt['due_amount'] = round(max(0, (float)$budget - (float)$opt['paid_amount']), 2);
    return [$user_id, $project, $details, $budget, $opt];
  }

  public function createValidated(array $in, array $account): int {
    [$user_id, $project, $details, $budget, $opt] = $this->validateCreate($in);
    return $this->addProject($user_id, self::fullName($account), $account['email'], $account['phone'], $project, $details, $budget, $opt);
  }

  // Edit after create: same validation, then UPDATE both tables. Project rename not allowed (key).
  public function updateValidated(array $in, array $account): void {
    [$user_id, $project, $details, $budget, $opt] = $this->validateCreate($in);
    $this->updateProject($user_id, self::fullName($account), $account['email'], $account['phone'], $project, $details, $budget, $opt);
  }

  public function updateProject(int $user_id, string $username, string $email, string $phone, string $project, string $details, float $budget, array $opt): void {
    $pdo = self::conn();
    $stmt = $pdo->prepare('SELECT id FROM projects WHERE user_id = ? AND LOWER(project_name) = LOWER(?) LIMIT 1');
    $stmt->execute([$user_id, $project]);
    $proj = $stmt->fetch();
    if (!$proj) self::json(['ok' => false, 'error' => 'Project not found.'], 404);
    $pdo->prepare('UPDATE projects SET details = ?, username = ? WHERE user_id = ? AND LOWER(project_name) = LOWER(?)')->execute([$details, $username, $user_id, $project]);
    $stmt = $pdo->prepare('UPDATE project_details SET username = ?, email = ?, phone_no = ?, project_details = ?, budget = ?, domain_name = ?, domain_booking_date = ?, domain_amount = ?, server_name = ?, server_renewal_date = ?, server_amount = ?, amc_date = ?, amc_amount = ?, mmc_date = ?, mmc_amount = ?, paid_amount = ?, due_amount = ?, next_payment_date = ?, last_pay_amount = ?, last_pay_date = ? WHERE user_id = ? AND LOWER(project_name) = LOWER(?)');
    $stmt->execute([$username, $email, $phone, $details, $budget, $opt['domain_name'], $opt['domain_booking_date'], $opt['domain_amount'], $opt['server_name'], $opt['server_renewal_date'], $opt['server_amount'], $opt['amc_date'], $opt['amc_amount'], $opt['mmc_date'], $opt['mmc_amount'], $opt['paid_amount'], $opt['due_amount'], $opt['next_payment_date'], $opt['last_pay_amount'], $opt['last_pay_date'], $user_id, $project]);
    if ($stmt->rowCount() === 0) {
      $chk = $pdo->prepare('SELECT id FROM project_details WHERE user_id = ? AND LOWER(project_name) = LOWER(?) LIMIT 1');
      $chk->execute([$user_id, $project]);
      if (!$chk->fetch()) self::json(['ok' => false, 'error' => 'Project details not found.'], 404);
    }
  }

  public function addProject(int $user_id, string $username, string $email, string $phone, string $project, string $details, float $budget, array $opt): int {
    $pdo = self::conn();
    try {
      $stmt = $pdo->prepare('INSERT INTO projects (user_id, username, project_name, details) VALUES (?, ?, ?, ?)');
      $stmt->execute([$user_id, $username, $project, $details]);
      $project_id = (int)$pdo->lastInsertId();
    } catch (PDOException $e) {
      if ($e->getCode() === '23000') self::json(['ok' => false, 'error' => 'This project already exists for the user.'], 409);
      throw $e;
    }
    $stmt = $pdo->prepare('INSERT INTO project_details (user_id, username, email, phone_no, project_name, project_details, budget, domain_name, domain_booking_date, domain_amount, server_name, server_renewal_date, server_amount, amc_date, amc_amount, mmc_date, mmc_amount, paid_amount, due_amount, next_payment_date, last_pay_amount, last_pay_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE username = VALUES(username), email = VALUES(email), phone_no = VALUES(phone_no), project_details = VALUES(project_details), budget = VALUES(budget), domain_name = VALUES(domain_name), domain_booking_date = VALUES(domain_booking_date), domain_amount = VALUES(domain_amount), server_name = VALUES(server_name), server_renewal_date = VALUES(server_renewal_date), server_amount = VALUES(server_amount), amc_date = VALUES(amc_date), amc_amount = VALUES(amc_amount), mmc_date = VALUES(mmc_date), mmc_amount = VALUES(mmc_amount), paid_amount = VALUES(paid_amount), due_amount = VALUES(due_amount), next_payment_date = VALUES(next_payment_date), last_pay_amount = VALUES(last_pay_amount), last_pay_date = VALUES(last_pay_date)');
    $stmt->execute([$user_id, $username, $email, $phone, $project, $details, $budget, $opt['domain_name'], $opt['domain_booking_date'], $opt['domain_amount'], $opt['server_name'], $opt['server_renewal_date'], $opt['server_amount'], $opt['amc_date'], $opt['amc_amount'], $opt['mmc_date'], $opt['mmc_amount'], $opt['paid_amount'], $opt['due_amount'], $opt['next_payment_date'], $opt['last_pay_amount'], $opt['last_pay_date']]);
    return $project_id;
  }

  public function deleteById(int $project_id): array {
    $pdo = self::conn();
    $stmt = $pdo->prepare('SELECT user_id, project_name FROM projects WHERE id = ? LIMIT 1');
    $stmt->execute([$project_id]);
    $proj = $stmt->fetch();
    if (!$proj) self::json(['ok' => false, 'error' => 'Project not found.'], 404);
    $pdo->prepare('DELETE FROM projects WHERE id = ?')->execute([$project_id]);
    $pdo->prepare('DELETE FROM project_details WHERE user_id = ? AND LOWER(project_name) = LOWER(?)')->execute([$proj['user_id'], $proj['project_name']]);
    return $proj;
  }

  public function deleteComplaintProject(int $user_id, string $project_name): void {
    $stmt = self::conn()->prepare('DELETE FROM complaints WHERE user_id = ? AND project_name = ?');
    $stmt->execute([$user_id, $project_name]);
    if ($stmt->rowCount() === 0) self::json(['ok' => false, 'error' => 'Project not found.'], 404);
  }

  public function setFlag(int $user_id, string $username, string $project, string $event, bool $on): void {
    $pdo = self::conn();
    if ($event === 'complete') {
      if ($on) {
        $pdo->prepare('INSERT INTO projects (user_id, username, project_name, details, is_complete, is_under_process, status_updated_at) VALUES (?, ?, ?, ?, 1, 0, NOW()) ON DUPLICATE KEY UPDATE is_complete = 1, is_under_process = 0, status_updated_at = NOW()')->execute([$user_id, $username, $project, '']);
        $pdo->prepare("INSERT INTO project_status_log (user_id, project_name, event) VALUES (?, ?, 'complete')")->execute([$user_id, $project]);
      } else {
        $pdo->prepare('INSERT INTO projects (user_id, username, project_name, details, is_complete, is_under_process, status_updated_at) VALUES (?, ?, ?, ?, 0, 0, NOW()) ON DUPLICATE KEY UPDATE is_complete = 0, status_updated_at = NOW()')->execute([$user_id, $username, $project, '']);
      }
    } else {
      if ($on) {
        $pdo->prepare('INSERT INTO projects (user_id, username, project_name, details, is_complete, is_under_process, status_updated_at) VALUES (?, ?, ?, ?, 0, 1, NOW()) ON DUPLICATE KEY UPDATE is_under_process = 1, is_complete = 0, status_updated_at = NOW()')->execute([$user_id, $username, $project, '']);
        $pdo->prepare("INSERT INTO project_status_log (user_id, project_name, event) VALUES (?, ?, 'process')")->execute([$user_id, $project]);
      } else {
        $pdo->prepare('INSERT INTO projects (user_id, username, project_name, details, is_complete, is_under_process, status_updated_at) VALUES (?, ?, ?, ?, 0, 0, NOW()) ON DUPLICATE KEY UPDATE is_under_process = 0, status_updated_at = NOW()')->execute([$user_id, $username, $project, '']);
      }
    }
  }

  public function stats(): array {
    $pdo = self::conn();
    return [
      'users' => (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),
      'pending' => (int)$pdo->query('SELECT COUNT(*) FROM complaints c WHERE NOT EXISTS (SELECT 1 FROM complaint_responses r WHERE r.complaint_id = c.id)')->fetchColumn(),
      'solved' => (int)$pdo->query('SELECT COUNT(*) FROM complaints WHERE is_solved = 1')->fetchColumn(),
      'responses' => (int)$pdo->query('SELECT COUNT(*) FROM complaint_responses')->fetchColumn(),
      'enquiries' => (int)$pdo->query('SELECT COUNT(*) FROM enquiries')->fetchColumn(),
      'unseen_enquiries' => (int)$pdo->query('SELECT COUNT(*) FROM enquiries WHERE seen_admin = 0')->fetchColumn(),
    ];
  }

  // Admin view: assigned + complaint-sourced merged. Moved from user-projects.php.
  public function forAdmin(int $user_id, string $uname): array {
    $pdo = self::conn();
    $stmt = $pdo->prepare('SELECT id, project_name, details, is_complete, is_under_process, created_at FROM projects WHERE user_id = ? ORDER BY id DESC');
    $stmt->execute([$user_id]);
    $assigned = $stmt->fetchAll();
    $stmt = $pdo->prepare('SELECT project_name, MIN(created_at) AS created_at FROM complaints WHERE user_id = ? GROUP BY project_name ORDER BY created_at DESC');
    $stmt->execute([$user_id]);
    $fromComplaints = $stmt->fetchAll();
    $stmt = $pdo->prepare('SELECT c.project_name, i.description FROM complaint_issues i JOIN complaints c ON c.id = i.complaint_id WHERE c.user_id = ? ORDER BY i.id DESC');
    $stmt->execute([$user_id]);
    $issueDetails = [];
    foreach ($stmt->fetchAll() as $row) {
      $key = strtolower(trim($row['project_name']));
      if (!isset($issueDetails[$key])) $issueDetails[$key] = $row['description'];
    }
    $stmt = $pdo->prepare('SELECT DISTINCT LOWER(TRIM(project_name)) AS nm FROM complaints c WHERE c.user_id = ? AND NOT EXISTS (SELECT 1 FROM complaint_responses r WHERE r.complaint_id = c.id)');
    $stmt->execute([$user_id]);
    $openNames = [];
    foreach ($stmt->fetchAll() as $row) { $openNames[$row['nm']] = true; }
    $stmt = $pdo->prepare('SELECT project_name, budget FROM project_details WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $budgets = [];
    foreach ($stmt->fetchAll() as $row) { $budgets[strtolower(trim($row['project_name']))] = $row['budget']; }
    $stmt = $pdo->prepare('SELECT * FROM project_details WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $pdMap = [];
    foreach ($stmt->fetchAll() as $row) { $pdMap[strtolower(trim($row['project_name']))] = $row; }
    foreach ($assigned as &$p) { $p['pd'] = $pdMap[strtolower(trim($p['project_name']))] ?? null; }
    unset($p);
    $seen = [];
    foreach ($assigned as &$p) {
      $p['source'] = 'assigned';
      $key = strtolower(trim($p['project_name']));
      $seen[$key] = true;
      $p['open'] = isset($openNames[$key]);
      $p['budget'] = $budgets[$key] ?? null;
      $p['username'] = $uname;
      $p['user_id'] = $user_id;
    }
    unset($p);
    foreach ($fromComplaints as $c) {
      $key = strtolower(trim($c['project_name']));
      if ($key === '' || isset($seen[$key])) continue;
      $seen[$key] = true;
      $assigned[] = ['id' => 0, 'project_name' => $c['project_name'], 'details' => $issueDetails[$key] ?? '', 'budget' => $budgets[$key] ?? null, 'username' => $uname, 'user_id' => $user_id, 'created_at' => $c['created_at'], 'source' => 'complaint', 'status' => 'pending', 'open' => isset($openNames[$key])];
    }
    foreach ($assigned as &$p) {
      $p['status'] = ((int)($p['is_complete'] ?? 0) === 1) ? 'complete' : (((int)($p['is_under_process'] ?? 0) === 1) ? 'process' : 'pending');
    }
    unset($p);
    $stmt = $pdo->prepare('SELECT c.id, c.project_name, c.is_solved, c.is_ignored, EXISTS(SELECT 1 FROM complaint_responses r WHERE r.complaint_id = c.id) AS has_resp FROM complaints c WHERE c.user_id = ? ORDER BY c.id DESC');
    $stmt->execute([$user_id]);
    $linkMap = [];
    foreach ($stmt->fetchAll() as $row) {
      $key = strtolower(trim($row['project_name']));
      if (isset($linkMap[$key])) continue;
      if ((int)$row['is_ignored'] === 1) $sec = 'all_ignore_complaint';
      elseif ((int)$row['is_solved'] === 1) $sec = 'all_sloved_complaint';
      elseif (!(int)$row['has_resp']) $sec = 'all_pending_complaint';
      else $sec = 'all_complaint';
      $linkMap[$key] = ['complaint_id' => (int)$row['id'], 'page' => $sec];
    }
    foreach ($assigned as &$p) {
      $key = strtolower(trim($p['project_name']));
      $p['complaint_id'] = $linkMap[$key]['complaint_id'] ?? 0;
      $p['page'] = $linkMap[$key]['page'] ?? '';
    }
    unset($p);
    return $assigned;
  }

  // User view. Moved from my-projects.php.
  public function forUser(int $user_id): array {
    $pdo = self::conn();
    $stmt = $pdo->prepare('SELECT id, first_name, middle_name, last_name, email, phone, status_seen_at FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$user_id]);
    $account = $stmt->fetch();
    if (!$account) self::json(['ok' => false, 'error' => 'User not found.'], 401);
    $uname = self::fullName($account);
    $stmt = $pdo->prepare('SELECT id, project_name, details, is_complete, is_under_process, status_updated_at, created_at FROM projects WHERE user_id = ? ORDER BY id DESC');
    $stmt->execute([$user_id]);
    $assigned = $stmt->fetchAll();
    $stmt = $pdo->prepare('SELECT project_name, MIN(created_at) AS created_at FROM complaints WHERE user_id = ? GROUP BY project_name ORDER BY created_at DESC');
    $stmt->execute([$user_id]);
    $fromComplaints = $stmt->fetchAll();
    $stmt = $pdo->prepare('SELECT c.project_name, i.description FROM complaint_issues i JOIN complaints c ON c.id = i.complaint_id WHERE c.user_id = ? ORDER BY i.id DESC');
    $stmt->execute([$user_id]);
    $issueDetails = [];
    foreach ($stmt->fetchAll() as $row) {
      $key = strtolower(trim($row['project_name']));
      if (!isset($issueDetails[$key])) $issueDetails[$key] = $row['description'];
    }
    $stmt = $pdo->prepare('SELECT project_name, budget FROM project_details WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $budgets = [];
    foreach ($stmt->fetchAll() as $row) { $budgets[strtolower(trim($row['project_name']))] = $row['budget']; }
    $stmt = $pdo->prepare('SELECT id, project_name FROM project_details WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $pdIds = [];
    foreach ($stmt->fetchAll() as $row) { $pdIds[strtolower(trim($row['project_name']))] = $row['id']; }
    $stmt = $pdo->prepare('SELECT * FROM project_details WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $pdMap = [];
    foreach ($stmt->fetchAll() as $row) { $pdMap[strtolower(trim($row['project_name']))] = $row; }
    foreach ($assigned as &$p) { $p['pd'] = $pdMap[strtolower(trim($p['project_name']))] ?? null; }
    unset($p);
    $seen = [];
    foreach ($assigned as &$p) {
      $p['source'] = 'assigned';
      $key = strtolower(trim($p['project_name']));
      $seen[$key] = true;
      $p['budget'] = $budgets[$key] ?? null;
      $p['pd_id'] = $pdIds[$key] ?? null;
      $p['username'] = $uname;
      $p['email'] = $account['email'];
      $p['phone_no'] = $account['phone'];
      $p['status'] = ((int)($p['is_complete'] ?? 0) === 1) ? 'complete' : (((int)($p['is_under_process'] ?? 0) === 1) ? 'process' : 'pending');
    }
    unset($p);
    foreach ($fromComplaints as $c) {
      $key = strtolower(trim($c['project_name']));
      if ($key === '' || isset($seen[$key])) continue;
      $seen[$key] = true;
      $assigned[] = ['id' => 0, 'pd_id' => $pdIds[$key] ?? null, 'username' => $uname, 'email' => $account['email'], 'phone_no' => $account['phone'], 'project_name' => $c['project_name'], 'details' => $issueDetails[$key] ?? '', 'budget' => $budgets[$key] ?? null, 'created_at' => $c['created_at'], 'source' => 'complaint', 'status' => 'pending'];
    }
    return ['projects' => $assigned, 'status_seen_at' => $account['status_seen_at']];
  }

  public function details(int $user_id, string $project): ?array {
    $pdo = self::conn();
    $stmt = $pdo->prepare('SELECT id, username, email, phone_no, project_name, project_details, budget, domain_name, domain_booking_date, domain_amount, server_name, server_renewal_date, server_amount, amc_date, amc_amount, mmc_date, mmc_amount, paid_amount, due_amount, next_payment_date, last_pay_amount, last_pay_date, created_at FROM project_details WHERE user_id = ? AND LOWER(project_name) = LOWER(?) LIMIT 1');
    $stmt->execute([$user_id, $project]);
    $row = $stmt->fetch();
    if ($row) {
      $st = $pdo->prepare('SELECT is_complete, is_under_process FROM projects WHERE user_id = ? AND LOWER(project_name) = LOWER(?) LIMIT 1');
      $st->execute([$user_id, $project]);
      $pr = $st->fetch();
      $row['status'] = ($pr && (int)$pr['is_complete'] === 1) ? 'complete' : (($pr && (int)$pr['is_under_process'] === 1) ? 'process' : 'pending');
    }
    return $row ?: null;
  }

  public function projectLog(int $user_id, string $project): array {
    $pdo = self::conn();
    $stmt = $pdo->prepare('SELECT id, is_solved, solved_at, created_at FROM complaints WHERE user_id = ? AND LOWER(project_name) = LOWER(?) ORDER BY created_at');
    $stmt->execute([$user_id, $project]);
    $complaints = $stmt->fetchAll();
    $stmt = $pdo->prepare('SELECT event, created_at FROM project_status_log WHERE user_id = ? AND LOWER(project_name) = LOWER(?) ORDER BY created_at');
    $stmt->execute([$user_id, $project]);
    $events = $stmt->fetchAll();
    $stmt = $pdo->prepare('SELECT e.id, e.created_at, EXISTS(SELECT 1 FROM enquiry_responses r WHERE r.enquiry_id = e.id) AS has_resp, (SELECT MAX(r.created_at) FROM enquiry_responses r WHERE r.enquiry_id = e.id) AS replied_at FROM enquiries e WHERE e.user_id = ? AND LOWER(e.project_name) = LOWER(?) ORDER BY created_at');
    $stmt->execute([$user_id, $project]);
    return ['complaints' => $complaints, 'events' => $events, 'enquiries' => $stmt->fetchAll()];
  }
}
