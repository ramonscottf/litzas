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

  // Stagger: cards inside a grid cascade in (55ms steps) instead of slamming
  // in as one block. Delay is per-grid index, capped, and cleared after the
  // animation ends so hover transforms stay free.
  document.querySelectorAll('.menu-grid, .side-grid, .loc-grid, .blog-grid').forEach((grid) => {
    Array.from(grid.children).forEach((el, i) => {
      if (el.classList.contains('reveal')) {
        el.style.setProperty('--d', `${Math.min(i % 12, 9) * 55}ms`);
      }
    });
  });

  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible', 'done'));
  } else {
    revealEls.forEach((el) => {
      el.addEventListener('animationend', () => el.classList.add('done'), { once: true });
    });
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

  // Count-up stats — the "since 1965" hook tallies into place on first view.
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const runCount = (el) => {
      const target = parseInt(el.getAttribute('data-count'), 10);
      if (!Number.isFinite(target)) return;
      const dur = 1200;
      const startVal = target > 100 ? target - 80 : 0;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(startVal + (target - startVal) * eased).toString();
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target.toString();
      };
      requestAnimationFrame(tick);
    };
    if (prefersReduced || !('IntersectionObserver' in window)) {
      counters.forEach((el) => { el.textContent = el.getAttribute('data-count'); });
    } else {
      const countObs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { runCount(entry.target); countObs.unobserve(entry.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach((el) => countObs.observe(el));
    }
  }

  // Menu scroll-spy — the gold underline on the jump rail tracks the section
  // you're reading. Sections own their slice of the viewport via a midline test.
  const jump = document.querySelector('.menu-jump');
  if (jump) {
    const links = Array.from(jump.querySelectorAll('a[href^="#"]'));
    const sections = links
      .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
      .filter(Boolean);
    const navEl = document.getElementById('nav');
    const railsEl = document.getElementById('menu-rails');
    const pizzaSections = new Set(['favorites', 'build']);
    const updateDock = () => {
      if (!railsEl || !navEl) return;
      const topVal = parseFloat(getComputedStyle(railsEl).top) || 0;
      const docked = railsEl.getBoundingClientRect().top <= topVal + 1;
      railsEl.classList.toggle('is-docked', docked);
      navEl.classList.toggle('has-rails-docked', docked);
    };
    const setActive = () => {
      const mid = window.innerHeight * 0.38;
      let current = sections[0];
      for (const sec of sections) {
        if (sec.getBoundingClientRect().top <= mid) current = sec;
      }
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + current.id));
      if (railsEl) railsEl.classList.toggle('show-sizes', pizzaSections.has(current.id));
    };
    let spyTick = false;
    window.addEventListener('scroll', () => {
      if (!spyTick) {
        spyTick = true;
        requestAnimationFrame(() => { setActive(); updateDock(); spyTick = false; });
      }
    }, { passive: true });
    setActive();
    updateDock();
  }

  // Sticky elevation — size-tab pills cast a shadow once they're actually stuck.
  const stickies = document.querySelectorAll('.size-tabs');
  if (stickies.length) {
    let stickTick = false;
    const updateStuck = () => {
      stickies.forEach((bar) => {
        const top = parseFloat(getComputedStyle(bar).top) || 0;
        bar.classList.toggle('is-stuck', Math.abs(bar.getBoundingClientRect().top - top) < 2);
      });
    };
    window.addEventListener('scroll', () => {
      if (!stickTick) {
        stickTick = true;
        requestAnimationFrame(() => { updateStuck(); stickTick = false; });
      }
    }, { passive: true });
    updateStuck();
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

  // Size tabs — toggle visible price on every multi-size pizza card.
  // Buttons live in .size-tabs blocks; price cells live in .pizza-price
  // with data-price-mini / sm / md / lg attributes. Tapping a tab updates
  // every price-amount + price-size span on the page (and every tab's
  // active state) to the chosen size. Default = md (rendered server-side).
  const SIZE_LABELS = { mini: 'Mini 8"', sm: 'Small 10"', md: 'Medium 12"', lg: 'Large 16"' };
  const sizeTabBlocks = document.querySelectorAll('.size-tabs');
  if (sizeTabBlocks.length) {
    const setSize = (size) => {
      document.querySelectorAll('.size-tab').forEach((btn) => {
        const active = btn.dataset.size === size;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll('.pizza-price[data-price-md]').forEach((priceEl) => {
        const amt = priceEl.dataset['price' + size.charAt(0).toUpperCase() + size.slice(1)];
        const label = SIZE_LABELS[size] || '';
        const amtEl = priceEl.querySelector('.price-amount');
        const labelEl = priceEl.querySelector('.price-size');
        if (amtEl) {
          amtEl.textContent = amt ? (amt.charAt(0) === '+' ? '+$' + amt.slice(1) : '$' + amt) : '';
          amtEl.classList.remove('tick');
          void amtEl.offsetWidth; // restart the tick animation
          amtEl.classList.add('tick');
        }
        if (labelEl) labelEl.textContent = label;
      });
    };
    sizeTabBlocks.forEach((block) => {
      block.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.size-tab');
        if (!btn) return;
        setSize(btn.dataset.size);
      });
    });
  }
})();
