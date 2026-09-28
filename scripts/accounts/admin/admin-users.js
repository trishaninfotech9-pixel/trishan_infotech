// pages/accounts/admin/users.html logic: alphabetical user list, expand to manage projects.
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!admin) { location.href = 'admin.html'; return; }
    document.getElementById('adminUsersName').textContent = admin.username || 'Admin';

    const box = document.getElementById('userCards');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtDate = (d) => {
      try {
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(String(d).replace(' ', 'T') + 'Z'));
      } catch (e) { return d; }
    };
    const trashSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#DC2626" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3V2h11v1z"/></svg>';

    async function api(url, opts) {
      const res = await fetch(url, opts);
      const body = await res.json().catch(() => null);
      if (!body || !body.ok) throw new Error((body && body.error) || 'Request failed.');
      return body;
    }

    let lastProjects = [];

    // Project popup (full details). Built once, filled per click.
    let modal = document.getElementById('projModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'projModal';
      modal.className = 'hidden fixed inset-0 z-[80] flex items-center justify-center p-4';
      modal.innerHTML =
        '<div class="proj-overlay absolute inset-0 bg-navy-900/50"></div>' +
        '<div class="relative bg-white rounded-2xl shadow-sm max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6">' +
          '<button type="button" class="proj-close absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-navy-50 transition" aria-label="Close"><i class="bi bi-x-lg text-navy"></i></button>' +
          '<div id="projModalBody" class="space-y-3"></div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.querySelector('.proj-overlay').addEventListener('click', () => modal.classList.add('hidden'));
      modal.querySelector('.proj-close').addEventListener('click', () => modal.classList.add('hidden'));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.add('hidden'); });
    }
    function openProject(i) {
      const p = lastProjects[i];
      if (!p) return;
      const pd = p.pd || {};
      const money = (v) => (v !== null && v !== '' && v !== undefined) ? '₹' + esc(v) : '';
      const dt = (v) => v ? esc(v) : '';
      const vrow = (label, val) => val ? '<div class="flex justify-between gap-3 py-1.5 border-b border-navy-100/70 last:border-0"><span class="text-navy-900/50 text-[13px]">' + label + '</span><span class="text-navy-900/80 text-[13px] font-medium break-words text-right">' + val + '</span></div>' : '';
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
      const bodyEl = document.getElementById('projModalBody');
      bodyEl.innerHTML =
        '<p class="font-extrabold text-xl text-navy break-words pr-8">' + esc(p.project_name) + '</p>' +
        '<p class="text-[13px] text-navy-900/60">' + esc(fmtDate(p.created_at)) + (p.open ? (p.complaint_id && p.page ? ' • <a href="' + p.page + '.html?focus=' + p.complaint_id + '" class="font-semibold text-gold-600 hover:underline">open complaint</a>' : ' • <span class="font-semibold text-gold-600">open complaint</span>') : '') + '</p>' +
        (p.details ? '<div><p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-1">Details</p><p class="text-sm text-navy-900/80 leading-relaxed break-words">' + esc(p.details) + '</p></div>' : '') +
        ((p.budget !== null && p.budget !== '' && p.budget !== undefined) ? '<p class="text-sm font-bold text-navy">Budget: ₹' + esc(p.budget) + '</p>' : '') +
        (extra ? '<div>' + extra + '</div>' : '');
      modal.classList.remove('hidden');
    }

    async function loadProjects(card, uid) {
      const listEl = card.querySelector('.u-projects');
      listEl.innerHTML = '<p class="text-sm text-navy-900/60">Loading…</p>';
      try {
        const body = await api('../../../api/accounts/admin/user-projects.php?admin_id=' + encodeURIComponent(admin.id) + '&user_id=' + encodeURIComponent(uid));
        if (!body.projects.length) {
          listEl.innerHTML = '<p class="text-sm text-navy-900/60">No projects yet. Add one below.</p>';
          return;
        }
        listEl.innerHTML = '<div class="grid sm:grid-cols-2 gap-3">' + (lastProjects = body.projects).map((p, i) =>
          '<div class="bg-white border border-navy-100 rounded-xl p-4 sm:p-5 shadow-sm hover:border-navy-700 hover:shadow transition flex flex-col cursor-pointer" data-pcard="' + i + '">' +
            '<div class="flex items-start justify-between gap-3 mb-2">' +
              '<div class="min-w-0"><p class="font-bold text-navy leading-snug break-words">' + esc(p.project_name) + '</p>' +
              '<p class="text-[12px] text-navy-900/50 mt-0.5">' + esc(fmtDate(p.created_at)) + (p.open ? ' • <span class="font-semibold text-gold-600">open complaint</span>' : '') + '</p></div>' +
              '<button type="button" class="u-del shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition" data-id="' + p.id + '" data-source="' + (p.source || 'assigned') + '" data-name="' + esc(p.project_name) + '" aria-label="Delete project ' + esc(p.project_name) + '">' + trashSVG + '</button>' +
            '</div>' +
            (p.details ? '<div class="clamp-text clamp-2 text-[13px] text-navy-900/70 leading-relaxed break-words">' + esc(p.details) + '</div>' : '') +
          '</div>'
        ).join('') + '</div>';
      } catch (err) {
        listEl.innerHTML = '<p class="text-sm text-red-600">' + esc(err.message) + '</p>';
      }
    }

    box.innerHTML = '<p class="text-sm text-navy-900/60 text-center">Loading…</p>';
    try {
      const body = await api('../../../api/accounts/admin/list-users.php?admin_id=' + encodeURIComponent(admin.id));
      const users = (body.users || []).slice().sort((a, b) =>
        ([a.first_name, a.last_name].filter(Boolean).join(' ') || '').localeCompare([b.first_name, b.last_name].filter(Boolean).join(' '), undefined, { sensitivity: 'base' }));
      if (!users.length) {
        box.innerHTML = '<div class="border border-navy-100 rounded p-5 text-center bg-white"><p class="text-sm text-navy-900/60">No users yet.</p></div>';
        return;
      }
      box.innerHTML = users.map((u) => {
        const name = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ');
        const contact = [u.email, u.phone].filter(Boolean).join(' • ');
        return '<div class="border border-navy-100 rounded bg-white overflow-hidden" data-user="' + u.id + '">' +
          '<button type="button" class="u-head w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 hover:bg-navy-50/60 transition text-left">' +
            '<span class="min-w-0"><span class="block font-bold text-navy break-words">' + esc(name) + '</span>' +
            (contact ? '<span class="block text-[13px] text-navy-900/60 break-words">' + esc(contact) + '</span>' : '') + '</span>' +
            '<i class="bi bi-chevron-down u-chev shrink-0 text-navy-900/50 transition-transform"></i>' +
          '</button>' +
          '<div class="u-body hidden border-t border-navy-100 px-4 sm:px-5 py-4 space-y-3">' +
            '<div class="u-projects space-y-2.5"></div>' +
            '<form class="u-add border border-navy-100 rounded p-4 space-y-3 bg-navy-50/40">' +
              '<p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50">Add Project</p>' +
              '<input required type="text" maxlength="150" placeholder="Project name" class="u-name border border-navy-100 rounded px-3.5 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-navy-700">' +
              '<textarea required rows="2" maxlength="2000" placeholder="Project details" class="u-det border border-navy-100 rounded px-3.5 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-navy-700"></textarea>' +
              '<div class="grid sm:grid-cols-2 gap-3">' + [
                ['u-bud', 'Budget', 'required type="number" min="0" step="0.01"'],
                ['u-f-domain_name', 'Domain Name', 'required type="text" maxlength="150"'],
                ['u-f-domain_booking_date', 'Domain Booking Date', 'required type="date"'],
                ['u-f-domain_amount', 'Domain Amount', 'required type="number" min="0" step="0.01"'],
                ['u-f-server_name', 'Server Name', 'required type="text" maxlength="150"'],
                ['u-f-server_renewal_date', 'Server Renewal Date', 'required type="date"'],
                ['u-f-server_amount', 'Server Amount', 'required type="number" min="0" step="0.01"'],
                ['u-f-amc_date', 'AMC Date', 'required type="date"'],
                ['u-f-amc_amount', 'AMC Amount', 'required type="number" min="0" step="0.01"'],
                ['u-f-mmc_date', 'MMC Date', 'required type="date"'],
                ['u-f-mmc_amount', 'MMC Amount', 'required type="number" min="0" step="0.01"'],
                ['u-f-paid_amount', 'Paid', 'required type="number" min="0" step="0.01"'],
                ['u-f-due_amount', 'Due Amount (auto)', 'readonly tabindex="-1" type="number" min="0" step="0.01" placeholder="Auto = Budget − Paid"', 'bg-navy-50/60 cursor-not-allowed'],
                ['u-f-next_payment_date', 'Next Payment Date', 'required type="date"'],
                ['u-f-last_pay_amount', 'Last Pay Amount', 'required type="number" min="0" step="0.01"'],
                ['u-f-last_pay_date', 'Last Pay Date', 'required type="date"'],
              ].map((f) =>
                '<div><label class="block text-[12px] font-semibold text-navy mb-1">' + f[1] + (f[0] === 'u-f-due_amount' ? '' : ' *') + '</label>' +
                '<input ' + f[2] + ' class="' + f[0] + ' border border-navy-100 rounded px-3.5 py-2 text-sm w-full ' + (f[3] || 'bg-white') + ' focus:outline-none focus:ring-2 focus:ring-navy-700"></div>'
              ).join('') +
              '</div>' +
                '<button type="submit" class="shrink-0 bg-navy text-white text-sm font-semibold px-5 py-2.5 min-h-[44px] rounded hover:bg-navy-700 transition inline-flex items-center gap-2"><i class="bi bi-plus-circle"></i>Add</button>' +
              '<p class="u-msg text-[13px] hidden"></p>' +
            '</form>' +
          '</div>' +
        '</div>';
      }).join('');
    } catch (err) {
      box.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
      return;
    }

    // Click a project card (not the dustbin) to pop up full details.
    box.addEventListener('click', (e) => {
      if (e.target.closest('.u-del')) return;
      const card = e.target.closest('[data-pcard]');
      if (!card) return;
      openProject(+card.dataset.pcard);
    });

    // Expand / collapse a user.
    box.addEventListener('click', (e) => {
      const head = e.target.closest('.u-head');
      if (!head) return;
      const card = head.closest('[data-user]');
      const bodyEl = card.querySelector('.u-body');
      const chev = card.querySelector('.u-chev');
      const opening = bodyEl.classList.toggle('hidden');
      if (chev) chev.style.transform = opening ? '' : 'rotate(180deg)';
      if (!opening && !bodyEl.dataset.loaded) {
        bodyEl.dataset.loaded = '1';
        loadProjects(card, card.dataset.user);
      }
    });

    // Auto-calc Due = Budget − Paid (due field is readonly, changes only with those two).
    function recalcDue(form) {
      const b = parseFloat(form.querySelector('.u-bud').value);
      const p = parseFloat(form.querySelector('.u-f-paid_amount').value);
      const dueEl = form.querySelector('.u-f-due_amount');
      if (!dueEl) return;
      if (isNaN(b)) { dueEl.value = ''; return; }
      dueEl.value = String(Math.round(Math.max(0, b - (isNaN(p) ? 0 : p)) * 100) / 100);
    }
    box.addEventListener('input', (e) => {
      if (!e.target.matches || !e.target.matches('.u-bud, .u-f-paid_amount')) return;
      const form = e.target.closest('.u-add');
      if (form) recalcDue(form);
    });

    // Add project for the expanded user.
    box.addEventListener('submit', async (e) => {
      const form = e.target.closest('.u-add');
      if (!form) return;
      e.preventDefault();
      const card = form.closest('[data-user]');
      const msg = form.querySelector('.u-msg');
      const nameEl = form.querySelector('.u-name');
      const detEl = form.querySelector('.u-det');
      const budEl = form.querySelector('.u-bud');
      msg.classList.add('hidden');
      if (!nameEl.value.trim()) { nameEl.focus(); nameEl.reportValidity(); return; }
      if (!detEl.value.trim()) { detEl.focus(); detEl.reportValidity(); return; }
      if (!budEl.value.trim()) { budEl.focus(); budEl.reportValidity(); return; }
      recalcDue(form);
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const payload = {
          admin_id: admin.id,
          user_id: card.dataset.user,
          project_name: nameEl.value.trim(),
          details: detEl.value.trim(),
          budget: budEl.value.trim(),
        };
        form.querySelectorAll('[class*="u-f-"]').forEach((el) => {
          const key = Array.from(el.classList).find((c) => c.indexOf('u-f-') === 0).slice(4);
          payload[key] = el.value.trim();
        });
        await api('../../../api/accounts/admin/add-project.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        msg.textContent = 'Project added.';
        msg.style.color = '';
        msg.classList.remove('hidden');
        form.reset();
        await loadProjects(card, card.dataset.user);
      } catch (err) {
        msg.textContent = err.message;
        msg.style.color = '#DC2626';
        msg.classList.remove('hidden');
        msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } finally {
        btn.disabled = false;
      }
    });

    // Delete project (assigned rows; complaint-sourced need the Users-page rule via API).
    box.addEventListener('click', async (e) => {
      const btn = e.target.closest('.u-del');
      if (!btn) return;
      const card = btn.closest('[data-user]');
      const isComplaint = btn.dataset.source === 'complaint';
      if (!confirm(isComplaint
        ? 'Delete "' + btn.dataset.name + '"? This removes its complaint(s) and responses from the database. This cannot be undone.'
        : 'Delete this project? This cannot be undone.')) return;
      btn.disabled = true;
      btn.style.opacity = '0.5';
      try {
        const payload = isComplaint
          ? { admin_id: admin.id, project_id: 0, user_id: card.dataset.user, project_name: btn.dataset.name }
          : { admin_id: admin.id, project_id: btn.dataset.id };
        await api('../../../api/accounts/admin/delete-project.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        await loadProjects(card, card.dataset.user);
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });
  });
})();
