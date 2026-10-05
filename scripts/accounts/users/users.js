// pages/accounts/complaint.html logic: guard, welcome + IST date, prefill, issue blocks.
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    // ---- Guard + welcome ----
    let user = null;
    try { user = JSON.parse(localStorage.getItem('trishan_user') || 'null'); } catch (e) { user = null; }
    if (!user) { location.href = 'login.html'; return; }

    const first = user.first_name || 'User';
    document.getElementById('userFirstName').textContent = first;
    const full = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ');
    document.getElementById('welcomeSub').textContent = full || user.email || user.phone || '';

    try {
      const fmt = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
      document.getElementById('todayDate').textContent = fmt.format(new Date());
    } catch (e) {
      document.getElementById('todayDate').textContent = new Date().toDateString();
    }

    // ---- Prefill details from logged-in user (locked) ----
    document.getElementById('cFullName').value = full;
    document.getElementById('cEmail').value = user.email || '';
    document.getElementById('cPhone').value = user.phone || '';
    ['cFullName', 'cEmail', 'cPhone'].forEach((id) => {
      const el = document.getElementById(id);
      el.readOnly = true;
      el.classList.add('bg-navy-50');
    });

    // Project preselected from the Projects page (always locked).
    const params = new URLSearchParams(location.search);
    const preProject = (params.get('project') || '').trim().slice(0, 150);
    if (!preProject) { location.href = 'projects.html'; return; }
    const projectEl = document.getElementById('cProject');
    projectEl.value = preProject;
    projectEl.readOnly = true;
    projectEl.classList.add('bg-navy-50');

    // ---- Issue blocks (adapted from reference, site-styled with bootstrap icons) ----
    const container = document.getElementById('issuesContainer');
    const badge = document.getElementById('issueCountBadge');
    let issueCount = 0;

    function blockHTML(n) {
      return '' +
      '<div class="issue-block border border-navy-100 rounded p-4 bg-white" data-index="' + n + '">' +
        '<div class="flex items-center justify-between mb-3">' +
          '<span class="inline-flex items-center gap-2 text-sm font-semibold text-navy">' +
            '<span class="w-5 h-5 rounded-full bg-navy text-white text-[11px] flex items-center justify-center issue-number">' + n + '</span>Issue' +
          '</span>' +
          '<button type="button" class="remove-issue-btn hidden text-xs font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1 transition"><i class="bi bi-trash"></i>Remove</button>' +
        '</div>' +
        '<label class="block text-xs font-semibold text-navy-900/70 mb-1.5">Description</label>' +
        '<textarea required rows="3" placeholder="Describe this specific issue" class="issue-desc border border-navy-100 rounded px-3.5 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-navy-700"></textarea>' +
      '</div>';
    }

    function renumber() {
      const blocks = container.querySelectorAll('.issue-block');
      blocks.forEach((b, i) => {
        b.querySelector('.issue-number').textContent = i + 1;
        b.querySelector('.remove-issue-btn').classList.remove('hidden');
      });
      badge.textContent = blocks.length + (blocks.length > 1 ? ' issues' : ' issue');
    }

    function addBlock() {
      // Require every existing description to be filled before adding another.
      const descs = container.querySelectorAll('.issue-desc');
      for (const d of descs) {
        if (d.value.trim() === '') {
          d.classList.add('border-red-500');
          d.focus();
          if (d.reportValidity) d.reportValidity();
          d.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return false;
        }
      }
      issueCount++;
      container.insertAdjacentHTML('beforeend', blockHTML(issueCount));
      renumber();
      const blocks = container.querySelectorAll('.issue-block');
      const last = blocks[blocks.length - 1];
      if (last) last.querySelector('.issue-desc').focus();
      return true;
    }

    document.getElementById('addIssueBtn').addEventListener('click', addBlock);

    container.addEventListener('input', (e) => {
      if (e.target.classList.contains('issue-desc') && e.target.value.trim() !== '') {
        e.target.classList.remove('border-red-500');
      }
    });

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-issue-btn');
      if (btn) {
        btn.closest('.issue-block').remove();
        if (!container.querySelector('.issue-block')) {
          issueCount = 0;
          addBlock();
        } else {
          renumber();
        }
      }
    });

    // ---- Submit complaint to backend ----
    document.getElementById('complaintForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const note = document.getElementById('formNote');
      const btn = form.querySelector('button[type="submit"]');
      const descriptions = Array.from(container.querySelectorAll('.issue-desc'))
        .map((t) => t.value.trim()).filter((d) => d !== '');
      if (!descriptions.length) return;
      note.classList.add('hidden');
      btn.disabled = true;
      btn.textContent = 'Submitting…';
      try {
        const res = await fetch('../../../api/accounts/users/complaint.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: (typeof trishanHeaders === 'function' ? trishanHeaders() : { 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            user_id: user.id,
            project_name: document.getElementById('cProject').value.trim(),
            descriptions,
          }),
        });
        const body = await res.json().catch(() => null);
        if (body && body.ok) {
          note.style.color = '';
          note.innerHTML = '<i class="bi bi-check-circle me-1"></i>Your complaint has been submitted. Our team will get back to you shortly.';
          note.classList.remove('hidden');
          if (!preProject) document.getElementById('cProject').value = '';
          container.innerHTML = '';
          issueCount = 0;
          addBlock();
        } else {
          note.style.color = '#DC2626';
          note.textContent = (body && body.error) || 'Could not submit complaint.';
          note.classList.remove('hidden');
        }
      } catch (err) {
        note.style.color = '#DC2626';
        note.textContent = 'Cannot reach server. Start Apache and MySQL in XAMPP.';
        note.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send"></i>Submit Complaint';
        note.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    addBlock();
  });
})();
