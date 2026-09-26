// Project list pages (all/complete/pending): user dropdown + DB table.
(function () {
  // Set by each page before this script runs: 'all' | 'complete' | 'pending'.
  const MODE = window.ADMIN_PROJECT_MODE || 'all';
  document.addEventListener('DOMContentLoaded', async () => {
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!admin) { location.href = 'admin.html'; return; }
    const hello = document.getElementById('adminProjectsName');
    if (hello) hello.textContent = admin.username || 'Admin';

    const select = document.getElementById('userSelect');
    const info = document.getElementById('userInfo');
    const list = document.getElementById('projectTableWrap');
    const showCheck = MODE === 'all';
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtBudget = (b) => (b !== null && b !== '' && b !== undefined) ? '₹' + esc(b) : '<span class="text-navy-900/40">—</span>';
    const cell = 'border border-navy-100 px-3.5 py-3 text-sm text-navy-900/80 break-words';

    async function loadUsers() {
      try {
        const res = await fetch('../../../api/accounts/admin/list-users.php?admin_id=' + encodeURIComponent(admin.id));
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Failed to load users.');
        select.innerHTML = '<option value="">— Choose a user —</option>' + body.users.map((u) => {
          const name = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ');
          return '<option value="' + u.id + '" data-email="' + esc(u.email || '') + '" data-phone="' + esc(u.phone || '') + '">' + esc(name) + '</option>';
        }).join('');
      } catch (err) {
        info.textContent = err.message;
      }
    }

    async function loadTable() {
      const uid = select.value;
      const opt = select.selectedOptions[0];
      if (!uid) {
        info.textContent = '';
        list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white"><p class="text-sm text-navy-900/60">Select a user above to see their projects.</p></div>';
        return;
      }
      info.textContent = [opt ? opt.dataset.email : '', opt ? opt.dataset.phone : ''].filter(Boolean).join(' • ');
      list.innerHTML = '<p class="text-sm text-navy-900/60 text-center">Loading…</p>';
      try {
        const res = await fetch('../../../api/accounts/admin/user-projects.php?admin_id=' + encodeURIComponent(admin.id) + '&user_id=' + encodeURIComponent(uid));
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Failed to load.');
        let rows = body.projects || [];
        if (MODE !== 'all') rows = rows.filter((p) => (p.status || 'pending') === MODE);
        if (!rows.length) {
          list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white"><p class="text-sm text-navy-900/60">No ' + (MODE === 'all' ? '' : MODE + ' ') + 'projects for this user.</p></div>';
          return;
        }
        const trs = rows.map((p) => {
          const done = (p.status || 'pending') === 'complete';
          const checkCell = showCheck ? '<td class="' + cell + ' text-center"><input type="checkbox" class="done-check w-5 h-5 accent-[#0C4A6E]" data-name="' + esc(p.project_name) + '"' + (done ? ' checked' : '') + ' title="Mark project as complete" aria-label="Mark ' + esc(p.project_name) + ' as complete"></td>' : '';
          const det = p.details ? String(p.details) : '';
          const detCell = !det ? '<span class="text-navy-900/40">—</span>'
            : det.length <= 140 ? esc(det)
            : esc(det.slice(0, 140)) + '…<br><a href="project_details.html?user_id=' + encodeURIComponent(uid) + '&project=' + encodeURIComponent(p.project_name) + '" class="clamp-btn">see more</a>';
          return '<tr>' +
            '<td class="' + cell + ' font-semibold text-navy">' + esc(p.username || '') + '</td>' +
            '<td class="' + cell + ' font-semibold text-navy">' + esc(p.project_name) + '</td>' +
            '<td class="' + cell + '">' + detCell + '</td>' +
            '<td class="' + cell + ' whitespace-nowrap">' + fmtBudget(p.budget) + '</td>' +
            checkCell +
          '</tr>';
        }).join('');
        const cards = rows.map((p) => {
          const done = (p.status || 'pending') === 'complete';
          const cdet = p.details ? String(p.details) : '';
          const detCard = !cdet ? '—'
            : cdet.length <= 140 ? esc(cdet)
            : esc(cdet.slice(0, 140)) + '… <a href="project_details.html?user_id=' + encodeURIComponent(uid) + '&project=' + encodeURIComponent(p.project_name) + '" class="clamp-btn">see more</a>';
          return '<div class="border border-navy-100 rounded p-4 bg-white space-y-1.5 text-sm">' +
            '<div class="flex justify-between gap-2"><span class="text-navy-900/50">Username</span><span class="font-semibold text-navy break-words text-right">' + esc(p.username || '') + '</span></div>' +
            '<div class="flex justify-between gap-2"><span class="text-navy-900/50">Project</span><span class="font-semibold text-navy break-words text-right">' + esc(p.project_name) + '</span></div>' +
            '<div><span class="text-navy-900/50">Details</span><p class="break-words">' + detCard + '</p></div>' +
            '<div class="flex justify-between gap-2"><span class="text-navy-900/50">Budget</span><span>' + fmtBudget(p.budget) + '</span></div>' +
            (showCheck ? '<label class="flex items-center gap-2 pt-1 text-navy font-semibold cursor-pointer"><input type="checkbox" class="done-check w-5 h-5 shrink-0 accent-[#0C4A6E]" data-name="' + esc(p.project_name) + '"' + (done ? ' checked' : '') + '>Complete</label>' : '') +
          '</div>';
        }).join('');
        list.innerHTML =
          '<div class="hidden md:block overflow-x-auto"><table class="w-full min-w-[680px] border-collapse bg-white border border-navy-100 rounded overflow-hidden">' +
            '<thead><tr>' +
            '<th class="border border-navy-100 bg-navy-50 px-3.5 py-2.5 text-left text-[12px] font-bold text-navy">username</th>' +
            '<th class="border border-navy-100 bg-navy-50 px-3.5 py-2.5 text-left text-[12px] font-bold text-navy">project_name</th>' +
            '<th class="border border-navy-100 bg-navy-50 px-3.5 py-2.5 text-left text-[12px] font-bold text-navy">project_details</th>' +
            '<th class="border border-navy-100 bg-navy-50 px-3.5 py-2.5 text-left text-[12px] font-bold text-navy">budget</th>' +
            (showCheck ? '<th class="border border-navy-100 bg-navy-50 px-3.5 py-2.5 text-left text-[12px] font-bold text-navy">complete</th>' : '') +
            '</tr></thead><tbody>' + trs + '</tbody></table></div>' +
          '<div class="md:hidden space-y-3">' + cards + '</div>';
      } catch (err) {
        list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
      }
    }

    select.addEventListener('change', loadTable);

    list.addEventListener('change', async (e) => {
      const box = e.target.closest('.done-check');
      if (!box) return;
      const uid = select.value;
      if (!uid) return;
      const want = box.checked ? 1 : 0;
      box.disabled = true;
      try {
        const res = await fetch('../../../api/accounts/admin/mark-project-complete.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_id: admin.id, user_id: uid, project_name: box.dataset.name, complete: want }),
        });
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Could not update.');
        await loadTable();
      } catch (err) {
        alert(err.message);
        box.checked = !want;
        box.disabled = false;
      }
    });

    await loadUsers();
    loadTable();
  });
})();
