// pages/accounts/admin/all_enquiry logic: receive + reply threads, like complaint page.
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!admin) { location.href = 'admin'; return; }
    const nameEl = document.getElementById('enquiryAdminName');
    if (nameEl) nameEl.textContent = admin.username || 'Admin';

    const box = document.getElementById('enquiryList');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtDate = (d) => {
      try {
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(String(d).replace(' ', 'T')));
      } catch (e) { return d; }
    };

    async function api(url, opts, _retried) {
      opts = opts || {};
      opts.credentials = 'same-origin';
      const headers = { 'Content-Type': 'application/json' };
      try {
        const a = JSON.parse(localStorage.getItem('trishan_admin') || 'null');
        if (a && a.csrf) headers['X-CSRF-Token'] = a.csrf;
      } catch (e) {}
      opts.headers = Object.assign(headers, opts.headers || {});
      if (_retried) delete opts.headers['X-CSRF-Token'];
      const res = await fetch(url, opts);
      const body = await res.json().catch(() => null);
      if (body && body.error === 'Invalid CSRF token.' && !_retried) {
        // Session may be alive while the stored token is missing/stale
        // (e.g. login happened on a cached page): pull the live token and retry once.
        try {
          const r = await fetch('../../../api/accounts/csrf.php', { credentials: 'same-origin' });
          const b = await r.json().catch(() => null);
          if (b && b.ok && b.csrf) {
            try {
              const a = JSON.parse(localStorage.getItem('trishan_admin') || 'null') || {};
              a.csrf = b.csrf;
              localStorage.setItem('trishan_admin', JSON.stringify(a));
            } catch (e) {}
            delete opts.headers['X-CSRF-Token'];
            return api(url, opts, true);
          }
        } catch (e) {}
      }
      if (!body || !body.ok) throw new Error((body && body.error) || 'Request failed.');
      return body;
    }

    async function load() {
      box.innerHTML = '<p class="text-sm text-navy-900/60 text-center">Loading…</p>';
      try {
        const body = await api('../../../api/accounts/admin/enquiries.php?admin_id=' + encodeURIComponent(admin.id) + '&filter=all');
        const items = body.enquiries || [];
        if (!items.length) {
          box.innerHTML = '<div class="border border-navy-100 rounded p-5 text-center bg-white"><p class="text-sm text-navy-900/60">No enquiries yet.</p></div>';
          return;
        }
        box.innerHTML = items.map((q) => {
          const who = esc(q.username || q.name);
          const proj = q.project_name ? esc(q.project_name) : 'Website';
          const responses = (q.responses || []).length
            ? q.responses.map((r) => '<div class="mb-1 break-words"><span>' + esc(r.response) + '</span><br><span class="text-[11px] text-navy-900/50">' + esc(r.admin || 'Admin') + ' • ' + esc(fmtDate(r.created_at)) + '</span></div>').join('')
            : '<p class="text-[12px] text-navy-900/50 mb-1">No reply yet.</p>';
          const replyForm =
            '<form class="enq-reply-form flex flex-col gap-2" data-id="' + q.id + '">' +
              '<textarea required rows="2" placeholder="Write a reply…" class="enq-reply-text border border-navy-100 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-navy-700"></textarea>' +
              '<div class="flex items-center gap-2">' +
                '<button type="submit" class="bg-navy text-white text-sm font-semibold px-5 py-2.5 min-h-[44px] rounded hover:bg-navy-700 transition inline-flex items-center gap-1.5"><i class="bi bi-send"></i>Send</button>' +
                '<span class="enq-reply-msg text-[12px] hidden"></span>' +
              '</div>' +
            '</form>';
          return '<div class="border ' + (+q.seen_admin ? 'border-navy-100' : 'border-navy-700') + ' rounded bg-white overflow-hidden" data-enq="' + q.id + '">' +
            '<div class="px-4 sm:px-5 py-4 space-y-3">' +
              '<div class="flex items-start justify-between gap-3">' +
                '<div class="min-w-0"><p class="font-bold text-navy break-words">' + who + (+q.seen_admin ? '' : ' <span class="text-[11px] font-bold text-gold-600">• NEW</span>') + '</p>' +
                '<p class="text-[13px] text-navy-900/60 break-words">' + esc(q.email) + ' • ' + proj + '</p>' +
                '<p class="text-[12px] text-navy-900/40 mt-0.5">' + esc(fmtDate(q.created_at)) + '</p></div>' +
                '<button type="button" class="enq-del shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition" data-id="' + q.id + '" aria-label="Delete enquiry"><i class="bi bi-trash3 text-red-600"></i></button>' +
              '</div>' +
              '<div><p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-1">Question</p><p class="text-sm text-navy-900/80 leading-relaxed break-words">' + esc(q.message) + '</p></div>' +
              '<div><p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-1">Response</p><div class="mb-2">' + responses + '</div>' + replyForm + '</div>' +
              (+q.seen_admin ? '' : '<div><button type="button" class="enq-seen bg-navy text-white text-sm font-semibold px-5 py-2.5 min-h-[44px] rounded hover:bg-navy-700 transition inline-flex items-center gap-1.5" data-id="' + q.id + '"><i class="bi bi-eye"></i>Mark as seen</button></div>') +
            '</div>' +
          '</div>';
        }).join('');
      } catch (err) {
        box.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
      }
    }

    box.addEventListener('submit', async (e) => {
      const form = e.target.closest('.enq-reply-form');
      if (!form) return;
      e.preventDefault();
      const text = form.querySelector('.enq-reply-text');
      const msg = form.querySelector('.enq-reply-msg');
      if (!text.value.trim()) { text.focus(); return; }
      msg.classList.add('hidden');
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await api('../../../api/accounts/admin/enquiry-reply.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_id: admin.id, enquiry_id: form.dataset.id, response: text.value.trim() }),
        });
        await load();
      } catch (err) {
        msg.textContent = err.message;
        msg.style.color = '#DC2626';
        msg.classList.remove('hidden');
        btn.disabled = false;
      }
    });

    box.addEventListener('click', async (e) => {
      const seen = e.target.closest('.enq-seen');
      if (seen) {
        try {
          await api('../../../api/accounts/admin/mark-enquiry-seen.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: admin.id, enquiry_id: seen.dataset.id }),
          });
          await load();
        } catch (err) { alert(err.message); }
        return;
      }
      const del = e.target.closest('.enq-del');
      if (del) {
        if (!confirm('Delete this enquiry and its replies? This cannot be undone.')) return;
        try {
          await api('../../../api/accounts/admin/delete-enquiry.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: admin.id, enquiry_id: del.dataset.id }),
          });
          await load();
        } catch (err) { alert(err.message); }
      }
    });

    await load();
  });
})();
