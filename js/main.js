(function () {
  'use strict';

  document.documentElement.classList.add('js');

  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.querySelectorAll('.nav-links a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
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

  document.querySelectorAll('.order-button').forEach((button) => {
    button.classList.add('is-disabled');
    button.setAttribute('aria-label', 'SpotOn ordering is coming soon. Click for current phone ordering details.');
    button.addEventListener('click', () => {
      const message = 'Online ordering is being configured with SpotOn. Please call Salt Lake City at 801.359.5352 or Midvale at 801.561.2171 for now.';
      button.textContent = message;
      setTimeout(() => {
        button.textContent = 'Order with SpotOn Soon';
      }, 4200);
    });
  });

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
