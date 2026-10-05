tailwind.config = {
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        navy: { DEFAULT: '#0C4A6E', 50: '#F0F9FF', 100: '#E0F2FE', 700: '#0369A1', 900: '#0C4A6E' },
        gold: { DEFAULT: '#38BDF8', 600: '#0284C7' }
      }
    }
  }
};

async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  if (!form.checkValidity()) { form.reportValidity(); return false; }
  const btn = document.getElementById('sendBtn');
  const note = document.getElementById('formNote');
  const err = document.getElementById('formError');
  note.classList.add('hidden');
  if (err) err.classList.add('hidden');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Sending…';
  const showNote = (el) => {
    el.classList.remove('hidden');
    if (window.anime && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      anime.animate(el, { opacity: [0, 1], y: [8, 0], duration: 500, ease: 'out(3)' });
    }
  };
  const payload = {
    from_name: document.getElementById('fName').value.trim(),
    reply_to: document.getElementById('fEmail').value.trim(),
    message: document.getElementById('fMessage').value.trim(),
    to_email: 'raajmachawal@protonmail.com',
  };
  const fail = (message) => {
    if (err) {
      err.innerHTML = 'Couldn&#39;t send: ' + String(message || 'unknown error') +
        '. Please email us directly at <a class="underline" href="mailto:trishaninfotech9@gmail.com">trishaninfotech9@gmail.com</a>.';
      showNote(err);
    }
    else alert('Could not send. Please email trishaninfotech9@gmail.com');
  };
  // Store enquiry in local DB (new structure: api/enquiry/submit.php). Never blocks email send.
  try {
    const p0 = location.pathname.replace(/\\/g, '/');
    const apiBase = p0.indexOf('/pages/accounts/') !== -1 ? '../../../' : (p0.indexOf('/pages/') !== -1 ? '../' : '');
    fetch(apiBase + 'api/enquiry/submit.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: payload.from_name, email: payload.reply_to, message: payload.message }),
    }).catch(() => {});
  } catch (e) {}
  try {
    // Primary: EmailJS sends FROM trishaninfotech9@gmail.com TO raajmachawal@protonmail.com.
    // Fill in your EmailJS keys below after the one-time dashboard setup.
    if (window.emailjs && EMAILJS.PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY') {
      await window.emailjs.send(EMAILJS.SERVICE_ID, EMAILJS.TEMPLATE_ID, payload);
    } else {
      // Fallback until EmailJS is configured: FormSubmit delivers to the demo inbox.
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: payload.from_name,
          email: payload.reply_to,
          message: payload.message,
          _subject: 'New website enquiry — Trishan Infotech',
          _template: 'table',
          _captcha: 'false',
        }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      let data = null;
      try { data = await res.json(); } catch (parseError) { data = null; }
      if (data && (data.success === false || data.success === 'false')) {
        throw new Error(data.message || 'Send rejected by mail service.');
      }
    }
    showNote(note);
    form.reset();
  } catch (error) {
    fail(error && error.text ? error.text : error && error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
  return false;
}

// === EmailJS configuration — paste your keys here after dashboard setup ===
// Service connects Gmail trishaninfotech9@gmail.com; template sends TO raajmachawal@protonmail.com.
// Get keys: https://dashboard.emailjs.com (free, 200 emails/month)
const EMAILJS = {
  PUBLIC_KEY: 'iFA6NbTngJnSFGY9p',
  SERVICE_ID: 'service_tnv0h1q',
  TEMPLATE_ID: 'template_i0uxkoy',
};
if (window.emailjs && EMAILJS.PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY') {
  window.emailjs.init({ publicKey: EMAILJS.PUBLIC_KEY });
}

// === Session + CSRF helpers (backend uses cookie sessions, Part A) ===
// Every page includes this file first, so page scripts can use these globals.
function trishanSession(kind) {
  try { return JSON.parse(localStorage.getItem(kind === 'admin' ? 'trishan_admin' : 'trishan_user') || 'null'); } catch (e) { return null; }
}
function trishanCsrf() {
  const a = trishanSession('admin');
  if (a && a.csrf) return a.csrf;
  const u = trishanSession('user');
  return (u && u.csrf) || '';
}
function trishanHeaders(extra) {
  const h = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
  const t = trishanCsrf();
  if (t) h['X-CSRF-Token'] = t;
  return h;
}
async function trishanLogout(base) {
  try {
    await fetch(base + 'api/accounts/logout.php', {
      method: 'POST', credentials: 'same-origin', headers: trishanHeaders(), body: '{}',
    });
  } catch (e) {}
  try { localStorage.removeItem('trishan_user'); localStorage.removeItem('trishan_admin'); } catch (err) {}
}

// === Shared components (components/header.html, components/header-auth.html, components/footer.html) ===
// Pages hold <div data-component="header|footer"> placeholders; this injects the
// shared markup once, so header/footer are edited in one place. Works over
// http(s) — e.g. Live Preview or any host — but not via file:// browsing.
// Logged-in users get components/header-auth.html (Complaint / Response / Logout).
async function loadComponents() {
  const path0 = location.pathname.replace(/\\/g, '/');
  const inUserArea = path0.indexOf('/pages/accounts/users/') !== -1;
  const inAdminArea = path0.indexOf('/pages/accounts/admin/') !== -1;
  const inAccounts = inUserArea || inAdminArea;
  const inPages = inAccounts || path0.indexOf('/pages/') !== -1;
  const base = inUserArea || inAdminArea ? '../../../' : (inPages ? '../' : '');
  let loggedIn = false;
  let adminOnly = false;
  try {
    loggedIn = !!JSON.parse(localStorage.getItem('trishan_user') || 'null');
    adminOnly = !loggedIn && !!JSON.parse(localStorage.getItem('trishan_admin') || 'null');
    loggedIn = loggedIn || adminOnly;
  } catch (e) { loggedIn = false; }
  // Auth header only inside the account area; public pages (home, services, …) keep the public navbar.
  const path = location.pathname.replace(/\\/g, '/');
  const isAuthPage = /\/pages\/accounts\/(users|admin)\/.+\.html$/.test(path);
  const useAuthHeader = loggedIn && isAuthPage;
  const slot = (name) => document.querySelector('[data-component="' + name + '"]');
  if (!slot('header') && !slot('footer') && !slot('cta')) return;
  const res = await Promise.all([
    fetch(base + (useAuthHeader ? 'components/header-auth.html' : 'components/header.html')),
    fetch(base + 'components/footer.html'),
    fetch(base + 'components/cta.html'),
  ]);
  if (!res[0].ok || !res[1].ok || !res[2].ok) throw new Error('component HTTP ' + res[0].status + '/' + res[1].status + '/' + res[2].status);
  const headerHTML = (await res[0].text()).split('{{BASE}}').join(base);
  const footerHTML = (await res[1].text()).split('{{BASE}}').join(base);
  const headerSlot = slot('header');
  if (headerSlot) {
    const current = headerSlot.getAttribute('data-page');
    headerSlot.outerHTML = headerHTML;
    if (current) {
      document.querySelectorAll('[data-nav="' + current + '"]').forEach((link) => link.classList.add('nav-active'));
    }
    updateAuthNav(base, current, inPages, loggedIn, adminOnly);
  }
  const footerSlot = slot('footer');
  if (footerSlot) footerSlot.outerHTML = footerHTML;
  const ctaSlot = slot('cta');
  if (ctaSlot) ctaSlot.outerHTML = (await res[2].text()).split('{{BASE}}').join(base);
  // Injected content may carry [data-animate] (e.g. CTA) — observe it if motion is up.
  if (window.__watchReveals) window.__watchReveals(document);
}

// === Auth navbar wiring: header-auth.html is injected for logged-in users;
// here we only redirect login pages and wire the shared Logout button. ===
function updateAuthNav(base, current, inPages, loggedIn, adminOnly) {
  const path = location.pathname.replace(/\\/g, '/');
  if (loggedIn && (path.endsWith('/login.html') || path.endsWith('/create_account.html') || path.endsWith('/login-choice.html'))) {
    location.href = base + 'pages/accounts/' + (adminOnly ? 'admin/dashboard.html' : 'users/projects.html');
    return;
  }
  if (!loggedIn) return;
  document.querySelectorAll('[data-logout]').forEach((el) => {    el.addEventListener('click', async (e) => {
      e.preventDefault();
      document.body.classList.remove('menu-open');
      await trishanLogout(base);
      location.href = base + 'index.html';
    });
  });
  // Unread admin-response badge (per user — fetched with their own user_id).
  try {
    const me = JSON.parse(localStorage.getItem('trishan_user') || 'null');
    if (me && me.id) {
      updateResponseBadge(base, me.id);
      setInterval(() => updateResponseBadge(base, me.id), 30000);
    }
  } catch (e) {}
}

// Red dot + white count on the Response nav link; hidden when zero.
async function updateResponseBadge(base, userId) {
  try {
    const [rc, rp, re] = await Promise.all([
      fetch(base + 'api/accounts/users/my-complaints.php?user_id=' + encodeURIComponent(userId)),
      fetch(base + 'api/accounts/users/my-projects.php?user_id=' + encodeURIComponent(userId)),
      fetch(base + 'api/accounts/users/my-enquiries.php?user_id=' + encodeURIComponent(userId)),
    ]);
    const body = await rc.json().catch(() => null);
    const pbody = await rp.json().catch(() => null);
    const ebody = await re.json().catch(() => null);
    let n = 0;
    if (body && body.ok) {
      body.complaints.forEach((c) => (c.responses || []).forEach((r) => { if (!+r.seen) n++; }));
    }
    // Unseen admin replies on project enquiries.
    if (ebody && ebody.ok) {
      (ebody.enquiries || []).forEach((q) => (q.responses || []).forEach((r) => { if (!+r.seen) n++; }));
    }
    // Unseen project status updates (Work Under Process / Completed).
    if (pbody && pbody.ok) {
      const seenAt = pbody.status_seen_at ? new Date(String(pbody.status_seen_at).replace(' ', 'T') + '+05:30').getTime() : 0;
      (pbody.projects || []).forEach((p) => {
        if (p.status !== 'complete' && p.status !== 'process') return;
        if (!seenAt) { n++; return; }
        const t = p.status_updated_at ? new Date(String(p.status_updated_at).replace(' ', 'T') + '+05:30').getTime() : 0;
        if (t && t > seenAt) n++;
      });
    }
    document.querySelectorAll('[data-response-badge]').forEach((b) => {
      b.textContent = n > 99 ? '99+' : String(n);
      b.classList.toggle('hidden', n <= 0);
      b.classList.toggle('inline-flex', n > 0);
    });
  } catch (e) {}
}

// Professional animations with Anime.js 4 via CDN (jsdelivr)
function initMotion() {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED || !window.anime) {
    document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = el.dataset.count; });
    return;
  }
  document.documentElement.classList.add('js');

  // Hero entrance — starts instantly (never waits on component fetch),
  // short distances + soft landing for a smooth feel.
  anime.createTimeline({ defaults: { ease: 'out(4)', duration: 950 } })
    .add('.hero-badge', { opacity: [0, 1], y: [14, 0], duration: 700, delay: 120 })
    .add('.hero-title', { opacity: [0, 1], y: [28, 0] }, '-=450')
    .add('.hero-lead', { opacity: [0, 1], y: [20, 0] }, '-=650')
    .add('.hero-actions a', { opacity: [0, 1], y: [16, 0], delay: anime.stagger(100) }, '-=650')
    .add('.hero-stats > div', { opacity: [0, 1], y: [16, 0], delay: anime.stagger(90) }, '-=600');

  // Scroll reveals (once)
  const PRESETS = {
    'fade-up': { y: [36, 0], opacity: [0, 1] },
    'fade-in': { opacity: [0, 1] },
    'slide-left': { x: [48, 0], opacity: [0, 1] },
    'slide-right': { x: [-48, 0], opacity: [0, 1] },
    'zoom-in': { scale: [0.94, 1], opacity: [0, 1] },
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      anime.animate(el, {
        ...(PRESETS[el.dataset.animate] || PRESETS['fade-up']),
        duration: 800,
        delay: +el.dataset.delay || 0,
        ease: 'out(3)',
      });
      io.unobserve(el);
    }
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
  // Reusable scanner — picks up [data-animate] injected later (shared components).
  const seen = new WeakSet();
  const watchReveals = (root) => {
    (root || document).querySelectorAll('[data-animate]').forEach((el) => {
      if (!seen.has(el)) { seen.add(el); io.observe(el); }
    });
  };
  watchReveals(document);
  window.__watchReveals = watchReveals;

  // Animated counters
  const ioCount = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      const end = parseFloat(el.dataset.count);
      const proxy = { v: 0 };
      const render = () => { el.textContent = Math.round(proxy.v); };
      anime.animate(proxy, {
        v: [0, end], duration: 1600, ease: 'out(3)',
        onUpdate: render,
        onRender: render,
      });
      ioCount.unobserve(el);
    }
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach((el) => ioCount.observe(el));

  // Service card hover lift needs no JS; add subtle magnetic feel to CTAs on fine pointers
  if (matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.hero-actions a').forEach((btn) => {
      btn.addEventListener('pointermove', (ev) => {
        const r = btn.getBoundingClientRect();
        anime.animate(btn, {
          x: (ev.clientX - r.left - r.width / 2) * 0.15,
          y: (ev.clientY - r.top - r.height / 2) * 0.15,
          duration: 300, ease: 'out(3)',
        });
      });
      btn.addEventListener('pointerleave', () => anime.animate(btn, { x: 0, y: 0, duration: 500, ease: 'out(4)' }));
    });
  }

  // Navbar shadow + scroll progress (nav is injected, so look it up per scroll)
  const bar = document.querySelector('.scroll-progress');
  addEventListener('scroll', () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
    const nav = document.getElementById('siteNav');
    const y = h.scrollTop;
    if (nav) {
      nav.classList.toggle('nav-scrolled', y > 24);
      nav.classList.remove('nav-hide');
    }
  }, { passive: true });
}

