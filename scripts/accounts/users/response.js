// pages/response.html logic: list my complaints with admin responses.
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let user = null;
    let admin = null;
    try { user = JSON.parse(localStorage.getItem('trishan_user') || 'null'); } catch (e) { user = null; }
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!user && !admin) { location.href = 'login.html'; return; }
    document.getElementById('respName').textContent = (user && user.first_name) || (admin && admin.username) || 'User';

    const list = document.getElementById('responseList');
    // Safety: the card must never get stuck invisible (e.g. if scroll-reveal fails).
    const card = document.getElementById('responseCard');
    if (card) { card.style.opacity = '1'; }
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtDate = (d) => {
      try {
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d.replace(' ', 'T') + '+05:30'));
      } catch (e) { return d; }
    };

    if (!user) {
      list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-navy-900/70">Login as a user to see complaint responses here.</p></div>';
      return;
    }

    list.innerHTML = '<p class="text-sm text-navy-900/60 text-center">Loading…</p>';
    try {
      const [rc, rp] = await Promise.all([
        fetch('../../../api/accounts/users/my-complaints.php?user_id=' + encodeURIComponent(user.id)),
        fetch('../../../api/accounts/users/my-projects.php?user_id=' + encodeURIComponent(user.id)),
      ]);
      const body = await rc.json().catch(() => null);
      const pbody = await rp.json().catch(() => null);
      if (!body || !body.ok) throw new Error((body && body.error) || 'Failed to load.');
      // Project status changes (Work Under Process / Completed), same card style as responses.
      const updates = ((pbody && pbody.ok && pbody.projects) || []).filter((p) => p.status === 'complete' || p.status === 'process');
      const statusHtml = !updates.length ? '' :
        '<div class="mb-5"><p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-2">Project status updates (' + updates.length + ')</p>' +
        '<div class="space-y-3">' + updates.map((p) => {
          const done = p.status === 'complete';
          return '<div class="border border-navy-100 rounded p-4 overflow-hidden">' +
            '<div class="flex items-center justify-between gap-2 mb-1 flex-wrap">' +
              '<p class="flex-1 text-sm font-bold text-navy leading-snug break-words min-w-0">' + esc(p.project_name) + '</p>' +
              '<span class="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ' + (done ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50') + '">' + (done ? 'Completed' : 'Work Under Process') + '</span>' +
            '</div>' +
            '<p class="text-[11px] text-navy-900/50 mb-2">' + esc(fmtDate(p.status_updated_at || p.created_at)) + '</p>' +
            '<div class="bg-navy-50 border border-navy-100 rounded p-3 break-words"><p class="text-sm text-navy-900/80 leading-relaxed break-words">' + (done ? 'Your project has been marked as completed.' : 'Your project is currently work under process.') + '</p><p class="text-[11px] text-navy-900/50 mt-1">Admin</p></div>' +
          '</div>';
        }).join('') + '</div></div>';
      if (!body.complaints.length && !updates.length) {
        list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-navy-900/70"><i class="bi bi-inbox me-1"></i>No complaints yet.</p><a href="complaint.html" class="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-gold-600 hover:text-navy transition"><i class="bi bi-flag"></i>Go to Complaint box</a></div>';
        return;
      }
      list.innerHTML = statusHtml + body.complaints.map((c) => {
        const replied = c.responses.length > 0;
        const issues = c.issues.map((i) => '<li class="text-sm text-navy-900/80 leading-relaxed break-words">• ' + esc(i.description) + '</li>').join('');
        const responses = replied
          ? c.responses.map((r) => '<div class="bg-navy-50 border border-navy-100 rounded p-3 break-words"><p class="text-sm text-navy-900/80 leading-relaxed break-words">' + esc(r.response) + '</p><p class="text-[11px] text-navy-900/50 mt-1">' + esc(r.admin || 'Admin') + ' • ' + esc(fmtDate(r.created_at)) + '</p></div>').join('')
          : '<p class="text-[13px] text-navy-900/50">Awaiting admin response…</p>';
        return '<div class="border border-navy-100 rounded p-4 overflow-hidden">' +
          '<div class="flex items-center justify-between gap-2 mb-1 flex-wrap">' +
            '<p class="flex-1 text-sm font-bold text-navy leading-snug break-words min-w-0">' + esc(c.project_name) + '</p>' +
            '<span class="flex items-center gap-1.5 shrink-0">' +
              '<span class="text-[11px] font-semibold px-2.5 py-1 rounded-full ' + (replied ? 'text-green-700 bg-green-50' : 'text-gold-600 bg-navy-50') + '">' + (replied ? 'Replied' : 'Pending') + '</span>' +
              '<span class="text-[11px] font-semibold px-2.5 py-1 rounded-full ' + (+c.is_solved === 1 ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50') + '">' + (+c.is_solved === 1 ? 'Solved' : 'Unsolved') + '</span>' +
            '</span>' +
          '</div>' +
          '<p class="text-[11px] text-navy-900/50 mb-2">' + esc(fmtDate(c.created_at)) + '</p>' +
          '<ul class="space-y-1 mb-3">' + issues + '</ul>' +
          '<div class="space-y-2">' + responses + '</div>' +
        '</div>';
      }).join('');
      // Seen: clear unread flags + navbar badge.
      try {
        await fetch('../../../api/accounts/users/mark-seen.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id }) });
      } catch (e) {}
      document.querySelectorAll('[data-response-badge]').forEach((b) => { b.classList.add('hidden'); b.classList.remove('inline-flex'); });
    } catch (err) {
      const msg = esc(err.message);
      const needLogin = /login|not found/i.test(err.message || '');
      list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-red-600">' + msg + '</p>' +
        (needLogin ? '<a href="login.html" class="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-gold-600 hover:text-navy transition">Login again →</a>' : '') + '</div>';
    }
  });
})();
