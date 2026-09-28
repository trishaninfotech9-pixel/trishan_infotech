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
      list.innerHTML = body.projects.map((p) => {
        const det = p.details ? String(p.details) : '';
        const detHtml = !det ? '' :
          det.length <= 150 ? '<p class="text-[13px] text-navy-900/70 leading-relaxed break-words mb-1">' + esc(det) + '</p>' :
          '<div class="clamp-wrap mb-1"><p class="clamp-text clamp-3 text-[13px] text-navy-900/70 leading-relaxed">' + esc(det) + '</p><a href="details.html?project=' + encodeURIComponent(p.project_name) + '" class="clamp-btn inline-block">Show more</a></div>';
        const pd = p.pd || {};
        const money = (v) => (v !== null && v !== '' && v !== undefined) ? '₹' + esc(v) : '';
        const dt = (v) => v ? esc(v) : '';
        const vrow = (label, val) => val ? '<div class="flex justify-between gap-3 py-1 border-b border-navy-100/70 last:border-0"><span class="text-navy-900/50 text-[13px]">' + label + '</span><span class="text-navy-900/80 text-[13px] font-medium break-words text-right">' + val + '</span></div>' : '';
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
        return '<div class="border border-navy-100 rounded-xl p-6 hover:border-navy-700 transition flex flex-col">' +
          '<div class="w-10 h-10 rounded bg-navy-50 flex items-center justify-center mb-3"><i class="bi bi-kanban text-navy text-lg"></i></div>' +
          '<p class="font-bold text-lg text-navy mb-1.5 break-words"><a href="details.html?project=' + encodeURIComponent(p.project_name) + '" class="hover:text-gold-600 transition">' + esc(p.project_name) + '</a></p>' +
          detHtml +
          (extra ? '<div class="my-2">' + extra + '</div>' : '') +
          '<p class="text-sm text-navy-900/60 mb-4">Added ' + esc(fmtDate(p.created_at)) + '</p>' +
          '<div class="mt-auto flex gap-2.5">' +
            '<a href="details.html?project=' + encodeURIComponent(p.project_name) + '" class="flex-1 border border-navy-100 text-navy text-sm font-semibold px-4 py-2.5 rounded hover:bg-navy-50 transition inline-flex items-center justify-center gap-2"><i class="bi bi-info-circle"></i>Details</a>' +
            '<a href="complaint.html?project=' + encodeURIComponent(p.project_name) + '" class="flex-1 bg-navy text-white text-sm font-semibold px-4 py-2.5 rounded hover:bg-navy-700 transition inline-flex items-center justify-center gap-2"><i class="bi bi-flag"></i>Complaint</a>' +
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
