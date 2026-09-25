// pages/accounts/users/projects.html logic: my assigned projects from database.
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('trishan_user') || 'null'); } catch (e) { user = null; }
    if (!user) { location.href = 'login.html'; return; }
    document.getElementById('projName').textContent = user.first_name || 'User';

    const list = document.getElementById('projectList');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtDate = (d) => {
      try {
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(String(d).replace(' ', 'T') + 'Z'));
      } catch (e) { return d; }
    };

    list.innerHTML = '<p class="text-sm text-navy-900/60 text-center">Loading…</p>';
    try {
      const res = await fetch('../../../api/accounts/users/my-projects.php?user_id=' + encodeURIComponent(user.id));
      const body = await res.json().catch(() => null);
      if (!body || !body.ok) throw new Error((body && body.error) || 'Failed to load.');
      if (!body.projects.length) {
        list.innerHTML = '<div class="border border-navy-100 rounded p-5 text-center"><p class="text-sm text-navy-900/70"><i class="bi bi-kanban me-1"></i>No projects assigned yet.</p></div>';
        return;
      }
      list.innerHTML = body.projects.map((p) =>
        '<div class="border border-navy-100 rounded p-5 hover:border-navy-700 transition flex flex-col">' +
          '<div class="w-9 h-9 rounded bg-navy-50 flex items-center justify-center mb-3"><i class="bi bi-kanban text-navy"></i></div>' +
          '<p class="font-bold text-navy mb-1 break-words">' + esc(p.project_name) + '</p>' +
          (p.details ? '<p class="text-[13px] text-navy-900/70 leading-relaxed break-words mb-1">' + esc(p.details) + '</p>' : '') +
          '<p class="text-[13px] text-navy-900/60 mb-4">Added ' + esc(fmtDate(p.created_at)) + '</p>' +
          '<a href="complaint.html?project=' + encodeURIComponent(p.project_name) + '" class="mt-auto bg-navy text-white text-sm font-semibold px-5 py-2 rounded hover:bg-navy-700 transition inline-flex items-center justify-center gap-2"><i class="bi bi-flag"></i>Complaint</a>' +
        '</div>'
      ).join('');
    } catch (err) {
      list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
    }
  });
})();
