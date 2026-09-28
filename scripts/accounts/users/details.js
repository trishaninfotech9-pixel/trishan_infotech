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

    // Print CSS: only the bill shows on paper, everything else hides.
    if (!document.getElementById('billPrintCss')) {
      const st = document.createElement('style');
      st.id = 'billPrintCss';
      st.textContent = '@media print{body>*{display:none!important;}#printBill{display:block!important;}#printBill table{width:100%;border-collapse:collapse;margin-top:12px;}#printBill th,#printBill td{border:1px solid #999;padding:8px;text-align:left;font-size:14px;}#printBill h1{font-size:22px;margin:0;}#printBill p{margin:4px 0;font-size:14px;}#printBill .pb-total td{font-weight:bold;background:#f1f1f1;}}';
      document.head.appendChild(st);
    }
    // Build a clean paper bill from the on-screen Bill tab rows, then print.
    function printBill() {
      const panel = body.querySelector('.pay-panel[data-panel="bill"]');
      if (!panel) return;
      const rows = Array.from(panel.querySelectorAll(':scope > div')).map((d) => {
        const s = d.querySelectorAll('span');
        return s.length >= 2 ? [s[0].textContent.trim(), s[1].textContent.trim()] : null;
      }).filter(Boolean);
      if (!rows.length) return;
      const num = (t) => { const n = parseFloat(String(t).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
      const expLabels = ['Domain Amount', 'Server Amount', 'AMC Amount', 'MMC Amount', 'Last Pay Amount'];
      let expTotal = 0;
      rows.forEach((r) => { if (expLabels.indexOf(r[0]) !== -1) expTotal += num(r[1]); });
      const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      let pb = document.getElementById('printBill');
      if (!pb) { pb = document.createElement('div'); pb.id = 'printBill'; pb.style.display = 'none'; document.body.appendChild(pb); }
      pb.innerHTML =
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#111;padding:8px;">' +
        '<h1>Trishan Infotech</h1>' +
        '<p><strong>Project Bill</strong> &nbsp;|&nbsp; Date: ' + esc(today) + '</p>' +
        '<table><tbody>' +
        rows.map((r) => '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>').join('') +
        '<tr class="pb-total"><td>Total Expenses</td><td>' + esc('₹' + expTotal.toFixed(2)) + '</td></tr>' +
        '</tbody></table></div>';
      window.print();
    }

    // Payment / Bill tab switching (delegated, survives re-renders).
    body.addEventListener('click', (e) => {
      const pr = e.target.closest('.print-bill');
      if (pr && body.contains(pr)) { printBill(); return; }
      const tab = e.target.closest('.pay-tab');
      if (!tab || !body.contains(tab)) return;
      const key = tab.dataset.tab;
      body.querySelectorAll('.pay-tab').forEach((b) => {
        const on = b.dataset.tab === key;
        b.classList.toggle('bg-navy', on);
        b.classList.toggle('text-white', on);
        b.classList.toggle('border-navy', on);
        b.classList.toggle('bg-white', !on);
        b.classList.toggle('text-navy', !on);
        b.classList.toggle('border-navy-100', !on);
      });
      body.querySelectorAll('.pay-panel').forEach((p) => {
        p.classList.toggle('hidden', p.dataset.panel !== key);
      });
    });

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
      const st = (proj && proj.status) || 'pending';
      const statusPill = '<span class="inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ' + (st === 'complete' ? 'text-green-700 bg-green-50' : (st === 'process' ? 'text-amber-700 bg-amber-50' : 'text-red-600 bg-red-50')) + '">' + (st === 'complete' ? 'Completed' : (st === 'process' ? 'Work Under Process' : 'Pending')) + '</span>';
      const mine = (mc.complaints || []).filter((c) => (c.project_name || '').toLowerCase() === name.toLowerCase());
      const history = mine.length
        ? mine.map((c) => {
            const replied = (c.responses || []).length > 0;
            const issueList = (c.issues || []).map((i) => '<li class="text-sm text-navy-900/80 leading-relaxed break-words">• ' + esc(i.description) + '</li>').join('');
            return '<div class="border border-navy-100 rounded px-3.5 py-2.5">' +
              '<div class="flex items-center justify-between gap-2 mb-1">' +
                '<span class="text-sm text-navy-900/80">' + esc(fmtDate(c.created_at)) + ' • ' + c.issues.length + ' issue' + (c.issues.length === 1 ? '' : 's') + '</span>' +
                '<span class="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ' + (replied ? 'text-green-700 bg-green-50' : 'text-gold-600 bg-navy-50') + '">' + (replied ? 'Replied' : 'Pending') + '</span>' +
              '</div>' +
              '<ul class="space-y-1">' + issueList + '</ul>' +
            '</div>';
          }).join('')
        : '<p class="text-sm text-navy-900/50">No complaints for this project yet.</p>';

      const detText = (det && det.project_details) ? det.project_details : ((proj && proj.details) ? proj.details : '');
      const billMoney = (v) => (v !== null && v !== '' && v !== undefined) ? '₹' + esc(v) : '<span class="text-navy-900/40">—</span>';
      const brow = (label, val) => {
        const cls = label === 'Paid' ? 'text-green-700 font-bold' : (label === 'Due Amount' ? 'text-red-600 font-bold' : 'text-navy-900/80 font-medium');
        return '<div class="flex justify-between gap-3 py-1.5 border-b border-navy-100/70 last:border-0"><span class="text-navy-900/50 text-[13px]">' + label + '</span><span class="' + cls + ' text-[13px] break-words text-right">' + val + '</span></div>';
      };
      const payBudget = (det && det.budget !== null && det.budget !== '' && det.budget !== undefined) ? '₹' + esc(det.budget) : ((proj && proj.budget !== null && proj.budget !== '' && proj.budget !== undefined) ? '₹' + esc(proj.budget) : '<span class="text-navy-900/40">—</span>');
      const paymentHtml =
        brow('Project Name', '<span class="font-semibold text-navy">' + esc(name) + '</span>') +
        brow('Budget', payBudget) +
        brow('Paid', det ? billMoney(det.paid_amount) : '—') +
        brow('Due Amount', det ? billMoney(det.due_amount) : '—');
      const billHtml =
        brow('Project Name', '<span class="font-semibold text-navy">' + esc(name) + '</span>') +
        brow('Budget', payBudget) +
        brow('Domain Amount', det ? billMoney(det.domain_amount) : '—') +
        brow('Server Amount', det ? billMoney(det.server_amount) : '—') +
        brow('AMC Amount', det ? billMoney(det.amc_amount) : '—') +
        brow('MMC Amount', det ? billMoney(det.mmc_amount) : '—') +
        brow('Last Pay Amount', det ? billMoney(det.last_pay_amount) : '—') +
        brow('Paid', det ? billMoney(det.paid_amount) : '—') +
        brow('Due Amount', det ? billMoney(det.due_amount) : '—');
      const tabBtn = (key, label, on) => '<button type="button" data-tab="' + key + '" class="pay-tab flex-1 text-sm font-semibold px-4 py-2.5 rounded border transition ' + (on ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-navy-100 hover:bg-navy-50') + '">' + label + '</button>';
      const tabsHtml =
        '<div>' +
          '<div class="flex gap-2.5 mb-3">' + tabBtn('payment', 'Payment', true) + tabBtn('bill', 'Bill', false) + '</div>' +
          '<div class="pay-panel border border-navy-100 rounded-xl px-4 py-2 bg-white" data-panel="payment">' + paymentHtml + '</div>' +
          '<div class="pay-panel hidden border border-navy-100 rounded-xl px-4 py-2 bg-white" data-panel="bill">' + billHtml +
            '<button type="button" class="print-bill mt-3 mb-2 w-full bg-navy text-white text-sm font-semibold px-4 py-2.5 rounded hover:bg-navy-700 transition inline-flex items-center justify-center gap-2"><i class="bi bi-printer"></i>Print Bill</button></div>' +
        '</div>';
      const infoRows =
        '<div class="grid sm:grid-cols-[150px_1fr] gap-x-4 gap-y-1 py-3">' +
          '<dt class="text-[12px] font-semibold uppercase tracking-wide text-navy-900/50">Name</dt>' +
          '<dd class="text-sm text-navy-900/80">' + esc(det ? det.username : [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ')) + '</dd>' +
          '<dt class="text-[12px] font-semibold uppercase tracking-wide text-navy-900/50">Email</dt>' +
          '<dd class="text-sm text-navy-900/80 break-all">' + esc(det ? det.email : user.email) + '</dd>' +
          '<dt class="text-[12px] font-semibold uppercase tracking-wide text-navy-900/50">Phone</dt>' +
          '<dd class="text-sm text-navy-900/80">' + esc(det ? det.phone_no : user.phone) + '</dd>' +
          ((det && det.budget !== null && det.budget !== '') ? '<dt class="text-[12px] font-semibold uppercase tracking-wide text-navy-900/50">Budget</dt><dd class="text-sm font-bold text-navy">₹' + esc(det.budget) + '</dd>' : '') +
          '<dt class="text-[12px] font-semibold uppercase tracking-wide text-navy-900/50">Status</dt><dd class="text-sm">' + statusPill + '</dd>' +
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
            tabsHtml +
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
