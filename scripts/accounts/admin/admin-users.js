// pages/accounts/admin/users logic: user cards + search, click a card to
// open users_page for that user. Delete stays inline on each card.
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!admin) { location.href = 'admin'; return; }
    document.getElementById('adminUsersName').textContent = admin.username || 'Admin';

    const box = document.getElementById('userCards');
    const search = (typeof trishanSearchBox === 'function') ? trishanSearchBox('[data-search-box]') : null;
    let allUsers = [];
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const trashSVG = '<i class="bi bi-trash3 text-red-500" style="font-size:17px"></i>';

    async function api(url, opts, _retried) {
      opts = opts || {};
      opts.credentials = 'same-origin';
      const headers = { 'Content-Type': 'application/json' };
      try {
        const a = JSON.parse(localStorage.getItem('trishan_admin') || 'null');
        if (a && a.csrf) headers['X-CSRF-Token'] = a.csrf;
      } catch (e) {}
      opts.headers = Object.assign(headers, opts.headers || {});
      if (_retried) delete opts.headers['X-CSRF-Token'];
      const res = await fetch(url, opts);
      const body = await res.json().catch(() => null);
      if (body && body.error === 'Invalid CSRF token.' && !_retried) {
        try {
          const r = await fetch('../../../api/accounts/csrf.php', { credentials: 'same-origin' });
          const b = await r.json().catch(() => null);
          if (b && b.ok && b.csrf) {
            try {
              const a = JSON.parse(localStorage.getItem('trishan_admin') || 'null') || {};
              a.csrf = b.csrf;
              localStorage.setItem('trishan_admin', JSON.stringify(a));
            } catch (e) {}
            delete opts.headers['X-CSRF-Token'];
            return api(url, opts, true);
          }
        } catch (e) {}
      }
      if (!body || !body.ok) throw new Error((body && body.error) || 'Request failed.');
      return body;
    }

    function userDisplayName(u) {
      return [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ') || 'Unnamed';
    }

    function renderUserCards() {
      const q = (search && search.value.trim().toLowerCase()) || '';
      const users = !q ? allUsers : allUsers.filter((u) => {
        const hay = userDisplayName(u) + ' ' + (u.email || '') + ' ' + (u.phone || '');
        return hay.toLowerCase().indexOf(q) !== -1;
      });
      if (!users.length) {
        box.innerHTML = '<div class="border border-navy-100 rounded p-5 text-center bg-white col-span-full"><p class="text-sm text-navy-900/60">' + (q ? 'No users match your search.' : 'No users yet.') + '</p></div>';
        return;
      }
      box.innerHTML = users.map((u) => {
        const name = userDisplayName(u);
        const n = +u.project_count || 0;
        return '<div class="ucard bg-white border border-navy-100 rounded-xl p-4 sm:p-5 shadow-sm hover:border-navy-700 hover:shadow transition" data-user="' + u.id + '">' +
          '<div class="w-full flex items-center gap-2">' +
            '<a href="users_page?user_id=' + u.id + '" class="flex-1 flex items-center gap-3 text-left min-w-0">' +
              '<span class="w-10 h-10 shrink-0 rounded-full bg-navy-50 text-navy font-extrabold flex items-center justify-center">' + esc(name.trim().charAt(0).toUpperCase() || '?') + '</span>' +
              '<span class="min-w-0 flex-1"><span class="block font-bold text-navy leading-snug break-words">' + esc(name) + '</span>' +
              '<span class="block text-[12px] text-navy-900/50 break-all">' + esc(u.email || '') + '</span>' +
              (u.phone ? '<span class="block text-[12px] text-navy-900/50">' + esc(u.phone) + '</span>' : '') +
              '<span class="inline-block mt-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full ' + (n ? 'text-navy bg-navy-50' : 'text-navy-900/40 bg-navy-50/60') + '">' + n + (n === 1 ? ' project' : ' projects') + '</span></span>' +
            '</a>' +
            '<button type="button" class="u-user-del shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition" data-id="' + u.id + '" data-name="' + esc(name) + '" aria-label="Delete user ' + esc(name) + '">' + trashSVG + '</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    async function loadUserList() {
      box.innerHTML = '<p class="text-sm text-navy-900/60 text-center col-span-full">Loading…</p>';
      try {
        const body = await api('../../../api/accounts/admin/list-users.php?admin_id=' + encodeURIComponent(admin.id));
        allUsers = ((body.users || [])).slice().sort((a, b) =>
          (userDisplayName(a) || '').localeCompare(userDisplayName(b) || '', undefined, { sensitivity: 'base' }));
        renderUserCards();
      } catch (err) {
        box.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white col-span-full"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
      }
    }

    if (search) search.addEventListener('input', renderUserCards);

    // Delete user + all their projects, complaints, responses.
    box.addEventListener('click', async (e) => {
      const btn = e.target.closest('.u-user-del');
      if (!btn) return;
      e.preventDefault();
      const uid = btn.dataset.id;
      const uname = btn.dataset.name || 'this user';
      if (!confirm('Delete user "' + uname + '"? This removes their projects, complaints and responses. This cannot be undone.')) return;
      btn.disabled = true;
      btn.style.opacity = '0.5';
      try {
        await api('../../../api/accounts/admin/delete-user.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_id: admin.id, user_id: uid }),
        });
        allUsers = allUsers.filter((x) => String(x.id) !== String(uid));
        renderUserCards();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });

    await loadUserList();
  });
})();
