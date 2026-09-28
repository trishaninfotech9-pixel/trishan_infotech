// Admin dashboard shell: injects components/admin-shell.html, wraps content,
// highlights the active section, fills the admin chip + stat cards, wires logout.
(function () {
  const BASE = '../../../';

  async function init() {
    const holder = document.getElementById('adminShell');
    if (!holder) return;
    document.body.classList.add('has-admin-shell');

    try {
      const res = await fetch(BASE + 'components/admin-shell.html');
      if (!res.ok) throw new Error('shell HTTP ' + res.status);
      holder.innerHTML = (await res.text()).split('{{BASE}}').join(BASE);
    } catch (e) {
      return;
    }

    // Wrap page content after the shell so the sidebar offset applies.
    const main = document.createElement('div');
    main.className = 'admin-main';
    Array.from(document.body.children).forEach((el) => {
      if (el.id === 'adminShell' || el.tagName === 'SCRIPT' || el.tagName === 'LINK') return;
      main.appendChild(el);
    });
    document.body.appendChild(main);

    // Active section + Complaint accordion (open when a child is active).
    const page = holder.getAttribute('data-page') || '';
    holder.querySelectorAll('[data-nav]').forEach((a) => {
      if (a.getAttribute('data-nav') === page) a.classList.add('admin-active');
    });
    const groups = [
      { group: 'complaintGroup', parent: 'complaintParent', pages: ['all', 'pending', 'solved', 'ignored'] },
      { group: 'projectGroup', parent: 'projectParent', pages: ['p-all', 'p-complete', 'p-pending'] },
    ];
    groups.forEach((g) => {
      const groupEl = document.getElementById(g.group);
      const parentEl = document.getElementById(g.parent);
      if (!groupEl || !parentEl) return;
      if (g.pages.includes(page)) {
        groupEl.classList.add('open');
        parentEl.classList.add('admin-active');
        parentEl.setAttribute('aria-expanded', 'true');
      }
      parentEl.addEventListener('click', () => {
        const open = groupEl.classList.toggle('open');
        parentEl.setAttribute('aria-expanded', String(open));
      });
    });

    // Admin chip from session.
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    const uname = (admin && admin.username) || 'Admin';
    const chip = document.getElementById('adminChipName');
    if (chip) chip.textContent = uname;
    const avatar = document.getElementById('adminAvatar');
    if (avatar) avatar.textContent = uname.trim().charAt(0).toUpperCase() || 'A';

    // Mobile drawer.
    const menuBtn = document.getElementById('adminMenuBtn');
    const closeBtn = document.getElementById('adminCloseBtn');
    const overlay = document.getElementById('adminOverlay');
    if (menuBtn) menuBtn.addEventListener('click', () => document.body.classList.toggle('admin-nav-open'));
    if (closeBtn) closeBtn.addEventListener('click', () => document.body.classList.remove('admin-nav-open'));
    if (overlay) overlay.addEventListener('click', () => document.body.classList.remove('admin-nav-open'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.body.classList.remove('admin-nav-open');
    });

    // Live record search: filters table rows + cards on the current page.
    const searchInput = holder.querySelector('.admin-search input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        document.querySelectorAll('.admin-main table tbody tr, .admin-main [data-complaint], .admin-main [data-project]').forEach((el) => {
          if (!q) { el.style.display = ''; return; }
          el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      });
    }

    // Logout (shared handler shape with the public header).
    holder.querySelectorAll('[data-logout]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        try { localStorage.removeItem('trishan_user'); localStorage.removeItem('trishan_admin'); } catch (err) {}
        document.body.classList.remove('admin-nav-open');
        location.href = BASE + 'index.html';
      });
    });

    // Date line (e.g. MONDAY, 10 AUGUST), if the page has one.
    try {
      const dateEl = document.getElementById('adminDateLine');
      if (dateEl) {
        dateEl.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();
      }
    } catch (e) {}

    // Notifications: pending-complaint count + dropdown that deep-links.
    const bellBtn = document.getElementById('adminBellBtn');
    const bellCount = document.getElementById('adminBellCount');
    const notifDrop = document.getElementById('adminNotifDrop');
    async function loadNotifs() {
      if (!admin || !admin.id || !bellCount || !notifDrop) return;
      try {
        const res = await fetch(BASE + 'api/accounts/admin/all-complaints.php?admin_id=' + encodeURIComponent(admin.id) + '&filter=unseen');
        const body = await res.json().catch(() => null);
        const items = (body && body.ok && body.complaints) || [];
        bellCount.textContent = items.length > 99 ? '99+' : String(items.length);
        bellCount.classList.toggle('hidden', items.length === 0);
        const esc2 = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        notifDrop.innerHTML = '<div class="admin-notif-head">Notifications (' + items.length + ')</div>' +
          (items.length
            ? items.slice(0, 20).map((c) => {
                const nm = esc2(c.username || [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' '));
                return '<a class="admin-notif-item" data-seen-id="' + c.id + '" href="' + BASE + 'pages/accounts/admin/all_pending_complaint.html?focus=' + c.id + '">' +
                  '<span><span class="t">' + esc2(c.project_name) + '</span><br><span class="s">' + nm + '</span></span>' +
                  '<i class="bi bi-chevron-right" style="color:#5F7E97"></i></a>';
              }).join('')
            : '<div class="admin-notif-empty">No new notifications.</div>');
      } catch (e) {}
    }
    // Clicking a notification marks it seen (count drops), then opens it.
    if (notifDrop) {
      notifDrop.addEventListener('click', async (e) => {
        const a = e.target.closest('.admin-notif-item');
        if (!a || !admin || !admin.id) return;
        e.preventDefault();
        const url = a.href;
        try {
          await fetch(BASE + 'api/accounts/admin/mark-admin-seen.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: admin.id, complaint_id: a.dataset.seenId }),
          });
        } catch (err) {}
        location.href = url;
      });
    }
    if (bellBtn && notifDrop) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const hidden = notifDrop.classList.toggle('hidden');
        bellBtn.setAttribute('aria-expanded', String(!hidden));
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.admin-bell-wrap')) {
          notifDrop.classList.add('hidden');
          bellBtn.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') notifDrop.classList.add('hidden');
      });
      loadNotifs();
      setInterval(loadNotifs, 30000);
    }
    // Stat cards, if the page has any.
    const statEls = document.querySelectorAll('[data-stat]');
    if (statEls.length && admin && admin.id) {
      try {
        const res = await fetch(BASE + 'api/accounts/admin/stats.php?admin_id=' + encodeURIComponent(admin.id));
        const body = await res.json().catch(() => null);
        if (body && body.ok) {
          statEls.forEach((el) => {
            const v = body.stats[el.getAttribute('data-stat')];
            if (v !== undefined) el.textContent = v;
          });
        }
      } catch (e) {}
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
