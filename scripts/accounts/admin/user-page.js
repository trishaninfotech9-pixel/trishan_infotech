// pages/accounts/admin/users_page logic: one user's projects + add project.
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('trishan_admin') || 'null'); } catch (e) { admin = null; }
    if (!admin) { location.href = 'admin'; return; }
    const uid = (new URLSearchParams(location.search).get('user_id') || '').trim();
    if (!uid) { location.href = 'users'; return; }

    const head = document.getElementById('upHead');
    const grid = document.getElementById('upProjects');
    const addWrap = document.getElementById('upAddWrap');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtDate = (d) => {
      try {
        return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(String(d).replace(' ', 'T') + '+05:30'));
      } catch (e) { return d; }
    };
    const trashSVG = '<i class="bi bi-trash3 text-red-500" style="font-size:17px"></i>';

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

    let account = null;
    let lastProjects = [];
    let currentIndex = 0;

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
      currentIndex = i;
      const pd = p.pd || {};
      const money = (v) => (v !== null && v !== '' && v !== undefined) ? '₹' + esc(v) : '';
      const dt = (v) => v ? esc(v) : '';
      const vrow = (label, val) => val ? '<div class="flex justify-between gap-3 py-1.5 border-b border-navy-100/70 last:border-0"><span class="shrink-0 text-navy-900/50 text-[13px]">' + label + '</span><span class="min-w-0 text-navy-900/80 text-[13px] font-medium break-all text-right">' + val + '</span></div>' : '';
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
      const canEdit = (p.source || 'assigned') === 'assigned' || (pd && pd.project_name);
      const bodyEl = document.getElementById('projModalBody');
      bodyEl.innerHTML =
        '<p class="font-extrabold text-xl text-navy break-words pr-8">' + esc(p.project_name) + '</p>' +
        '<p class="text-[13px] text-navy-900/60">' + esc(fmtDate(p.created_at)) + (p.open ? (p.complaint_id && p.page ? ' • <a href="' + p.page + '?focus=' + p.complaint_id + '" class="font-semibold text-gold-600 hover:underline">open complaint</a>' : ' • <span class="font-semibold text-gold-600">open complaint</span>') : '') + '</p>' +
        (p.details ? '<div><p class="text-[11px] font-bold uppercase tracking-wide text-navy-900/50 mb-1">Details</p><p class="text-sm text-navy-900/80 leading-relaxed break-words">' + esc(p.details) + '</p></div>' : '') +
        ((p.budget !== null && p.budget !== '' && p.budget !== undefined) ? '<p class="text-sm font-bold text-navy">Budget: ₹' + esc(p.budget) + '</p>' : '') +
        (extra ? '<div>' + extra + '</div>' : '') +
        (canEdit ? '<div class="pt-2"><button type="button" id="projEditBtn" class="bg-navy text-white text-sm font-semibold px-5 py-2.5 min-h-[44px] rounded hover:bg-navy-700 transition inline-flex items-center gap-2"><i class="bi bi-pencil-square"></i>Edit project</button></div><p id="projEditMsg" class="text-[13px] hidden"></p>' : '<p class="text-[12px] text-navy-900/50">Complaint-only project — add it as a project first to enable editing.</p>');
      modal.classList.remove('hidden');
      const editBtn = document.getElementById('projEditBtn');
      if (editBtn) editBtn.addEventListener('click', () => openEditForm());
    }

    function openEditForm() {
      const p = lastProjects[currentIndex];
      if (!p) return;
      const pd = p.pd || {};
      const val = (v) => esc(v ?? '');
      const num = (v) => (v !== null && v !== undefined) ? esc(v) : '';
      const field = (label, name, attrs, v) => '<div><label class="block text-[12px] font-semibold text-navy mb-1">' + label + '</label><input name="' + name + '" ' + attrs + ' value="' + val(v) + '" class="border border-navy-100 rounded px-3.5 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-navy-700"></div>';
      const bodyEl = document.getElementById('projModalBody');
      bodyEl.innerHTML =
        '<p class="font-extrabold text-xl text-navy break-words pr-8">Edit: ' + esc(p.project_name) + '</p>' +
        '<form id="projEditForm" class="space-y-3">' +
          '<div><label class="block text-[12px] font-semibold text-navy mb-1">Details *</label><textarea name="details" required rows="2" maxlength="2000" class="border border-navy-100 rounded px-3.5 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-navy-700">' + val(p.details) + '</textarea></div>' +
          '<div class="grid sm:grid-cols-2 gap-3">' +
            field('Budget *', 'budget', 'required type="number" min="0" step="0.01"', (pd.budget ?? p.budget ?? '')) +
            field('Domain Name *', 'domain_name', 'required type="text" maxlength="150"', pd.domain_name) +
            field('Domain Booking Date *', 'domain_booking_date', 'required type="date"', pd.domain_booking_date) +
            field('Domain Amount *', 'domain_amount', 'required type="number" min="0" step="0.01"', pd.domain_amount) +
            field('Server Name *', 'server_name', 'required type="text" maxlength="150"', pd.server_name) +
            field('Server Renewal Date *', 'server_renewal_date', 'required type="date"', pd.server_renewal_date) +
            field('Server Amount *', 'server_amount', 'required type="number" min="0" step="0.01"', pd.server_amount) +
            field('AMC Date *', 'amc_date', 'required type="date"', pd.amc_date) +
            field('AMC Amount *', 'amc_amount', 'required type="number" min="0" step="0.01"', pd.amc_amount) +
            field('MMC Date *', 'mmc_date', 'required type="date"', pd.mmc_date) +
            field('MMC Amount *', 'mmc_amount', 'required type="number" min="0" step="0.01"', pd.mmc_amount) +
            field('Paid *', 'paid_amount', 'required type="number" min="0" step="0.01"', pd.paid_amount) +
            '<div><label class="block text-[12px] font-semibold text-navy mb-1">Due Amount (auto)</label><input name="due_amount" readonly tabindex="-1" type="number" class="border border-navy-100 rounded px-3.5 py-2 text-sm w-full bg-navy-50/60 cursor-not-allowed" value="' + num(pd.due_amount) + '"></div>' +
            field('Next Payment Date *', 'next_payment_date', 'required type="date"', pd.next_payment_date) +
            field('Last Pay Amount *', 'last_pay_amount', 'required type="number" min="0" step="0.01"', pd.last_pay_amount) +
            field('Last Pay Date *', 'last_pay_date', 'required type="date"', pd.last_pay_date) +
          '</div>' +
          '<div class="flex gap-2"><button type="submit" class="bg-navy text-white text-sm font-semibold px-5 py-2.5 min-h-[44px] rounded hover:bg-navy-700 transition">Save</button>' +
          '<button type="button" id="projCancelBtn" class="border border-navy-100 text-sm font-semibold px-5 py-2.5 min-h-[44px] rounded hover:bg-navy-50 transition">Cancel</button></div>' +
          '<p id="projEditMsg" class="text-[13px] hidden"></p>' +
        '</form>';
      const form = document.getElementById('projEditForm');
      const recalc = () => {
        const b = parseFloat(form.budget.value);
        const pa = parseFloat(form.paid_amount.value);
        form.due_amount.value = isNaN(b) ? '' : String(Math.round(Math.max(0, b - (isNaN(pa) ? 0 : pa)) * 100) / 100);
      };
      form.budget.addEventListener('input', recalc);
      form.paid_amount.addEventListener('input', recalc);
      document.getElementById('projCancelBtn').addEventListener('click', () => openProject(currentIndex));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('projEditMsg');
        msg.classList.add('hidden');
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          const fd = new FormData(form);
          const payload = { admin_id: admin.id, user_id: uid, project_name: p.project_name, details: (fd.get('details') || '').toString().trim(), budget: (fd.get('budget') || '').toString().trim() };
          ['domain_name','domain_booking_date','domain_amount','server_name','server_renewal_date','server_amount','amc_date','amc_amount','mmc_date','mmc_amount','paid_amount','next_payment_date','last_pay_amount','last_pay_date'].forEach((k) => { payload[k] = (fd.get(k) || '').toString().trim(); });
          await api('../../../api/accounts/admin/update-project.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          msg.textContent = 'Project updated.';
          msg.classList.remove('hidden');
          await loadProjects();
          const idx = lastProjects.findIndex((x) => String(x.project_name).toLowerCase() === String(p.project_name).toLowerCase());
          openProject(idx >= 0 ? idx : currentIndex);
        } catch (err) {
          msg.textContent = err.message;
          msg.style.color = '#DC2626';
          msg.classList.remove('hidden');
        } finally {
          btn.disabled = false;
        }
      });
    }

    function addFormHTML() {
      return '<form class="u-add border border-navy-100 rounded-xl p-4 sm:p-5 space-y-3 bg-white shadow-sm">' +
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
      '</form>';
    }

    function recalcDue(form) {
      const b = parseFloat(form.querySelector('.u-bud').value);
      const p = parseFloat(form.querySelector('.u-f-paid_amount').value);
      const dueEl = form.querySelector('.u-f-due_amount');
      if (!dueEl) return;
      if (isNaN(b)) { dueEl.value = ''; return; }
      dueEl.value = String(Math.round(Math.max(0, b - (isNaN(p) ? 0 : p)) * 100) / 100);
    }

    async function loadProjects() {
      grid.innerHTML = '<p class="text-sm text-navy-900/60 text-center col-span-full">Loading…</p>';
      try {
        const body = await api('../../../api/accounts/admin/user-projects.php?admin_id=' + encodeURIComponent(admin.id) + '&user_id=' + encodeURIComponent(uid));
        if (!body.projects.length) {
          grid.innerHTML = '<div class="border border-navy-100 rounded p-5 text-center bg-white col-span-full"><p class="text-sm text-navy-900/60">No projects yet. Add one below.</p></div>';
          lastProjects = [];
          return;
        }
        grid.innerHTML = (lastProjects = body.projects).map((p, i) =>
          '<div class="bg-white border border-navy-100 rounded-xl p-4 sm:p-5 shadow-sm hover:border-navy-700 hover:shadow transition flex flex-col cursor-pointer" data-pcard="' + i + '">' +
            '<div class="flex items-start justify-between gap-3 mb-2">' +
              '<div class="min-w-0"><p class="font-bold text-navy leading-snug break-words">' + esc(p.project_name) + '</p>' +
              '<p class="text-[12px] text-navy-900/50 mt-0.5">' + esc(fmtDate(p.created_at)) + (p.open ? ' • <span class="font-semibold text-gold-600">open complaint</span>' : '') + '</p></div>' +
              '<button type="button" class="u-del shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition" data-id="' + p.id + '" data-source="' + (p.source || 'assigned') + '" data-name="' + esc(p.project_name) + '" aria-label="Delete project ' + esc(p.project_name) + '">' + trashSVG + '</button>' +
            '</div>' +
            (p.details ? '<div class="clamp-text clamp-2 text-[13px] text-navy-900/70 leading-relaxed break-words">' + esc(p.details) + '</div>' : '') +
          '</div>'
        ).join('');
      } catch (err) {
        grid.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white col-span-full"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
      }
    }

    grid.addEventListener('click', (e) => {
      if (e.target.closest('.u-del')) return;
      const card = e.target.closest('[data-pcard]');
      if (!card) return;
      openProject(+card.dataset.pcard);
    });

    grid.addEventListener('click', async (e) => {
      const btn = e.target.closest('.u-del');
      if (!btn) return;
      const isComplaint = btn.dataset.source === 'complaint';
      if (!confirm(isComplaint
        ? 'Delete "' + btn.dataset.name + '"? This removes its complaint(s) and responses from the database. This cannot be undone.'
        : 'Delete this project? This cannot be undone.')) return;
      btn.disabled = true;
      btn.style.opacity = '0.5';
      try {
        const payload = isComplaint
          ? { admin_id: admin.id, project_id: 0, user_id: uid, project_name: btn.dataset.name }
          : { admin_id: admin.id, project_id: btn.dataset.id };
        await api('../../../api/accounts/admin/delete-project.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        await loadProjects();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });

    addWrap.addEventListener('input', (e) => {
      if (!e.target.matches || !e.target.matches('.u-bud, .u-f-paid_amount')) return;
      const form = e.target.closest('.u-add');
      if (form) recalcDue(form);
    });

    addWrap.addEventListener('submit', async (e) => {
      const form = e.target.closest('.u-add');
      if (!form) return;
      e.preventDefault();
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
        const payload = { admin_id: admin.id, user_id: uid, project_name: nameEl.value.trim(), details: detEl.value.trim(), budget: budEl.value.trim() };
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
        await loadProjects();
      } catch (err) {
        msg.textContent = err.message;
        msg.style.color = '#DC2626';
        msg.classList.remove('hidden');
        msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } finally {
        btn.disabled = false;
      }
    });

    // Boot: user header, then projects + add form.
    try {
      const body = await api('../../../api/accounts/admin/list-users.php?admin_id=' + encodeURIComponent(admin.id));
      account = (body.users || []).find((x) => String(x.id) === String(uid)) || null;
      if (!account) { location.href = 'users'; return; }
      const nm = [account.first_name, account.middle_name, account.last_name].filter(Boolean).join(' ') || 'User';
      const contact = [account.email, account.phone].filter(Boolean).join(' • ');
      head.innerHTML =
        '<div class="flex items-start justify-between gap-3">' +
          '<div class="min-w-0"><h1 class="hero-title text-2xl sm:text-3xl font-extrabold text-navy-900 mb-1.5 break-words">' + esc(nm) + '</h1>' +
          (contact ? '<p class="hero-lead text-sm text-navy-900/60 break-words">' + esc(contact) + '</p>' : '') + '</div>' +
          '<button type="button" id="upDelUser" class="shrink-0 inline-flex items-center gap-2 h-11 px-4 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition"><i class="bi bi-trash3"></i><span class="hidden sm:inline">Delete</span></button>' +
        '</div>';
      document.getElementById('upDelUser').addEventListener('click', async () => {
        if (!confirm('Delete user "' + nm + '"? This removes their projects, complaints and responses. This cannot be undone.')) return;
        try {
          await api('../../../api/accounts/admin/delete-user.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: admin.id, user_id: uid }),
          });
          location.href = 'users';
        } catch (err) { alert(err.message); }
      });
    } catch (err) {
      head.innerHTML = '<div class="border border-navy-100 rounded p-4 text-center bg-white"><p class="text-sm text-red-600">' + esc(err.message) + '</p></div>';
      return;
    }
    addWrap.innerHTML = addFormHTML();
    await loadProjects();
  });
})();
