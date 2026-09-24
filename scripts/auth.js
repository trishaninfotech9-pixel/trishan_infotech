// Frontend auth: talks to PHP/MySQL backend (api/*.php) on same origin.
(function () {
  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    let body = null;
    let raw = '';
    try { raw = await res.text(); } catch (e) { raw = ''; }
    try { body = raw ? JSON.parse(raw) : null; } catch (e) { body = null; }
    return { status: res.status, body, raw };
  }

  function apiError(status, body, raw, fallback) {
    if (body && body.error) return body.error;
    // 404 + HTML = page opened without the PHP backend (file:// or wrong server).
    if (status === 404 && body === null) {
      return 'No backend found. Open the site via Apache instead, e.g. http://localhost/trishan' + location.pathname.replace(/^\/trishan/, '');
    }
    return fallback + ' (HTTP ' + status + (raw ? ': ' + raw.slice(0, 120) : '') + ')';
  }
  function showMsg(el, text, isError) {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    el.style.color = isError ? '#DC2626' : '#0C4A6E';
  }

  function setLoading(btn, loading, label) {
    if (!btn) return;
    if (loading) {
      btn.dataset.label = btn.textContent;
      btn.disabled = true;
      btn.textContent = label || 'Please wait…';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.label || btn.textContent;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // ---- Create account ----
    const regForm = document.getElementById('createAccountForm');
    if (regForm) {
      const msg = document.getElementById('caMsg');
      const btn = regForm.querySelector('button[type="submit"]');
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!regForm.checkValidity()) { regForm.reportValidity(); return; }
        const password = document.getElementById('caPassword').value;
        const confirm = document.getElementById('caConfirmPassword').value;
        if (password !== confirm) {
          showMsg(msg, 'Passwords do not match.', true);
          return;
        }
        setLoading(btn, true, 'Creating…');
        showMsg(msg, '', false);
        msg.classList.add('hidden');
        try {
          const { status, body, raw } = await postJSON('../api/register.php', {
            first_name: document.getElementById('caFirstName').value.trim(),
            middle_name: document.getElementById('caMiddleName').value.trim(),
            last_name: document.getElementById('caLastName').value.trim(),
            phone: document.getElementById('caPhone').value.trim(),
            email: document.getElementById('caEmail').value.trim(),
            password,
            confirm_password: confirm,
          });
          if (body && body.ok) {
            showMsg(msg, body.message + ' Redirecting to login…', false);
            setTimeout(() => { location.href = 'login.html'; }, 1200);
          } else {
            showMsg(msg, apiError(status, body, raw, 'Could not create account.'), true);
          }
        } catch (err) {
          showMsg(msg, 'Cannot reach server. Start Apache in XAMPP.', true);
        } finally {
          setLoading(btn, false);
        }
      });
    }

    // ---- Login ----
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      const msg = document.getElementById('loginMsg');
      const btn = loginForm.querySelector('button[type="submit"]');
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!loginForm.checkValidity()) { loginForm.reportValidity(); return; }
        setLoading(btn, true, 'Logging in…');
        if (msg) msg.classList.add('hidden');
        try {
          const loginId = document.getElementById('loginPhone').value.trim();
          const { status, body, raw } = await postJSON('../api/login.php', {
            identifier: loginId,
            phone: loginId,
            password: document.getElementById('loginPassword').value,
          });
          if (body && body.ok) {
            try { localStorage.setItem('trishan_user', JSON.stringify(body.user)); } catch (e) {}
            showMsg(msg, 'Login successful. Welcome, ' + (body.user.first_name || '') + '!', false);
            setTimeout(() => { location.href = 'users.html'; }, 1000);
          } else {
            showMsg(msg, apiError(status, body, raw, 'Login failed.'), true);
          }
        } catch (err) {
          showMsg(msg, 'Cannot reach server. Start Apache in XAMPP.', true);
        } finally {
          setLoading(btn, false);
        }
      });
    }
  });
})();
