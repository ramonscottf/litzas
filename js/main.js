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

  // Adaptive status-bar tint. The floating nav sits on the dark hero at the top
  // (dark tint) and on cream content once you scroll past it (cream tint), so the
  // band behind the iOS status bar matches whatever is directly under it. Safe now
  // that the dark top-cap is gone (it used to leave a cream bar above the nav).
  (() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const hero = document.querySelector('.page-hero, .hero');
    if (!meta) return;
    const DARK = '#0a0908';
    const CREAM = '#fbf6ec';
    const updateTint = () => {
      const onHero = hero ? hero.getBoundingClientRect().bottom > 6 : false;
      meta.setAttribute('content', onHero ? DARK : CREAM);
    };
    updateTint();
    window.addEventListener('scroll', updateTint, { passive: true });
    window.addEventListener('resize', updateTint, { passive: true });
  })();

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

  // Menu rails — dock into the pill on scroll (menu page + homepage mini menu).
  const railsEl = document.getElementById('menu-rails');
  const slotEl = document.getElementById('menu-rails-slot');
  const navEl = document.getElementById('nav');
  if (railsEl && slotEl && navEl) {
    const scopeSel = slotEl.dataset.dockScope;
    const scopeEl = scopeSel ? document.querySelector(scopeSel) : null;
    let railsDocked = false;
    const DOCK_IN = 74;   // dock once the slot reaches just under the pill
    const DOCK_OUT = 92;  // undock above here (hysteresis prevents flicker)
    const updateDock = () => {
      const slotTop = slotEl.getBoundingClientRect().top;
      const pastScope = scopeEl ? scopeEl.getBoundingClientRect().bottom <= DOCK_IN + 12 : false;
      if (!railsDocked && slotTop <= DOCK_IN && !pastScope) {
        slotEl.style.minHeight = railsEl.offsetHeight + 'px';
        navEl.appendChild(railsEl);
        navEl.classList.add('is-docked-host');
        railsDocked = true;
      } else if (railsDocked && (slotTop > DOCK_OUT || pastScope)) {
        slotEl.appendChild(railsEl);
        slotEl.style.minHeight = '';
        navEl.classList.remove('is-docked-host');
        railsDocked = false;
      }
    };
    let dockTick = false;
    window.addEventListener('scroll', () => {
      if (!dockTick) { dockTick = true; requestAnimationFrame(() => { updateDock(); dockTick = false; }); }
    }, { passive: true });
    updateDock();
  }

  // Menu scroll-spy — highlight the section you're reading; show sizes on pizza sections.
  const jump = document.querySelector('.menu-jump');
  if (jump) {
    const railsSpy = document.getElementById('menu-rails');
    const links = Array.from(jump.querySelectorAll('a[href^="#"]'));
    const sections = links
      .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
      .filter(Boolean);
    const pizzaSections = new Set(['favorites', 'build']);
    const setActive = () => {
      const mid = window.innerHeight * 0.38;
      let current = sections[0];
      for (const sec of sections) {
        if (sec.getBoundingClientRect().top <= mid) current = sec;
      }
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + current.id));
      if (railsSpy) railsSpy.classList.toggle('show-sizes', pizzaSections.has(current.id));
    };
    let spyTick = false;
    window.addEventListener('scroll', () => {
      if (!spyTick) {
        spyTick = true;
        requestAnimationFrame(() => { setActive(); spyTick = false; });
      }
    }, { passive: true });
    setActive();
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

  // ── Live open/closed status + SpotOn-aware order buttons ─────────────────
  // Reads window.__LITZAS (baked at build) and resolves each location's status
  // against the visitor's clock in store-local time, refreshing every minute.
  (function () {
    const DATA = window.__LITZAS;
    if (!DATA || !DATA.hours) return;
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const fmt = (m) => {
      const h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12;
      return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap;
    };
    const statusFor = (sched, day, mins) => {
      const today = sched[day];
      if (today && mins >= today[0] && mins < today[1]) return { open: true, label: 'Open · closes ' + fmt(today[1]) };
      if (today && mins < today[0]) return { open: false, label: 'Opens ' + fmt(today[0]) + ' today' };
      for (let i = 1; i <= 7; i++) {
        const d = (day + i) % 7;
        if (sched[d]) return { open: false, label: 'Opens ' + (i === 1 ? 'tomorrow' : DAYS[d]) + ' ' + fmt(sched[d][0]) };
      }
      return { open: false, label: 'Closed' };
    };
    const update = () => {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: DATA.tz || 'America/Denver' }));
      const day = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
      Object.keys(DATA.hours).forEach((id) => {
        const st = statusFor(DATA.hours[id], day, mins);
        const badge = document.querySelector('.loc-status[data-loc-status="' + id + '"]');
        if (badge) {
          badge.hidden = false;
          badge.className = 'loc-status ' + (st.open ? 'is-open' : 'is-closed');
          badge.innerHTML = '<span class="loc-status-pill"><span class="dot"></span>' +
            (st.open ? 'Open Now' : 'Closed Now') + '</span><span class="loc-status-sub">' + st.label + '</span>';
        }
        const btn = document.querySelector('.order-button[data-order-location="' + id + '"]');
        if (btn) {
          const ord = (DATA.order && DATA.order.locations && DATA.order.locations[id]) || {};
          if (st.open && DATA.order && DATA.order.enabled && ord.url) {
            btn.textContent = 'Order Online'; btn.setAttribute('data-order-state', 'live'); btn.classList.remove('is-disabled');
          } else if (!st.open) {
            btn.textContent = 'Currently Closed'; btn.setAttribute('data-order-state', 'closed'); btn.classList.add('is-disabled');
          } else {
            btn.textContent = 'Coming soon'; btn.setAttribute('data-order-state', 'soon'); btn.classList.add('is-disabled');
          }
        }
      });
    };
    update();
    setInterval(update, 60000);

    document.querySelectorAll('.order-button').forEach((button) => {
      button.setAttribute('aria-label', 'Online ordering status');
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-order-location');
        const ord = (DATA.order && DATA.order.locations && DATA.order.locations[id]) || {};
        const state = button.getAttribute('data-order-state');
        if (state === 'live' && ord.url) { window.open(ord.url, '_blank', 'noopener'); return; }
        const msg = state === 'closed'
          ? 'We\u2019re currently closed. Check back during open hours.'
          : 'Online ordering is coming soon.';
        const original = button.textContent;
        button.textContent = msg;
        setTimeout(() => { button.textContent = original; }, 4500);
      });
    });
  })();

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
      document.querySelectorAll('.byo-size-label').forEach((el) => { el.textContent = SIZE_LABELS[size] || ''; });
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

