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
      const [mp, mc, pd] = await Promise.all([
        fetch('../../../api/accounts/users/my-projects.php?user_id=' + encodeURIComponent(user.id)).then((r) => r.json().catch(() => null)),
        fetch('../../../api/accounts/users/my-complaints.php?user_id=' + encodeURIComponent(user.id)).then((r) => r.json().catch(() => null)),
        fetch('../../../api/accounts/users/my-project-details.php?user_id=' + encodeURIComponent(user.id) + '&project=' + encodeURIComponent(name)).then((r) => r.json().catch(() => null)),
      ]);
      if (!mp || !mp.ok) throw new Error((mp && mp.error) || 'Failed to load.');
      if (!mc || !mc.ok) throw new Error((mc && mc.error) || 'Failed to load.');
      const det = (pd && pd.ok && pd.details) || null;

      if (!name) {
        // No project picked: list to choose from.
        if (!mp.projects.length) {
          body.innerHTML = '<div class="border border-navy-100 rounded p-5 text-center"><p class="text-sm text-navy-900/70">No projects yet.</p></div>';
          return;
        }
        const fmtBudget = (b) => (b !== null && b !== '' && b !== undefined) ? '₹' + esc(b) : '<span class="text-navy-900/40">—</span>';
        const cell = 'border border-navy-100 px-4 py-4 text-[15px] text-navy-900/80 break-words';
        const rows = mp.projects.map((p) =>
          '<tr class="hover:bg-navy-50/60 transition cursor-pointer" data-href="details.html?project=' + encodeURIComponent(p.project_name) + '">' +
            '<td class="' + cell + '">' + (p.pd_id ? esc(p.pd_id) : '<span class="text-navy-900/40">—</span>') + '</td>' +
            '<td class="' + cell + ' font-semibold text-navy">' + esc(p.username || '') + '</td>' +
            '<td class="' + cell + '">' + esc(p.email || '') + '</td>' +
            '<td class="' + cell + ' whitespace-nowrap">' + esc(p.phone_no || '') + '</td>' +
            '<td class="' + cell + ' font-semibold text-navy">' + esc(p.project_name) + '</td>' +
            '<td class="' + cell + '">' + (p.details ? esc(p.details) : '<span class="text-navy-900/40">—</span>') + '</td>' +
            '<td class="' + cell + ' whitespace-nowrap">' + fmtBudget(p.budget) + '</td>' +
            '<td class="border border-navy-100 px-4 py-4 text-center"><i class="bi bi-chevron-right text-navy-900/40"></i></td>' +
          '</tr>'
        ).join('');
        const cards = mp.projects.map((p) =>
          '<a href="details.html?project=' + encodeURIComponent(p.project_name) + '" class="block border border-navy-100 rounded p-4 bg-white space-y-1.5 text-sm">' +
            '<div class="flex justify-between gap-2"><span class="text-navy-900/50">ID</span><span class="font-semibold text-navy">' + (p.pd_id ? esc(p.pd_id) : '—') + '</span></div>' +
            '<div class="flex justify-between gap-2"><span class="text-navy-900/50">Username</span><span class="font-semibold text-navy break-words text-right">' + esc(p.username || '') + '</span></div>' +
            '<div class="flex justify-between gap-2"><span class="text-navy-900/50">Email</span><span class="break-words text-right">' + esc(p.email || '') + '</span></div>' +
            '<div class="flex justify-between gap-2"><span class="text-navy-900/50">Phone</span><span class="text-right">' + esc(p.phone_no || '') + '</span></div>' +
            '<div class="flex justify-between gap-2"><span class="text-navy-900/50">Project</span><span class="font-semibold text-navy break-words text-right">' + esc(p.project_name) + '</span></div>' +
            '<div><span class="text-navy-900/50">Details</span><p class="break-words">' + (p.details ? esc(p.details) : '—') + '</p></div>' +
            '<div class="flex justify-between gap-2"><span class="text-navy-900/50">Budget</span><span>' + fmtBudget(p.budget) + '</span></div>' +
          '</a>'
        ).join('');
        body.innerHTML =
          '<div class="hidden md:block overflow-x-auto"><table class="w-full min-w-[760px] border-collapse bg-white border border-navy-100 rounded overflow-hidden">' +
            '<thead><tr>' +
            '<th class="border border-navy-100 bg-navy-50 px-4 py-3 text-left text-[13px] font-bold text-navy">id</th>' +
            '<th class="border border-navy-100 bg-navy-50 px-4 py-3 text-left text-[13px] font-bold text-navy">username</th>' +
            '<th class="border border-navy-100 bg-navy-50 px-4 py-3 text-left text-[13px] font-bold text-navy">email</th>' +
            '<th class="border border-navy-100 bg-navy-50 px-4 py-3 text-left text-[13px] font-bold text-navy">phone_no</th>' +
            '<th class="border border-navy-100 bg-navy-50 px-4 py-3 text-left text-[13px] font-bold text-navy">project_name</th>' +
            '<th class="border border-navy-100 bg-navy-50 px-4 py-3 text-left text-[13px] font-bold text-navy">project_details</th>' +
            '<th class="border border-navy-100 bg-navy-50 px-4 py-3 text-left text-[13px] font-bold text-navy">budget</th>' +
            '<th class="border border-navy-100 bg-navy-50 px-3.5 py-2.5 w-12"></th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
          '<div class="md:hidden space-y-3">' + cards + '</div>';

        body.querySelectorAll('tr[data-href]').forEach((tr) => {
          tr.addEventListener('click', () => { location.href = tr.dataset.href; });
        });
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

      const detText = (det && det.project_details) ? det.project_details : ((proj && proj.details) ? proj.details : '');
      const infoRows =
        '<div class="grid sm:grid-cols-[150px_1fr] gap-x-4 gap-y-1 py-3">' +
          '<dt class="text-[12px] font-semibold uppercase tracking-wide text-navy-900/50">Contact</dt>' +
          '<dd class="text-sm text-navy-900/80">' + esc(det ? det.username : [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ')) + '</dd>' +
          '<dt class="text-[12px] font-semibold uppercase tracking-wide text-navy-900/50">Email</dt>' +
          '<dd class="text-sm text-navy-900/80 break-all">' + esc(det ? det.email : user.email) + '</dd>' +
          '<dt class="text-[12px] font-semibold uppercase tracking-wide text-navy-900/50">Phone</dt>' +
          '<dd class="text-sm text-navy-900/80">' + esc(det ? det.phone_no : user.phone) + '</dd>' +
          ((det && det.budget !== null && det.budget !== '') ? '<dt class="text-[12px] font-semibold uppercase tracking-wide text-navy-900/50">Budget</dt><dd class="text-sm font-bold text-navy">₹' + esc(det.budget) + '</dd>' : '') +
        '</div>' +
        (detText ? '<div class="bg-navy-50/60 border border-navy-100 rounded-xl px-4 py-3.5"><p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-1">About this project</p><p class="text-sm text-navy-900/80 leading-relaxed break-words">' + esc(detText) + '</p></div>' : '');

      body.innerHTML =
        '<div class="bg-white border border-navy-100 rounded-2xl shadow-sm overflow-hidden">' +
          '<div class="bg-navy-50/70 px-5 sm:px-7 py-5 border-b border-navy-100 flex items-center gap-4">' +
            '<div class="w-11 h-11 shrink-0 rounded-xl bg-navy text-white flex items-center justify-center"><i class="bi bi-kanban text-lg"></i></div>' +
            '<div class="min-w-0">' +
              '<p class="font-extrabold text-xl text-navy leading-tight break-words">' + esc(name) + '</p>' +
              (proj ? '<p class="text-[13px] text-navy-900/60 mt-0.5">Added ' + esc(fmtDate(proj.created_at)) + '</p>' : '<p class="text-[13px] text-navy-900/60 mt-0.5">Not in assigned projects.</p>') +
            '</div>' +
          '</div>' +
          '<div class="px-5 sm:px-7 py-5 space-y-5">' +
            (infoRows ? '<dl class="divide-y divide-navy-100 border-y border-navy-100">' + infoRows + '</dl>' : '') +
            '<div>' +
              '<p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-2">Complaint history (' + mine.length + ')</p>' +
              '<div class="space-y-2">' + history + '</div>' +
            '</div>' +
            '<a href="complaint.html?project=' + encodeURIComponent(name) + '" class="bg-navy text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-navy-700 transition inline-flex items-center gap-2"><i class="bi bi-flag"></i>Complaint</a>' +
          '</div>' +
        '</div>';
    } catch (err) {
      body.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
    }
  });
})();
