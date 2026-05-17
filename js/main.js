/* ============================================================
   Litzas Pizza — interactions + easter eggs
   ============================================================ */
(function () {
  'use strict';

  /* ---------- mobile nav ---------- */
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', () => nav.classList.remove('open'));
    });
  }

  /* ---------- sticky nav shadow ---------- */
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 8) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- year (so footer stays correct forever) ---------- */
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* ============================================================
     EASTER EGGS
     ============================================================ */

  // Honor reduced motion — keep eggs available but skip the showy animations.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Type "pizza" anywhere → pepperoni rain → permanent z ---------- */
  let buffer = '';
  const SECRET = 'pizza';
  document.addEventListener('keydown', (e) => {
    // ignore when user is in an input
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
    if (buffer === SECRET) {
      buffer = '';
      rainPepperoni();
    }
  });

  function rainPepperoni() {
    if (reduced) {
      placeSouvenirZ();
      return;
    }
    const stage = document.getElementById('z-toss');
    if (!stage) return;
    const count = 28;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'pepperoni';
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.animationDelay = (Math.random() * 0.8) + 's';
      p.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
      const scale = 0.6 + Math.random() * 0.9;
      p.style.transform = `scale(${scale})`;
      stage.appendChild(p);
      setTimeout(() => p.remove(), 4000);
    }
    setTimeout(placeSouvenirZ, 1200);
  }

  function placeSouvenirZ() {
    if (document.querySelector('.z-souvenir')) return;
    const z = document.createElement('span');
    z.className = 'z-souvenir';
    z.textContent = 'z';
    z.setAttribute('aria-hidden', 'true');
    document.body.appendChild(z);
    try { localStorage.setItem('litzas-z', '1'); } catch (_) {}
  }

  // Restore the souvenir z on repeat visits.
  try {
    if (localStorage.getItem('litzas-z')) placeSouvenirZ();
  } catch (_) {}

  /* ---------- 2. The Z in the strip — click to wobble, hover for color ----------
     Already CSS-only (.z-mark:hover). On click, fire a one-time wobble. */
  document.querySelectorAll('[data-z]').forEach(z => {
    z.addEventListener('click', () => {
      z.animate(
        [
          { transform: 'rotate(0deg) scale(1)' },
          { transform: 'rotate(-12deg) scale(1.06)' },
          { transform: 'rotate(8deg) scale(1.02)' },
          { transform: 'rotate(0deg) scale(1)' }
        ],
        { duration: 600, easing: 'ease-out' }
      );
    });
  });

  /* ---------- 4. Click the "Hungry yet?" h2 → frosted root beer mug clinks ---------- */
  // Wire to .cta-h text. Single tap spawns one mug emoji that arcs and disappears.
  const cta = document.querySelector('.cta-h');
  if (cta) {
    cta.style.cursor = 'pointer';
    cta.addEventListener('click', (e) => {
      const rect = cta.getBoundingClientRect();
      const mug = document.createElement('div');
      mug.className = 'mug-clink';
      mug.textContent = '🍺';
      // Position at click point, in viewport coords
      mug.style.left = (e.clientX || rect.left + rect.width / 2) + 'px';
      mug.style.top  = (e.clientY || rect.top  + rect.height / 2) + 'px';
      mug.setAttribute('aria-hidden', 'true');
      document.body.appendChild(mug);
      setTimeout(() => mug.remove(), 900);
    });
  }

  /* ---------- 5. Dough-toss footer wordmark when it enters the viewport ---------- */
  const footer = document.querySelector('.footer');
  if (footer && 'IntersectionObserver' in window && !reduced) {
    let tossed = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting && !tossed) {
          tossed = true;
          footer.classList.add('tossed');
        }
      });
    }, { threshold: 0.6 });
    io.observe(footer);
  }

})();
