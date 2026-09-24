// pages/admin-panel.html logic: list all complaints, reply to each.
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!admin) { location.href = 'admin.html'; return; }
    document.getElementById('adminName').textContent = admin.username || 'Admin';

    const list = document.getElementById('complaintList');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtDate = (d) => {
      try {
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d.replace(' ', 'T') + 'Z'));
      } catch (e) { return d; }
    };

    async function load() {
      list.innerHTML = '<p class="text-sm text-navy-900/60 text-center">Loading…</p>';
      try {
        const res = await fetch('../api/all-complaints.php?admin_id=' + encodeURIComponent(admin.id));
        const body = await res.json().catch(() => null);
        if (!body || !body.ok) throw new Error((body && body.error) || 'Failed to load.');
        if (!body.complaints.length) {
          list.innerHTML = '<div class="border border-navy-100 rounded p-5 text-center"><p class="text-sm text-navy-900/70"><i class="bi bi-inbox me-1"></i>No new complaints.</p></div>';
          return;
        }
        list.innerHTML = body.complaints.map((c) => {
          const name = [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' ');
          const issues = c.issues.map((i) => '<li class="text-sm text-navy-900/80 leading-relaxed">• ' + esc(i.description) + '</li>').join('');
          const responses = c.responses.length
            ? c.responses.map((r) => '<div class="bg-navy-50 border border-navy-100 rounded p-3"><p class="text-sm text-navy-900/80 leading-relaxed">' + esc(r.response) + '</p><p class="text-[11px] text-navy-900/50 mt-1">' + esc(r.admin || 'Admin') + ' • ' + esc(fmtDate(r.created_at)) + '</p></div>').join('')
            : '<p class="text-[13px] text-navy-900/50">No reply yet.</p>';
          return '<div class="border border-navy-100 rounded p-4 sm:p-5" data-complaint="' + c.id + '">' +
            '<div class="flex items-center justify-between gap-2 mb-1">' +
              '<p class="text-sm font-bold text-navy">' + esc(c.project_name) + '</p>' +
              '<span class="text-[11px] text-navy-900/50">' + esc(fmtDate(c.created_at)) + '</span>' +
            '</div>' +
            '<p class="text-[13px] text-navy-900/70 mb-1"><i class="bi bi-person me-1"></i>' + esc(name) + '</p>' +
            '<p class="text-[13px] text-navy-900/70 mb-1"><i class="bi bi-envelope me-1"></i>' + esc(c.email) + ' &nbsp; <i class="bi bi-telephone ms-2 me-1"></i>' + esc(c.phone) + '</p>' +
            '<ul class="space-y-1 my-3">' + issues + '</ul>' +
            '<div class="space-y-2 mb-3 reply-history">' + responses + '</div>' +
            '<form class="reply-form space-y-2">' +
              '<textarea required rows="2" placeholder="Write a reply…" class="reply-text border border-navy-100 rounded px-3.5 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-navy-700"></textarea>' +
              '<div class="flex items-center gap-2">' +
                '<button type="submit" class="bg-navy text-white text-sm font-semibold px-5 py-2 rounded hover:bg-navy-700 transition inline-flex items-center gap-2"><i class="bi bi-send"></i>Send Reply</button>' +
                '<span class="reply-msg text-[13px] hidden"></span>' +
              '</div>' +
            '</form>' +
          '</div>';
        }).join('');
      } catch (err) {
        list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
      }
    }

    list.addEventListener('submit', async (e) => {
      const form = e.target.closest('.reply-form');
      if (!form) return;
      e.preventDefault();
      const card = form.closest('[data-complaint]');
      const text = form.querySelector('.reply-text');
      const msg = form.querySelector('.reply-msg');
      const btn = form.querySelector('button[type="submit"]');
      if (!text.value.trim()) { text.focus(); text.reportValidity(); return; }
      msg.classList.add('hidden');
      btn.disabled = true;
      try {
        const res = await fetch('../api/reply.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_id: admin.id, complaint_id: card.dataset.complaint, response: text.value.trim() }),
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

    load();
  });
})();
