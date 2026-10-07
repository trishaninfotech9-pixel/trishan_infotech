// Admin dashboard shell: injects components/admin-shell, wraps content,
// highlights the active section, fills the admin chip + stat cards, wires logout.
(function () {
  const BASE = '../../../';

  async function init() {
    const holder = document.getElementById('adminShell');
    if (!holder) return;
    document.body.classList.add('has-admin-shell');

    try {
      const res = await fetch(BASE + 'components/admin-shell');
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
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        document.body.classList.remove('admin-nav-open');
        if (typeof trishanLogout === 'function') await trishanLogout(BASE);
        else {
          try { localStorage.removeItem('trishan_user'); localStorage.removeItem('trishan_admin'); } catch (err) {}
        }
        location.href = BASE + 'index';
      });
    });

    // Date line (e.g. MONDAY, 10 AUGUST), if the page has one.
    try {
      const dateEl = document.getElementById('adminDateLine');
      if (dateEl) {
        dateEl.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();
      }
    } catch (e) {}

    // Notifications: unseen complaints + unseen enquiries + new signups, deep-linked.
    const bellBtn = document.getElementById('adminBellBtn');
    const bellCount = document.getElementById('adminBellCount');
    const notifDrop = document.getElementById('adminNotifDrop');
    let lastNotifTotal = -1; // -1 = first load (no ring yet)
    function ringBell() {
      if (!bellBtn || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      bellBtn.classList.remove('bell-ring');
      void bellBtn.offsetWidth; // restart the keyframes
      bellBtn.classList.add('bell-ring');
    }
    async function loadNotifs() {
      if (!admin || !admin.id || !bellCount || !notifDrop) return;
      try {
        const [rc, re, ru] = await Promise.all([
          fetch(BASE + 'api/accounts/admin/all-complaints.php?admin_id=' + encodeURIComponent(admin.id) + '&filter=unseen'),
          fetch(BASE + 'api/accounts/admin/enquiries.php?admin_id=' + encodeURIComponent(admin.id) + '&filter=unseen'),
          fetch(BASE + 'api/accounts/admin/unseen-users.php?admin_id=' + encodeURIComponent(admin.id)),
        ]);
        const body = await rc.json().catch(() => null);
        const ebody = await re.json().catch(() => null);
        const ubody = await ru.json().catch(() => null);
        const items = (body && body.ok && body.complaints) || [];
        const enqs = (ebody && ebody.ok && ebody.enquiries) || [];
        const signups = (ubody && ubody.ok && ubody.users) || [];
        const total = items.length + enqs.length + signups.length;
        bellCount.textContent = total > 99 ? '99+' : String(total);
        bellCount.classList.toggle('hidden', total === 0);
        if (lastNotifTotal !== -1 && total > lastNotifTotal) ringBell();
        lastNotifTotal = total;
        const esc2 = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const fullName = (o) => [o.first_name, o.middle_name, o.last_name].filter(Boolean).join(' ');
        notifDrop.innerHTML = '<div class="admin-notif-head">Notifications (' + total + ')</div>' +
          (total
            ? signups.slice(0, 20).map((u) =>
                '<a class="admin-notif-item" data-kind="user" data-seen-id="' + u.id + '" href="' + BASE + 'pages/accounts/admin/users">' +
                  '<span><span class="t">New user: ' + esc2(fullName(u)) + '</span><br><span class="s">' + esc2(u.email || u.phone || '') + '</span></span>' +
                  '<i class="bi bi-chevron-right" style="color:#5F7E97"></i></a>'
              ).join('') +
              items.slice(0, 20).map((c) => {
                const nm = esc2(c.username || fullName(c));
                return '<a class="admin-notif-item" data-kind="complaint" data-seen-id="' + c.id + '" href="' + BASE + 'pages/accounts/admin/all_pending_complaint?focus=' + c.id + '">' +
                  '<span><span class="t">' + esc2(c.project_name) + '</span><br><span class="s">' + nm + '</span></span>' +
                  '<i class="bi bi-chevron-right" style="color:#5F7E97"></i></a>';
              }).join('') +
              enqs.slice(0, 20).map((q) => {
                const nm = esc2(q.username || q.name);
                return '<a class="admin-notif-item" data-kind="enquiry" data-seen-id="' + q.id + '" href="' + BASE + 'pages/accounts/admin/all_enquiry">' +
                  '<span><span class="t">Enquiry: ' + esc2(q.project_name || 'Website') + '</span><br><span class="s">' + nm + '</span></span>' +
                  '<i class="bi bi-chevron-right" style="color:#5F7E97"></i></a>';
              }).join('')
            : '<div class="admin-notif-empty">No new notifications.</div>');
      } catch (e) {}
    }
    // Clicking a notification marks it seen (count drops), then opens its area:
    // new user → Users, complaint → Pending Complaint, enquiry → Enquiry.
    if (notifDrop) {
      notifDrop.addEventListener('click', async (e) => {
        const a = e.target.closest('.admin-notif-item');
        if (!a || !admin || !admin.id) return;
        e.preventDefault();
        const url = a.href;
        const kind = a.dataset.kind || 'complaint';
        const seenUrl = kind === 'user' ? 'api/accounts/admin/mark-user-seen.php'
          : (kind === 'enquiry' ? 'api/accounts/admin/mark-enquiry-seen.php' : 'api/accounts/admin/mark-admin-seen.php');
        const seenBody = kind === 'user' ? { admin_id: admin.id, user_id: a.dataset.seenId }
          : (kind === 'enquiry' ? { admin_id: admin.id, enquiry_id: a.dataset.seenId }
          : { admin_id: admin.id, complaint_id: a.dataset.seenId });
        try {
          await fetch(BASE + seenUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: (typeof trishanHeaders === 'function' ? trishanHeaders() : { 'Content-Type': 'application/json' }),
            body: JSON.stringify(seenBody),
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
    // Stat cards, if the page has any — count up for a live-dashboard feel.
    const statEls = document.querySelectorAll('[data-stat]');
    if (statEls.length && admin && admin.id) {
      try {
        const res = await fetch(BASE + 'api/accounts/admin/stats.php?admin_id=' + encodeURIComponent(admin.id));
        const body = await res.json().catch(() => null);
        if (body && body.ok) {
          const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
          statEls.forEach((el, i) => {
            const v = body.stats[el.getAttribute('data-stat')];
            if (v === undefined) return;
            const end = Math.max(0, parseInt(v, 10) || 0);
            if (reduced || !window.anime) { el.textContent = end; return; }
            const proxy = { n: 0 };
            anime.animate(proxy, {
              n: [0, end], duration: 1100, delay: i * 120, ease: 'out(3)',
              onUpdate: () => { el.textContent = Math.round(proxy.n); },
            });
          });
        }
      } catch (e) {}
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
