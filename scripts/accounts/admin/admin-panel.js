// pages/accounts/admin-panel.html logic: table of ALL complaints (desktop),
// stacked cards on mobile. Same classes/data-attrs in both so handlers are shared.
// Columns: username | project_name | created_at | description | response | solved(checkbox).
// Ticking the checkbox stores a copy in Solved page BUT the row stays here (checked).
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!admin) { location.href = 'admin.html'; return; }
    document.getElementById('adminName').textContent = admin.username || 'Admin';

    const list = document.getElementById('complaintList');
    // Safety: content must show immediately, never wait for scroll-reveal.
    const wrap = document.getElementById('adminPanelWrap');
    if (wrap) { wrap.style.opacity = '1'; }
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtDate = (d) => {
      try {
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(String(d).replace(' ', 'T') + 'Z'));
      } catch (e) { return d; }
    };
    const th = 'border border-navy-100 bg-navy-50 px-3 py-2 text-left text-[12px] font-bold text-navy';
    const td = 'border border-navy-100 px-3 py-2 text-[13px] text-navy-900/80 align-top break-words';

    async function load() {
      list.innerHTML = '<p class="text-sm text-navy-900/60 text-center">Loading…</p>';
      try {
        const res = await fetch('../../../api/accounts/admin/all-complaints.php?admin_id=' + encodeURIComponent(admin.id) + '&filter=all');
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Failed to load.');
        if (!body.complaints.length) {
          list.innerHTML = '<div class="border border-navy-100 rounded p-5 text-center"><p class="text-sm text-navy-900/70"><i class="bi bi-inbox me-1"></i>No complaints yet.</p></div>';
          return;
        }
        const parts = body.complaints.map((c) => {
          const username = esc(c.username || [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' '));
          const description = (c.issues || []).length
            ? c.issues.map((i) => '• ' + esc(i.description)).join('<br>')
            : '<span class="text-navy-900/40">—</span>';
          const hasResponse = (c.responses || []).length > 0;
          const isSolved = +c.is_solved === 1;
          const responses = hasResponse
            ? c.responses.map((r) => '<div class="mb-1 break-words"><span>' + esc(r.response) + '</span><br><span class="text-[11px] text-navy-900/50">' + esc(r.admin || 'Admin') + ' • ' + esc(fmtDate(r.created_at)) + '</span></div>').join('')
            : '<p class="text-[12px] text-navy-900/50 mb-1">No reply yet.</p>';
          const replyForm =
            '<form class="reply-form flex flex-col gap-2">' +
              '<textarea required rows="2" placeholder="Write a reply…" class="reply-text border border-navy-100 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-navy-700"></textarea>' +
              '<div class="flex items-center gap-2">' +
                '<button type="submit" class="bg-navy text-white text-sm font-semibold px-5 py-2.5 min-h-[44px] rounded hover:bg-navy-700 transition inline-flex items-center gap-1.5"><i class="bi bi-send"></i>Send</button>' +
                '<span class="reply-msg text-[12px] hidden"></span>' +
              '</div>' +
            '</form>';
          const checkAttrs = 'data-id="' + c.id + '" data-has-response="' + (hasResponse ? '1' : '0') + '"' + (hasResponse ? '' : ' disabled') +
            ' title="' + (hasResponse ? 'Mark as solved' : 'Send a response first') + '" aria-label="Mark complaint ' + c.id + ' as solved"';
          const row = '<tr data-complaint="' + c.id + '">' +
            '<td class="' + td + ' font-semibold">' + username + '</td>' +
            '<td class="' + td + '">' + esc(c.project_name) + '</td>' +
            '<td class="' + td + '">' + esc(fmtDate(c.created_at)) + '</td>' +
            '<td class="' + td + '">' + description + '</td>' +
            '<td class="' + td + '">' +
              '<div class="reply-history mb-2">' + responses + '</div>' + replyForm +
            '</td>' +
            '<td class="' + td + ' text-center">' +
              '<input type="checkbox"' + (isSolved ? ' checked' : '') + ' class="solved-check w-5 h-5 accent-[#0C4A6E]' + (hasResponse ? '' : ' opacity-40 cursor-not-allowed') + '" ' + checkAttrs + '>' +
            '</td>' +
          '</tr>';
          const card = '<div class="border border-navy-100 rounded p-4 bg-white space-y-3" data-complaint="' + c.id + '">' +
            '<div>' +
              '<p class="font-semibold text-navy break-words">' + username + '</p>' +
              '<p class="text-[13px] text-navy-900/60 break-words">' + esc(c.project_name) + ' • ' + esc(fmtDate(c.created_at)) + (isSolved ? ' • Solved' : '') + '</p>' +
            '</div>' +
            '<div><p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-1">Description</p><p class="text-sm text-navy-900/80 break-words">' + description + '</p></div>' +
            '<div><p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-1">Response</p>' +
              '<div class="reply-history mb-2">' + responses + '</div>' + replyForm +
            '</div>' +
            '<label class="flex items-center gap-3 text-sm font-semibold text-navy cursor-pointer' + (hasResponse ? '' : ' opacity-50') + '">' +
              '<input type="checkbox"' + (isSolved ? ' checked' : '') + ' class="solved-check w-5 h-5 shrink-0 accent-[#0C4A6E]" ' + checkAttrs + '>Mark as solved' +
            '</label>' +
          '</div>';
          return { row, card };
        });
        const note = '<p class="text-[12px] text-navy-900/50 mt-3">Send a reply first — then tick the checkbox. Solved complaints stay here (checked) and also appear on the Solved Complaint page.</p>';
        list.innerHTML =
          '<div class="hidden md:block overflow-x-auto">' +
            '<table class="w-full border-collapse bg-white border border-navy-100 rounded overflow-hidden">' +
            '<thead><tr>' +
            '<th class="' + th + '">username</th>' +
            '<th class="' + th + '">project_name</th>' +
            '<th class="' + th + '">created_at</th>' +
            '<th class="' + th + '">description</th>' +
            '<th class="' + th + '">response</th>' +
            '<th class="' + th + '">solved</th>' +
            '</tr></thead><tbody>' + parts.map((p) => p.row).join('') + '</tbody></table>' +
          '</div>' +
          '<div class="md:hidden space-y-4">' + parts.map((p) => p.card).join('') + '</div>' + note;
      } catch (err) {
        list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
      }
    }

    // Send reply (stays on New page until checkbox is ticked).
    list.addEventListener('submit', async (e) => {
      const form = e.target.closest('.reply-form');
      if (!form) return;
      e.preventDefault();
      const row = form.closest('[data-complaint]');
      const text = form.querySelector('.reply-text');
      const msg = form.querySelector('.reply-msg');
      const btn = form.querySelector('button[type="submit"]');
      if (!text.value.trim()) { text.focus(); text.reportValidity(); return; }
      msg.classList.add('hidden');
      btn.disabled = true;
      try {
        const res = await fetch('../../../api/accounts/admin/reply.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_id: admin.id, complaint_id: row.dataset.complaint, response: text.value.trim() }),
        });
        const body = await res.json().catch(() => null);
        if (body && body.ok) {
          await load();
        } else {
          msg.textContent = (body && body.error) || 'Could not send reply.';
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

    // Checkbox -> mark solved. Row STAYS here (checked) and also appears in Solved.
    // Blocked unless a response was already sent (prevents accidental clicks).
    list.addEventListener('change', async (e) => {
      const box = e.target.closest('.solved-check');
      if (!box) return;
      if (box.disabled || (box.checked && box.dataset.hasResponse !== '1')) {
        box.checked = false;
        alert('Please write and send a response first. Then you can mark it solved.');
        return;
      }
      const complaintId = box.dataset.id;
      const prev = !box.checked;
      box.disabled = true;
      try {
        const res = await fetch('../../../api/accounts/admin/mark-solved.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_id: admin.id, complaint_id: complaintId, solved: box.checked ? 1 : 0 }),
        });
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Could not update.');
        await load();
      } catch (err) {
        alert(err.message);
        box.checked = prev;
        box.disabled = false;
      }
    });

    load();
  });
})();
