// pages/accounts/users/details.html logic: project details + its complaints, or picker.
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('trishan_user') || 'null'); } catch (e) { user = null; }
    if (!user) { location.href = 'login.html'; return; }

    const body = document.getElementById('detailsBody');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtDate = (d) => {
      try {
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(String(d).replace(' ', 'T') + 'Z'));
      } catch (e) { return d; }
    };

    const name = (new URLSearchParams(location.search).get('project') || '').trim().slice(0, 150);

    body.innerHTML = '<p class="text-sm text-navy-900/60 text-center">Loading…</p>';
    try {
      const [mp, mc] = await Promise.all([
        fetch('../../../api/accounts/users/my-projects.php?user_id=' + encodeURIComponent(user.id)).then((r) => r.json().catch(() => null)),
        fetch('../../../api/accounts/users/my-complaints.php?user_id=' + encodeURIComponent(user.id)).then((r) => r.json().catch(() => null)),
      ]);
      if (!mp || !mp.ok) throw new Error((mp && mp.error) || 'Failed to load.');
      if (!mc || !mc.ok) throw new Error((mc && mc.error) || 'Failed to load.');

      if (!name) {
        // No project picked: list to choose from.
        if (!mp.projects.length) {
          body.innerHTML = '<div class="border border-navy-100 rounded p-5 text-center"><p class="text-sm text-navy-900/70">No projects yet.</p></div>';
          return;
        }
        body.innerHTML = '<div class="border border-navy-100 rounded divide-y divide-navy-100">' + mp.projects.map((p) =>
          '<a href="details.html?project=' + encodeURIComponent(p.project_name) + '" class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-navy-50 transition">' +
            '<span class="font-semibold text-navy break-words min-w-0">' + esc(p.project_name) + '</span>' +
            '<i class="bi bi-chevron-right text-navy-900/40 shrink-0"></i>' +
          '</a>'
        ).join('') + '</div>';
        return;
      }

      const proj = (mp.projects || []).find((p) => p.project_name.toLowerCase() === name.toLowerCase());
      const mine = (mc.complaints || []).filter((c) => (c.project_name || '').toLowerCase() === name.toLowerCase());
      const history = mine.length
        ? mine.map((c) => {
            const replied = (c.responses || []).length > 0;
            return '<div class="flex items-center justify-between gap-2 border border-navy-100 rounded px-3.5 py-2.5">' +
              '<span class="text-sm text-navy-900/80">' + esc(fmtDate(c.created_at)) + ' • ' + c.issues.length + ' issue' + (c.issues.length === 1 ? '' : 's') + '</span>' +
              '<span class="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ' + (replied ? 'text-green-700 bg-green-50' : 'text-gold-600 bg-navy-50') + '">' + (replied ? 'Replied' : 'Pending') + '</span>' +
            '</div>';
          }).join('')
        : '<p class="text-sm text-navy-900/50">No complaints for this project yet.</p>';

      body.innerHTML =
        '<div class="border border-navy-100 rounded p-5 sm:p-6">' +
          '<div class="w-9 h-9 rounded bg-navy-50 flex items-center justify-center mb-3"><i class="bi bi-kanban text-navy"></i></div>' +
          '<p class="font-bold text-lg text-navy mb-1 break-words">' + esc(name) + '</p>' +
          (proj && proj.details ? '<p class="text-sm text-navy-900/70 leading-relaxed break-words mb-1">' + esc(proj.details) + '</p>' : '') +
          (proj ? '<p class="text-[13px] text-navy-900/60 mb-4">Added ' + esc(fmtDate(proj.created_at)) + '</p>' : '<p class="text-[13px] text-navy-900/60 mb-4">Not in assigned projects.</p>') +
          '<p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-2">Complaint history (' + mine.length + ')</p>' +
          '<div class="space-y-2 mb-4">' + history + '</div>' +
          '<a href="complaint.html?project=' + encodeURIComponent(name) + '" class="bg-navy text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-navy-700 transition inline-flex items-center gap-2"><i class="bi bi-flag"></i>Complaint</a>' +
        '</div>';
    } catch (err) {
      body.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
    }
  });
})();
