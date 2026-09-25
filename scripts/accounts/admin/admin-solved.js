// pages/accounts/admin_solved.html logic: SOLVED complaints as table (desktop)
// + stacked cards (mobile) with red dustbin delete. Same classes in both.
// Delete removes the complaint + its issues + responses from the database.
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!admin) { location.href = 'admin.html'; return; }
    document.getElementById('adminSolvedName').textContent = admin.username || 'Admin';

    const list = document.getElementById('solvedList');
    // Safety: content must show immediately, never wait for scroll-reveal.
    const wrap = document.getElementById('adminSolvedWrap');
    if (wrap) { wrap.style.opacity = '1'; }
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtDate = (d) => {
      try {
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(String(d).replace(' ', 'T') + 'Z'));
      } catch (e) { return d; }
    };
    const th = 'border border-navy-100 bg-navy-50 px-3 py-2 text-left text-[12px] font-bold text-navy';
    const td = 'border border-navy-100 px-3 py-2 text-[13px] text-navy-900/80 align-top break-words';
    const trashSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#DC2626" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3V2h11v1z"/></svg>';

    async function load() {
    list.innerHTML = '<p class="text-sm text-navy-900/60 text-center">Loading…</p>';
    try {
      const res = await fetch('../../../api/accounts/admin/all-complaints.php?admin_id=' + encodeURIComponent(admin.id) + '&filter=solved');
      const body = await res.json().catch(() => null);
      if (!body || !body.ok) throw new Error((body && body.error) || 'Failed to load.');
      if (!body.complaints.length) {
        list.innerHTML = '<div class="border border-navy-100 rounded p-5 text-center"><p class="text-sm text-navy-900/70"><i class="bi bi-check-circle me-1"></i>No solved complaints yet. Tick the checkbox on the New Complaints page.</p></div>';
        return;
      }
      const parts = body.complaints.map((c) => {
        const username = esc(c.username || [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' '));
        const description = (c.issues || []).length
          ? c.issues.map((i) => '• ' + esc(i.description)).join('<br>')
          : '<span class="text-navy-900/40">—</span>';
        const responses = (c.responses || []).length
          ? c.responses.map((r) => '<div class="mb-1 break-words"><span>' + esc(r.response) + '</span><br><span class="text-[11px] text-navy-900/50">' + esc(r.admin || 'Admin') + ' • ' + esc(fmtDate(r.created_at)) + '</span></div>').join('')
          : '<span class="text-navy-900/40">—</span>';
        const delBtn = '<button type="button" class="delete-btn inline-flex items-center justify-center w-11 h-11 rounded border border-red-200 bg-red-50 hover:bg-red-100 transition" data-id="' + c.id + '" title="Delete complaint ' + c.id + ' everywhere" aria-label="Delete complaint ' + c.id + '">' + trashSVG + '</button>';
        const row = '<tr data-complaint="' + c.id + '">' +
          '<td class="' + td + ' font-semibold">' + username + '</td>' +
          '<td class="' + td + '">' + esc(c.project_name) + '</td>' +
          '<td class="' + td + '">' + esc(fmtDate(c.created_at)) + '</td>' +
          '<td class="' + td + '">' + description + '</td>' +
          '<td class="' + td + '">' + responses + '</td>' +
          '<td class="' + td + ' text-center">' + delBtn + '</td>' +
        '</tr>';
        const card = '<div class="border border-navy-100 rounded p-4 bg-white space-y-3" data-complaint="' + c.id + '">' +
          '<div class="flex items-start justify-between gap-3">' +
            '<div class="min-w-0">' +
              '<p class="font-semibold text-navy break-words">' + username + '</p>' +
              '<p class="text-[13px] text-navy-900/60 break-words">' + esc(c.project_name) + ' • ' + esc(fmtDate(c.created_at)) + '</p>' +
            '</div>' + delBtn +
          '</div>' +
          '<div><p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-1">Description</p><p class="text-sm text-navy-900/80 break-words">' + description + '</p></div>' +
          '<div><p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-1">Response</p>' + responses + '</div>' +
        '</div>';
        return { row, card };
      });
      list.innerHTML =
        '<div class="hidden md:block overflow-x-auto">' +
          '<table class="w-full border-collapse bg-white border border-navy-100 rounded overflow-hidden">' +
          '<thead><tr>' +
          '<th class="' + th + '">username</th>' +
          '<th class="' + th + '">project_name</th>' +
          '<th class="' + th + '">created_at</th>' +
          '<th class="' + th + '">description</th>' +
          '<th class="' + th + '">response</th>' +
          '<th class="' + th + '">action</th>' +
          '</tr></thead><tbody>' + parts.map((p) => p.row).join('') + '</tbody></table>' +
        '</div>' +
        '<div class="md:hidden space-y-4">' + parts.map((p) => p.card).join('') + '</div>';
    } catch (err) {
      list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
    }
    }

    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('.delete-btn');
      if (!btn) return;
      const complaintId = btn.dataset.id;
      if (!confirm('Delete this complaint everywhere (including database)? This cannot be undone.')) return;
      btn.disabled = true;
      btn.style.opacity = '0.5';
      try {
        const res = await fetch('../../../api/accounts/admin/delete-complaint.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_id: admin.id, complaint_id: complaintId }),
        });
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Could not delete.');
        await load();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });

    load();
  });
})();
