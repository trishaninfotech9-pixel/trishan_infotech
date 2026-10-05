// pages/accounts/users/enquiry.html logic: guard, welcome, prefill, submit question.
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('trishan_user') || 'null'); } catch (e) { user = null; }
    if (!user) { location.href = 'login.html'; return; }

    document.getElementById('userFirstName').textContent = user.first_name || 'User';
    const full = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ');
    document.getElementById('welcomeSub').textContent = full || user.email || user.phone || '';
    try {
      document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }).format(new Date());
    } catch (e) {
      document.getElementById('todayDate').textContent = new Date().toDateString();
    }

    document.getElementById('eFullName').value = full;
    const nameEl = document.getElementById('eFullName');
    nameEl.readOnly = true;
    nameEl.classList.add('bg-navy-50');

    const params = new URLSearchParams(location.search);
    const preProject = (params.get('project') || '').trim().slice(0, 150);
    if (!preProject) { location.href = 'projects.html'; return; }
    const projectEl = document.getElementById('eProject');
    projectEl.value = preProject;
    projectEl.readOnly = true;
    projectEl.classList.add('bg-navy-50');

    document.getElementById('enquiryForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const note = document.getElementById('formNote');
      const btn = form.querySelector('button[type="submit"]');
      const question = document.getElementById('eQuestion').value.trim();
      if (!question) return;
      note.classList.add('hidden');
      btn.disabled = true;
      btn.textContent = 'Submitting…';
      try {
        const res = await fetch('../../../api/accounts/users/enquiry.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: (typeof trishanHeaders === 'function' ? trishanHeaders() : { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ user_id: user.id, project_name: preProject, message: question }),
        });
        const body = await res.json().catch(() => null);
        if (body && body.ok) {
          note.style.color = '';
          note.innerHTML = '<i class="bi bi-check-circle me-1"></i>Your enquiry has been submitted. Read the reply on the <a class="underline font-semibold" href="response.html">Response page</a>.';
          note.classList.remove('hidden');
          document.getElementById('eQuestion').value = '';
        } else {
          note.style.color = '#DC2626';
          note.textContent = (body && body.error) || 'Could not submit enquiry.';
          note.classList.remove('hidden');
        }
      } catch (err) {
        note.style.color = '#DC2626';
        note.textContent = 'Cannot reach server. Start Apache and MySQL in XAMPP.';
        note.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send"></i>Submit Enquiry';
        note.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
})();
