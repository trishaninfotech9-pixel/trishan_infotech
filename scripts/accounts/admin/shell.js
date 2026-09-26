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
    const overlay = document.getElementById('adminOverlay');
    if (menuBtn) menuBtn.addEventListener('click', () => document.body.classList.toggle('admin-nav-open'));
    if (overlay) overlay.addEventListener('click', () => document.body.classList.remove('admin-nav-open'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.body.classList.remove('admin-nav-open');
    });

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
