(function () {
  'use strict';

  document.documentElement.classList.add('js');

  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const links = nav.querySelector('.nav-links');
      const open = links ? links.classList.toggle('open') : false;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.querySelectorAll('.nav-links a').forEach((link) => {
      link.addEventListener('click', () => {
        const links = nav.querySelector('.nav-links');
        if (links) links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  if (nav) {
    const progress = document.getElementById('scroll-progress');
    const updateNav = () => {
      nav.classList.toggle('scrolled', window.scrollY > 8);
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? window.scrollY / max : 0;
        progress.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
      }
    };
    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('.reveal');

  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach((el) => observer.observe(el));
  }

  // Maps deep links — one-tap-to-native-maps
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  document.querySelectorAll('[data-maps]').forEach((el) => {
    const lat = el.getAttribute('data-lat');
    const lng = el.getAttribute('data-lng');
    const q = encodeURIComponent(el.getAttribute('data-maps') || '');
    let href;
    if (isIOS) {
      href = `maps://?q=${q}&ll=${lat},${lng}`;
    } else if (isAndroid) {
      href = `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
    } else {
      href = `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    el.setAttribute('href', href);
  });

  // Form handler — Litzas frontend → Hires backend
  document.querySelectorAll('form[data-litzas-form]').forEach((form) => {
    const endpoint = form.getAttribute('action');
    const brand = form.getAttribute('data-brand') || 'litzas';
    const status = form.querySelector('.form-status');
    const submitBtn = form.querySelector('button[type=submit]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!endpoint) {
        if (status) { status.textContent = 'Form not configured.'; status.className = 'form-status err'; }
        return;
      }

      const data = new FormData(form);
      data.append('brand', brand);

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending\u2026';
      }
      if (status) { status.textContent = 'Sending\u2026'; status.className = 'form-status'; }

      try {
        const res = await fetch(endpoint, { method: 'POST', body: data });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (status) { status.textContent = 'Got it. We\u2019ll be in touch.'; status.className = 'form-status ok'; }
        form.reset();
      } catch (err) {
        console.error('form submit failed', err);
        if (status) { status.textContent = 'Couldn\u2019t send right now. Please call us or try again.'; status.className = 'form-status err'; }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.originalText || 'Send';
        }
      }
    });
  });

  // SpotOn ordering placeholder (preserved from rescue)
  document.querySelectorAll('.order-button').forEach((button) => {
    button.classList.add('is-disabled');
    button.setAttribute('aria-label', 'SpotOn ordering is coming soon.');
    button.addEventListener('click', () => {
      const message = 'Online ordering is being configured. Call SLC 801.359.5352 or Midvale 801.561.2171 to order.';
      const original = button.textContent;
      button.textContent = message;
      setTimeout(() => { button.textContent = original; }, 4200);
    });
  });

  // Parallax — preserved from Codex
  const parallaxImages = document.querySelectorAll('[data-parallax]');
  if (!prefersReduced && parallaxImages.length) {
    let ticking = false;
    const updateParallax = () => {
      ticking = false;
      const viewport = window.innerHeight || 1;
      parallaxImages.forEach((image) => {
        const rect = image.getBoundingClientRect();
        if (rect.bottom < -120 || rect.top > viewport + 120) return;
        const center = rect.top + rect.height / 2;
        const distance = (center - viewport / 2) / viewport;
        const offset = Math.max(-18, Math.min(18, distance * -24));
        image.style.setProperty('--parallax-y', `${offset}px`);
        image.style.transform = `translate3d(0, ${offset}px, 0) scale(1.05)`;
      });
    };

    const requestParallax = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener('scroll', requestParallax, { passive: true });
    window.addEventListener('resize', requestParallax);
  }
})();
