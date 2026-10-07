// Project list pages (all/complete/pending): user cards + DB table.
(function () {
  // Set by each page before this script runs: 'all' | 'complete' | 'pending'.
  const MODE = window.ADMIN_PROJECT_MODE || 'all';
  document.addEventListener('DOMContentLoaded', async () => {
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!admin) { location.href = 'admin'; return; }
    const hello = document.getElementById('adminProjectsName');
    if (hello) hello.textContent = admin.username || 'Admin';

    const cards = document.getElementById('userCards');
    const search = (typeof trishanSearchBox === 'function') ? trishanSearchBox('[data-search-box]') : null;
    let allUsers = [];
    let selectedUid = '';
    let selectedUname = '';
    const showCheck = MODE === 'all';
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtBudget = (b) => (b !== null && b !== '' && b !== undefined) ? '₹' + esc(b) : '<span class="text-navy-900/40">—</span>';

    function renderCards() {
      const q = (search && search.value.trim().toLowerCase()) || '';
      // Pending page shows only users with pending projects; Complete page only
      // users with complete projects; All page shows everyone (unchanged).
      let users = (MODE === 'pending') ? allUsers.filter((u) => (+u.pending_count || 0) > 0)
        : (MODE === 'complete' ? allUsers.filter((u) => (+u.complete_count || 0) > 0) : allUsers);
      if (q) users = users.filter((u) => {
        const hay = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ') + ' ' + (u.email || '') + ' ' + (u.phone || '');
        return hay.toLowerCase().indexOf(q) !== -1;
      });
      if (!users.length) {
        cards.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white col-span-full"><p class="text-sm text-navy-900/60">' + (q ? 'No users match your search.' : (MODE === 'all' ? 'No users yet.' : 'No users with ' + MODE + ' projects.')) + '</p></div>';
        return;
      }
      cards.innerHTML = users.map((u) => {
          const name = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ') || 'Unnamed';
          const n = MODE === 'pending' ? (+u.pending_count || 0) : (MODE === 'complete' ? (+u.complete_count || 0) : (+u.project_count || 0));
          return '<button type="button" data-uid="' + u.id + '" data-name="' + esc(name) + '" class="ucard text-left bg-white border border-navy-100 rounded-xl p-4 sm:p-5 shadow-sm hover:border-navy-700 hover:shadow transition">' +
            '<div class="flex items-center gap-3 mb-2">' +
              '<span class="w-10 h-10 shrink-0 rounded-full bg-navy-50 text-navy font-extrabold flex items-center justify-center">' + esc(name.trim().charAt(0).toUpperCase() || '?') + '</span>' +
              '<span class="min-w-0 flex-1"><span class="block font-bold text-navy leading-snug break-words">' + esc(name) + '</span>' +
              '<span class="block text-[12px] text-navy-900/50 break-all">' + esc(u.email || '') + '</span></span>' +
            '</div>' +
            (u.phone ? '<p class="text-[13px] text-navy-900/60 mb-2"><i class="bi bi-telephone me-1"></i>' + esc(u.phone) + '</p>' : '') +
            '<span class="inline-block text-[12px] font-bold px-2.5 py-1 rounded-full ' + (n ? 'text-navy bg-navy-50' : 'text-navy-900/40 bg-navy-50/60') + '">' +
              n + (n === 1 ? ' project' : ' projects') + '</span>' +
          '</button>';
        }).join('');
        paintSelected();
    }

    async function loadUsers() {
      cards.innerHTML = '<p class="text-sm text-navy-900/60 text-center col-span-full">Loading users…</p>';
      try {
        const res = await fetch('../../../api/accounts/admin/list-users.php?admin_id=' + encodeURIComponent(admin.id));
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Failed to load users.');
        allUsers = body.users || [];
        renderCards();
      } catch (err) {
        cards.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white col-span-full"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
      }
    }

    if (search) search.addEventListener('input', renderCards);

    function paintSelected() {
      cards.querySelectorAll('.ucard').forEach((c) => {
        const on = String(c.dataset.uid) === String(selectedUid);
        c.classList.toggle('border-navy-700', on);
        c.classList.toggle('ring-2', on);
        c.classList.toggle('ring-navy-700', on);
        c.classList.toggle('border-navy-100', !on);
      });
    }

    // Project popup: selected user's projects (mode-filtered). Built once, filled per click.
    let pModal = document.getElementById('projListModal');
    if (!pModal) {
      pModal = document.createElement('div');
      pModal.id = 'projListModal';
      pModal.className = 'hidden fixed inset-0 z-[80] flex items-center justify-center p-4';
      pModal.innerHTML =
        '<div class="projlist-overlay absolute inset-0 bg-navy-900/50"></div>' +
        '<div class="relative bg-white rounded-2xl shadow-sm max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6">' +
          '<button type="button" class="projlist-close absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-navy-50 transition" aria-label="Close"><i class="bi bi-x-lg text-navy"></i></button>' +
          '<div id="projListModalBody" class="space-y-3"></div>' +
        '</div>';
      document.body.appendChild(pModal);
      pModal.querySelector('.projlist-overlay').addEventListener('click', () => pModal.classList.add('hidden'));
      pModal.querySelector('.projlist-close').addEventListener('click', () => pModal.classList.add('hidden'));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') pModal.classList.add('hidden'); });
    }
    const modeLabel = MODE === 'pending' ? 'Pending' : (MODE === 'complete' ? 'Complete' : 'All');

    async function openUserPopup(card) {
      const uid = card.dataset.uid;
      const uname = card.dataset.name || 'User';
      selectedUid = uid;
      selectedUname = uname;
      paintSelected();
      const bodyEl = document.getElementById('projListModalBody');
      bodyEl.innerHTML =
        '<p class="font-extrabold text-xl text-navy break-words pr-8">' + esc(uname) + '</p>' +
        '<p class="text-[13px] text-navy-900/60">' + modeLabel + ' projects</p>' +
        '<div class="projlist-items space-y-3"><p class="text-sm text-navy-900/60 text-center">Loading…</p></div>';
      pModal.classList.remove('hidden');
      const itemsEl = bodyEl.querySelector('.projlist-items');
      try {
        const res = await fetch('../../../api/accounts/admin/user-projects.php?admin_id=' + encodeURIComponent(admin.id) + '&user_id=' + encodeURIComponent(uid));
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Failed to load.');
        let rows = body.projects || [];
        if (MODE === 'pending') rows = rows.filter((p) => (p.status || 'pending') !== 'complete');
        else if (MODE !== 'all') rows = rows.filter((p) => (p.status || 'pending') === MODE);
        if (!rows.length) {
          itemsEl.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white"><p class="text-sm text-navy-900/60">No ' + (MODE === 'all' ? '' : modeLabel.toLowerCase() + ' ') + 'projects for this user.</p></div>';
          return;
        }
        itemsEl.innerHTML = rows.map((p) => {
          const done = (p.status || 'pending') === 'complete';
          const proc = (p.status || 'pending') === 'process';
          const statusPill = '<span class="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ' + (done ? 'text-green-700 bg-green-50' : (proc ? 'text-amber-700 bg-amber-50' : 'text-gold-600 bg-navy-50')) + '">' + (done ? 'Complete' : (proc ? 'Process' : 'Pending')) + '</span>';
          const cdet = p.details ? String(p.details) : '';
          const detHtml = !cdet ? '<span class="text-navy-900/40">—</span>'
            : cdet.length <= 140 ? esc(cdet)
            : esc(cdet.slice(0, 140)) + '… <a href="project_details?user_id=' + encodeURIComponent(uid) + '&project=' + encodeURIComponent(p.project_name) + '" class="clamp-btn">see more</a>';
          return '<div class="border border-navy-100 rounded-xl p-4 bg-white space-y-2 text-sm">' +
            '<div class="flex items-start justify-between gap-2">' +
              '<p class="font-bold text-navy leading-snug break-words min-w-0 flex-1">' + esc(p.project_name) + '</p>' + statusPill +
            '</div>' +
            '<div class="text-[13px] text-navy-900/70 leading-relaxed break-words">' + detHtml + '</div>' +
            '<div class="flex justify-between gap-2 text-[13px]"><span class="shrink-0 text-navy-900/50">Budget</span><span class="min-w-0 break-words text-right font-medium">' + fmtBudget(p.budget) + '</span></div>' +
            (showCheck ? '<label class="flex items-center gap-2 pt-1 text-navy font-semibold cursor-pointer"><input type="checkbox" class="proc-check w-5 h-5 shrink-0 accent-[#B45309]" data-name="' + esc(p.project_name) + '"' + (proc ? ' checked' : '') + '>Work Under Process</label>' : '') +
            (showCheck ? '<label class="flex items-center gap-2 pt-1 text-navy font-semibold cursor-pointer"><input type="checkbox" class="done-check w-5 h-5 shrink-0 accent-[#0C4A6E]" data-name="' + esc(p.project_name) + '"' + (done ? ' checked' : '') + '>Complete</label>' : '') +
          '</div>';
        }).join('');
      } catch (err) {
        itemsEl.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
      }
    }
    pModal.addEventListener('change', async (e) => {
      const box = e.target.closest('.done-check, .proc-check');
      if (!box) return;
      const uid = selectedUid;
      if (!uid) return;
      const isProc = box.classList.contains('proc-check');
      const want = box.checked ? 1 : 0;
      // Instant mutual exclusivity in the UI; the server enforces it too.
      const row = box.closest('tr') || box.closest('div');
      if (want && row) row.querySelectorAll(isProc ? '.done-check' : '.proc-check').forEach((o) => { o.checked = false; });
      box.disabled = true;
      try {
        const res = await fetch(isProc ? '../../../api/accounts/admin/mark-project-process.php' : '../../../api/accounts/admin/mark-project-complete.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: (typeof trishanHeaders === 'function' ? trishanHeaders() : { 'Content-Type': 'application/json' }),
          body: JSON.stringify(isProc
            ? { admin_id: admin.id, user_id: uid, project_name: box.dataset.name, process: want }
            : { admin_id: admin.id, user_id: uid, project_name: box.dataset.name, complete: want }),
        });
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Could not update.');
        const card = cards.querySelector('.ucard[data-uid="' + uid + '"]');
        if (card) await openUserPopup(card);
        else await loadUsers();
      } catch (err) {
        alert(err.message);
        box.checked = !want;
        box.disabled = false;
      }
    });

    cards.addEventListener('click', (e) => {
      const card = e.target.closest('.ucard');
      if (!card || !cards.contains(card)) return;
      openUserPopup(card);
    });

    await loadUsers();
  });
})();
