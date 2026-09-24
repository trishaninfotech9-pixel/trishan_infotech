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
    company: document.getElementById('fCompany').value.trim(),
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
          company: payload.company,
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

// === Shared components (components/header.html, components/footer.html) ===
// Pages hold <div data-component="header|footer"> placeholders; this injects the
// shared markup once, so header/footer are edited in one place. Works over
// http(s) — e.g. Live Preview or any host — but not via file:// browsing.
async function loadComponents() {
  const inPages = location.pathname.replace(/\\/g, '/').indexOf('/pages/') !== -1;
  const base = inPages ? '../' : '';
  const slot = (name) => document.querySelector('[data-component="' + name + '"]');
  if (!slot('header') && !slot('footer') && !slot('cta')) return;
  const res = await Promise.all([
    fetch(base + 'components/header.html'),
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
  }
  const footerSlot = slot('footer');
  if (footerSlot) footerSlot.outerHTML = footerHTML;
  const ctaSlot = slot('cta');
  if (ctaSlot) ctaSlot.outerHTML = (await res[2].text()).split('{{BASE}}').join(base);
  // Injected content may carry [data-animate] (e.g. CTA) — observe it if motion is up.
  if (window.__watchReveals) window.__watchReveals(document);
}

// Professional animations with local Anime.js (node_modules/animejs/dist/bundles/anime.umd.min.js)
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
    if (nav) nav.classList.toggle('nav-scrolled', h.scrollTop > 24);
  }, { passive: true });
}

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

// === Skeleton loading screen (covers first paint, fades when ready) ===
let skeletonEl = null;
function showSkeleton() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  skeletonEl = document.createElement('div');
  skeletonEl.className = 'page-skeleton';
  skeletonEl.setAttribute('aria-hidden', 'true');
  try { skeletonEl.style.backgroundColor = getComputedStyle(document.body).backgroundColor; } catch (e) {}
  skeletonEl.innerHTML =
    '<div class="skel-inner">' +
    '<div class="skel-row"><span class="skel-bar skel-logo"></span>' +
    '<span class="skel-links"><span class="skel-bar skel-link"></span><span class="skel-bar skel-link"></span><span class="skel-bar skel-link"></span><span class="skel-bar skel-link"></span></span></div>' +
    '<span class="skel-bar skel-h1"></span><span class="skel-bar skel-h1 short"></span>' +
    '<span class="skel-bar skel-text"></span><span class="skel-bar skel-text short"></span>' +
    '<span class="skel-bar skel-btn"></span>' +
    '<div class="skel-cards"><span class="skel-bar"></span><span class="skel-bar"></span><span class="skel-bar"></span><span class="skel-bar"></span></div>' +
    '</div>';
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
