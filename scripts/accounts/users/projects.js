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
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(String(d).replace(' ', 'T') + '+05:30'));
      } catch (e) { return d; }
    };
    const fmtDateTime = (d) => {
      try {
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date(String(d).replace(' ', 'T') + '+05:30'));
      } catch (e) { return d; }
    };

    list.innerHTML = '<p class="text-sm text-navy-900/60 text-center">Loading…</p>';
    // Log Menu dropdown (one open at a time, closes on outside click / Escape).
    const closeLogMenus = () => list.querySelectorAll('.logmenu').forEach((m) => m.classList.add('hidden'));
    list.addEventListener('click', (e) => {
      const lm = e.target.closest('.logmenu-toggle');
      if (!lm || !list.contains(lm)) return;
      const menu = lm.parentElement.querySelector('.logmenu');
      if (!menu) return;
      const willOpen = menu.classList.contains('hidden');
      closeLogMenus();
      if (!willOpen) return;
      menu.classList.remove('hidden');
      if (menu.dataset.loaded) return;
      menu.dataset.loaded = '1';
      menu.innerHTML = '<p class="px-4 py-3 text-sm text-navy-900/50">Loading log…</p>';
      fetch('../../../api/accounts/users/my-project-log.php?user_id=' + encodeURIComponent(user.id) + '&project=' + encodeURIComponent(lm.dataset.project))
        .then((r) => r.json().catch(() => null))
        .then((b) => {
          if (!b || !b.ok) throw new Error('Failed to load log.');
          const items = [];
          (b.complaints || []).forEach((c) => {
            items.push({ t: c.created_at || '', kind: 'complaint' });
            if (+c.is_solved === 1 && c.solved_at) items.push({ t: c.solved_at, kind: 'solved' });
          });
          (b.enquiries || []).forEach((q) => {
            items.push({ t: q.created_at || '', kind: 'enquiry' });
            if (+q.has_resp === 1 && q.replied_at) items.push({ t: q.replied_at, kind: 'enquiry-replied' });
          });
          (b.events || []).forEach((v) => items.push({ t: v.created_at || '', kind: v.event }));
          items.sort((a, c2) => String(a.t).localeCompare(String(c2.t)));
          if (!items.length) { menu.innerHTML = '<p class="px-4 py-3 text-sm text-navy-900/50">No log entries yet.</p>'; return; }
          const row = (icon, text, t) => '<div class="flex items-center gap-2.5 px-4 py-2.5 border-b border-navy-100/70 last:border-0"><i class="' + icon + ' text-navy shrink-0"></i><span class="flex-1 min-w-0 text-[13px] text-navy-900/80 break-words">' + text + '</span><span class="shrink-0 text-[12px] text-navy-900/50 whitespace-nowrap">' + esc(fmtDateTime(t)) + '</span></div>';
          menu.innerHTML = items.map((it) =>
            it.kind === 'complaint' ? row('bi bi-flag', 'Complaint sent', it.t) :
            it.kind === 'enquiry' ? row('bi bi-envelope-paper', 'Enquiry sent', it.t) :
            it.kind === 'enquiry-replied' ? row('bi bi-reply', 'Enquiry replied', it.t) :
            it.kind === 'process' ? row('bi bi-hourglass-split', 'Work under process', it.t) :
            it.kind === 'complete' ? row('bi bi-check-circle', 'Completed', it.t) :
            it.kind === 'solved' ? row('bi bi-check2-circle', 'Complaint solved', it.t) :
            row('bi bi-dot', esc(it.kind), it.t)
          ).join('');
        })
        .catch(() => { menu.innerHTML = '<p class="px-4 py-3 text-sm text-red-600">Could not load log.</p>'; menu.dataset.loaded = ''; });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.logmenu-toggle') && !e.target.closest('.logmenu')) closeLogMenus();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLogMenus(); });
    // Expand / collapse a project card (one open at a time).
    list.addEventListener('click', (e) => {
      const t = e.target.closest('.proj-toggle');
      if (!t || !list.contains(t)) return;
      const bodyEl = t.parentElement.querySelector('.proj-body');
      if (!bodyEl) return;
      closeLogMenus();
      const willOpen = bodyEl.classList.contains('hidden');
      list.querySelectorAll('.proj-body').forEach((b) => b.classList.add('hidden'));
      list.querySelectorAll('.proj-chev').forEach((c) => { c.style.transform = ''; });
      if (willOpen) {
        bodyEl.classList.remove('hidden');
        const chev = t.querySelector('.proj-chev');
        if (chev) chev.style.transform = 'rotate(180deg)';
      }
    });
    try {
      const res = await fetch('../../../api/accounts/users/my-projects.php?user_id=' + encodeURIComponent(user.id));
      const body = await res.json().catch(() => null);
      if (!body || !body.ok) throw new Error((body && body.error) || 'Failed to load.');
      if (!body.projects.length) {
        list.innerHTML = '<div class="border border-navy-100 rounded p-5 text-center"><p class="text-sm text-navy-900/70"><i class="bi bi-kanban me-1"></i>No projects assigned yet.</p></div>';
        return;
      }
      list.innerHTML = body.projects.map((p) => {
        const det = p.details ? String(p.details) : '';
        const detHtml = !det ? '' :
          det.length <= 150 ? '<p class="text-[13px] text-navy-900/70 leading-relaxed break-words mb-1">' + esc(det) + '</p>' :
          '<div class="clamp-wrap mb-1"><p class="clamp-text clamp-3 text-[13px] text-navy-900/70 leading-relaxed">' + esc(det) + '</p><a href="details.html?project=' + encodeURIComponent(p.project_name) + '" class="clamp-btn inline-block">Show more</a></div>';
        const pd = p.pd || {};
        const money = (v) => (v !== null && v !== '' && v !== undefined) ? '₹' + esc(v) : '';
        const dt = (v) => v ? esc(v) : '';
        const vrow = (label, val) => val ? '<div class="flex justify-between gap-3 py-1 border-b border-navy-100/70 last:border-0"><span class="shrink-0 text-navy-900/50 text-[13px]">' + label + '</span><span class="min-w-0 text-navy-900/80 text-[13px] font-medium break-all text-right">' + val + '</span></div>' : '';
        const extra =
          vrow('Domain Name', pd.domain_name ? esc(pd.domain_name) : '') +
          vrow('Domain Booking', dt(pd.domain_booking_date)) +
          vrow('Domain Amount', money(pd.domain_amount)) +
          vrow('Server Name', pd.server_name ? esc(pd.server_name) : '') +
          vrow('Server Renewal', dt(pd.server_renewal_date)) +
          vrow('Server Amount', money(pd.server_amount)) +
          vrow('AMC Date', dt(pd.amc_date)) +
          vrow('AMC Amount', money(pd.amc_amount)) +
          vrow('MMC Date', dt(pd.mmc_date)) +
          vrow('MMC Amount', money(pd.mmc_amount)) +
          vrow('Paid', money(pd.paid_amount)) +
          vrow('Due Amount', money(pd.due_amount)) +
          vrow('Next Payment', dt(pd.next_payment_date)) +
          vrow('Last Pay Amount', money(pd.last_pay_amount)) +
          vrow('Last Pay Date', dt(pd.last_pay_date));
        return '<div class="break-inside-avoid mb-4 border border-navy-100 rounded-xl p-6 hover:border-navy-700 transition">' +
          '<button type="button" class="proj-toggle w-full flex items-center gap-3 text-left">' +
            '<span class="w-10 h-10 shrink-0 rounded bg-navy-50 flex items-center justify-center"><i class="bi bi-kanban text-navy text-lg"></i></span>' +
            '<span class="min-w-0 flex-1"><span class="block font-bold text-lg text-navy leading-tight break-words">' + esc(p.project_name) + '</span>' +
            '<span class="block text-[13px] text-navy-900/60 mt-0.5">Added ' + esc(fmtDate(p.created_at)) + '</span></span>' +
            '<i class="bi bi-chevron-down proj-chev shrink-0 text-navy-900/50 transition-transform"></i>' +
          '</button>' +
          '<div class="proj-body hidden pt-4">' +
            detHtml +
            (extra ? '<div class="my-2">' + extra + '</div>' : '') +
            '<div class="mt-4 flex gap-2.5 flex-wrap">' +
              '<a href="details.html?project=' + encodeURIComponent(p.project_name) + '" class="flex-1 min-w-[90px] border border-navy-100 text-navy text-sm font-semibold px-4 py-2.5 rounded hover:bg-navy-50 transition inline-flex items-center justify-center gap-2"><i class="bi bi-info-circle"></i>Details</a>' +
              '<a href="complaint.html?project=' + encodeURIComponent(p.project_name) + '" class="flex-1 min-w-[90px] bg-navy text-white text-sm font-semibold px-4 py-2.5 rounded hover:bg-navy-700 transition inline-flex items-center justify-center gap-2"><i class="bi bi-flag"></i>Complaint</a>' +
              '<a href="enquiry.html?project=' + encodeURIComponent(p.project_name) + '" class="flex-1 min-w-[90px] border border-navy-700 text-navy text-sm font-semibold px-4 py-2.5 rounded hover:bg-navy-50 transition inline-flex items-center justify-center gap-2"><i class="bi bi-envelope-paper"></i>Enquiry</a>' +
            '</div>' +
            '<div class="relative mt-2.5">' +
              '<button type="button" class="logmenu-toggle w-full border border-navy-100 text-navy text-sm font-semibold px-4 py-2.5 rounded hover:bg-navy-50 transition inline-flex items-center justify-center gap-2" data-project="' + esc(p.project_name) + '"><i class="bi bi-list-ul"></i>Log Menu<i class="bi bi-chevron-down text-xs"></i></button>' +
              '<div class="logmenu hidden absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-[320px] max-w-[88vw] bg-white border border-navy-100 rounded-xl shadow-lg overflow-hidden z-10 max-h-64 overflow-y-auto"></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
      list.querySelectorAll('.clamp-wrap').forEach((w) => {
        const t = w.querySelector('.clamp-text');
        const btn = w.querySelector('.clamp-btn');
        if (t && btn && t.scrollHeight <= t.clientHeight + 1) {
          btn.style.display = 'none';
        }
      });
    } catch (err) {
      list.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
    }
  });
})();