/* Order-online location picker (global — invoked from nav/footer onclick) */
function openOrderPicker(e){ if(e){ e.preventDefault(); } var p=document.getElementById('orderPicker'); if(p){ p.classList.add('open'); } }
function closeOrderPicker(){ var p=document.getElementById('orderPicker'); if(p){ p.classList.remove('open'); } }
document.addEventListener('click', function(e){ var p=document.getElementById('orderPicker'); if(p && e.target===p){ closeOrderPicker(); } });
document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closeOrderPicker(); } });

/* Review marquee: pause while touched / pressed (CSS handles hover) */
(function () {
  function bind() {
    document.querySelectorAll('.review-marquee').forEach(function (m) {
      if (m.dataset.pauseBound) return; m.dataset.pauseBound = '1';
      var pause = function () { m.classList.add('is-paused'); };
      var play  = function () { m.classList.remove('is-paused'); };
      m.addEventListener('touchstart', pause, { passive: true });
      m.addEventListener('touchend', play);
      m.addEventListener('touchcancel', play);
      m.addEventListener('pointerdown', pause);
      m.addEventListener('pointerup', play);
      m.addEventListener('pointercancel', play);
      m.addEventListener('pointerleave', play);
    });
  }
  if (document.readyState !== 'loading') bind();
  else document.addEventListener('DOMContentLoaded', bind);
})();
