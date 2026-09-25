// pages/accounts/admin/users.html logic: user dropdown, their projects, add/delete.
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!admin) { location.href = 'admin.html'; return; }
    document.getElementById('adminUsersName').textContent = admin.username || 'Admin';

    const select = document.getElementById('userSelect');
    const info = document.getElementById('userInfo');
    const list = document.getElementById('userProjectList');
    const form = document.getElementById('addProjectForm');
    const input = document.getElementById('projectName');
    const detailsInput = document.getElementById('projectDetails');
    const budgetInput = document.getElementById('projectBudget');
    const msg = document.getElementById('projectMsg');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtDate = (d) => {
      try {
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(String(d).replace(' ', 'T') + 'Z'));
      } catch (e) { return d; }
    };
    const trashSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#DC2626" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3V2h11v1z"/></svg>';

    let usersById = {};

    async function loadUsers() {
      try {
        const res = await fetch('../../../api/accounts/admin/list-users.php?admin_id=' + encodeURIComponent(admin.id));
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Failed to load users.');
        usersById = {};
        select.innerHTML = '<option value="">— Choose a user —</option>' + body.users.map((u) => {
          usersById[u.id] = u;
          const name = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ');
          return '<option value="' + u.id + '">' + esc(name) + '</option>';
        }).join('');
      } catch (err) {
        info.textContent = err.message;
      }
    }

    async function loadProjects() {
      const uid = select.value;
      form.classList.toggle('hidden', !uid);
      if (!uid) {
        info.textContent = '';
        list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-navy-900/60">Select a user above to see their projects.</p></div>';
        return;
      }
      const u = usersById[uid] || {};
      info.textContent = [u.email, u.phone].filter(Boolean).join(' • ');
      list.innerHTML = '<p class="text-sm text-navy-900/60 text-center">Loading…</p>';
      try {
        const res = await fetch('../../../api/accounts/admin/user-projects.php?admin_id=' + encodeURIComponent(admin.id) + '&user_id=' + encodeURIComponent(uid));
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Failed to load projects.');
        if (!body.projects.length) {
          list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-navy-900/60">No projects for this user yet. Add one below.</p></div>';
          return;
        }
        list.innerHTML = body.projects.map((p) =>
          '<div class="border border-navy-100 rounded p-4 bg-white flex items-center justify-between gap-3" data-project="' + p.id + '">' +
            '<div class="min-w-0"><p class="font-semibold text-navy break-words">' + esc(p.project_name) + '</p>' +
            (p.details ? '<p class="text-[13px] text-navy-900/70 break-words mt-0.5">' + esc(p.details) + '</p>' : '') +
            '<p class="text-[12px] text-navy-900/50">' + esc(fmtDate(p.created_at)) + (p.open ? ' • open complaint' : '') + '</p></div>' +
            '<button type="button" class="delete-project-btn shrink-0 inline-flex items-center justify-center w-11 h-11 rounded border border-red-200 bg-red-50 hover:bg-red-100 transition" data-id="' + p.id + '" data-source="' + (p.source || 'assigned') + '" data-name="' + esc(p.project_name) + '" title="Delete project" aria-label="Delete project ' + esc(p.project_name) + '">' + trashSVG + '</button>' +
          '</div>'
        ).join('');
      } catch (err) {
        list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
      }
    }

    select.addEventListener('change', loadProjects);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const uid = select.value;
      msg.classList.add('hidden');
      if (!uid) {
        msg.textContent = 'Select a user first.';
        msg.style.color = '#DC2626';
        msg.classList.remove('hidden');
        select.focus();
        return;
      }
      if (!input.value.trim()) { input.focus(); input.reportValidity(); return; }
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const res = await fetch('../../../api/accounts/admin/add-project.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_id: admin.id, user_id: uid, project_name: input.value.trim(), details: detailsInput.value.trim(), budget: budgetInput.value.trim() }),
        });
        const body = await res.json().catch(() => null);
        if (body && body.ok) {
          msg.textContent = body.message;
          msg.style.color = '';
          msg.classList.remove('hidden');
          input.value = '';
          detailsInput.value = '';
          budgetInput.value = '';
          await loadProjects();
        } else {
          msg.textContent = (body && body.error) || 'Could not add project.';
          msg.style.color = '#DC2626';
          msg.classList.remove('hidden');
        }
      } catch (err) {
        msg.textContent = 'Cannot reach server.';
        msg.style.color = '#DC2626';
        msg.classList.remove('hidden');
      } finally {
        btn.disabled = false;
      }
    });

    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('.delete-project-btn');
      if (!btn) return;
      const isComplaint = btn.dataset.source === 'complaint';
      const confirmText = isComplaint
        ? 'Delete "' + btn.dataset.name + '"? This removes its complaint(s) and responses from the database. This cannot be undone.'
        : 'Delete this project? This cannot be undone.';
      if (!confirm(confirmText)) return;
      btn.disabled = true;
      btn.style.opacity = '0.5';
      try {
        const payload = isComplaint
          ? { admin_id: admin.id, project_id: 0, user_id: select.value, project_name: btn.dataset.name }
          : { admin_id: admin.id, project_id: btn.dataset.id };
        const res = await fetch('../../../api/accounts/admin/delete-project.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Could not delete.');
        await loadProjects();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });

    await loadUsers();
    loadProjects();
  });
})();