// Password show/hide toggles — buttons with [data-toggle-password="<input-id>"].
// Delegated on document so it works on every page with zero per-page code.
(function setupPasswordToggles() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toggle-password]');
    if (!btn) return;
    const input = document.getElementById(btn.getAttribute('data-toggle-password'));
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    const icon = btn.querySelector('i');
    if (icon) { icon.classList.toggle('bi-eye', !show); icon.classList.toggle('bi-eye-slash', show); }
  });
})();

// Mobile menu — delegated on document so it works before/after header injection.
(function setupMobileMenu() {
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    const btn = document.getElementById('menuBtn');
    if (btn) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('#menuBtn')) {
      setMenu(!document.body.classList.contains('menu-open'));
    } else if (e.target.closest('.mobile-nav a') || e.target.closest('.menu-overlay')) {
      setMenu(false);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });
})();

// Contact page: prefill project from ?project= so user Enquiry buttons carry context.
(function prefillContactProject() {
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const form = document.getElementById('contactForm');
      if (!form) return;
      const project = new URLSearchParams(location.search).get('project');
      if (!project) return;
      const msg = document.getElementById('fMessage');
      if (msg && !msg.value.trim()) msg.value = 'Project: ' + project + '\n';
    } catch (e) {}
  });
})();

// === Skeleton loading screen (covers first paint, fades when ready) ===
let skeletonEl = null;
function skelPublic() {
  return '<div class="skel-inner">' +
    '<div class="skel-row"><span class="skel-bar skel-logo"></span>' +
    '<span class="skel-links"><span class="skel-bar skel-link"></span><span class="skel-bar skel-link"></span><span class="skel-bar skel-link"></span><span class="skel-bar skel-link"></span></span></div>' +
    '<span class="skel-bar skel-h1"></span><span class="skel-bar skel-h1 short"></span>' +
    '<span class="skel-bar skel-text"></span><span class="skel-bar skel-text short"></span>' +
    '<span class="skel-bar skel-btn"></span>' +
    '<div class="skel-cards"><span class="skel-bar"></span><span class="skel-bar"></span><span class="skel-bar"></span><span class="skel-bar"></span></div>' +
    '</div>';
}
function skelAdmin() {
  const menu = '<span class="skel-bar-dark skel-menu-row"></span>'.repeat(5);
  const card =
    '<div class="skel-list-card">' +
    '<span class="skel-bar skel-l-title"></span><span class="skel-bar skel-l-sub"></span><span class="skel-bar skel-l-date"></span>' +
    '<span class="skel-bar skel-l-body"></span><span class="skel-bar skel-l-body short"></span>' +
    '</div>';
  return '<div class="skel-admin">' +
    '<div class="skel-side" aria-hidden="true">' +
      '<div class="skel-brand"><span class="skel-bar-dark skel-brand-sq"></span><span class="skel-brand-tx"><span class="skel-bar-dark"></span><span class="skel-bar-dark"></span></span></div>' +
      '<span class="skel-bar-dark skel-side-label"></span>' + menu +
      '<span class="skel-bar-dark skel-side-foot"></span>' +
    '</div>' +
    '<div class="skel-main">' +
      '<div class="skel-topbar"><span class="skel-bar skel-search"></span><span class="skel-id"><span class="skel-bar skel-ava"></span><span class="skel-who"><span class="skel-bar"></span><span class="skel-bar"></span></span></span></div>' +
      '<span class="skel-bar skel-page-h1"></span><span class="skel-bar skel-page-sub"></span>' +
      card + card +
    '</div>' +
  '</div>';
}
function showSkeleton() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  skeletonEl = document.createElement('div');
  skeletonEl.className = 'page-skeleton';
  skeletonEl.setAttribute('aria-hidden', 'true');
  try { skeletonEl.style.backgroundColor = getComputedStyle(document.body).backgroundColor; } catch (e) {}
  // Match the loader to the page layout: sidebar version on admin pages.
  const isAdmin = !!document.getElementById('adminShell');
  skeletonEl.innerHTML = isAdmin ? skelAdmin() : skelPublic();
  document.body.prepend(skeletonEl);
}
function hideSkeleton() {
  if (!skeletonEl) return;
  const el = skeletonEl;
  skeletonEl = null;
  el.classList.add('hide');
  setTimeout(() => el.remove(), 400);
}

// Boot: skeleton first; motion starts once components + min delay settle.
let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  hideSkeleton();
  initMotion();
}
showSkeleton();
Promise.all([
  loadComponents().catch(() => false),
  new Promise((r) => setTimeout(r, 450)),
]).then(boot);
setTimeout(boot, 3000); // safety: never trap the page behind the skeleton
