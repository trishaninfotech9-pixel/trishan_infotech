// pages/accounts/admin/project_details.html logic: full client project details.
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!admin) { location.href = 'admin.html'; return; }

    const box = document.getElementById('pdBody');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtDate = (d) => {
      try {
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(String(d).replace(' ', 'T') + '+05:30'));
      } catch (e) { return d; }
    };
    const q = new URLSearchParams(location.search);
    const uid = (q.get('user_id') || '').trim();
    const name = (q.get('project') || '').trim().slice(0, 150);
    if (!uid || !name) {
      box.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white"><p class="text-sm text-navy-900/60">Pick a project from the list to see its details.</p><a href="all_project.html" class="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-gold-600 hover:text-navy transition">All Project →</a></div>';
      return;
    }

    box.innerHTML = '<p class="text-sm text-navy-900/60 text-center">Loading…</p>';
    try {
      const res = await fetch('../../../api/accounts/users/my-project-details.php?user_id=' + encodeURIComponent(uid) + '&project=' + encodeURIComponent(name));
      const body = await res.json().catch(() => null);
      if (!body || !body.ok || !body.details) throw new Error((body && body.error) || 'Project details not found.');
      const d = body.details;
      const rows = [
        ['Username', d.username || '—'],
        ['Email', d.email || '—'],
        ['Phone', d.phone_no || '—'],
        ['Project', d.project_name || name],
        ['Budget', (d.budget !== null && d.budget !== '') ? '₹' + d.budget : '—'],
        ['Added', d.created_at ? fmtDate(d.created_at) : '—'],
      ].map(([k, v]) =>
        '<div class="grid sm:grid-cols-[150px_1fr] gap-x-4 gap-y-1 py-3">' +
          '<dt class="text-[12px] font-semibold uppercase tracking-wide text-navy-900/50">' + esc(k) + '</dt>' +
          '<dd class="text-sm text-navy-900/80 break-words">' + esc(v) + '</dd>' +
        '</div>'
      ).join('');
      const st = (d.status === 'complete') ? 'complete' : 'pending';
      const pill = '<span class="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full ' + (st === 'complete' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50') + '">' + (st === 'complete' ? 'Completed' : 'Pending') + '</span>';
      box.innerHTML =
        '<div class="bg-white border border-navy-100 rounded-2xl shadow-sm overflow-hidden">' +
          '<div class="bg-navy-50/70 px-5 sm:px-7 py-5 border-b border-navy-100 flex items-start justify-between gap-4">' +
            '<p class="font-extrabold text-xl text-navy leading-tight break-words min-w-0">' + esc(d.project_name || name) + '</p>' + pill +
          '</div>' +
          '<div class="px-5 sm:px-7 py-5">' +
            '<dl class="divide-y divide-navy-100 border-y border-navy-100 mb-4">' + rows + '</dl>' +
            '<p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-1">About this project</p>' +
            '<p class="text-sm text-navy-900/80 leading-relaxed break-words">' + esc(d.project_details || '—') + '</p>' +
          '</div>' +
        '</div>';
    } catch (err) {
      box.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
    }
  });
})();
