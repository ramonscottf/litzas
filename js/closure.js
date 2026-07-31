/* ==========================================================================
   LITZAS PIZZA — MIDVALE TEMPORARY CLOSURE NOTICE
   Self-contained: injects its own markup and styles. Loaded on public pages
   via <script src="/js/closure.js?v=1" defer>.
   TO DISABLE: set ACTIVE = false, bump ?v= (or remove the tags), push.
   ========================================================================== */
(function () {
  'use strict';

  var ACTIVE = true;
  var ONCE_PER_SESSION = true;
  // Digits-only numbers to intercept. Midvale Litzas: 801-561-2171.
  var BLOCKED_NUMBERS = ['8015612171'];
  // Shared signup store on the Hires site (same family, one list).
  var NOTIFY_ENDPOINT = 'https://hiresbigh.com/api/closure-notify';

  if (!ACTIVE) return;

  var css = ''
    + '.ltz-overlay{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:1.25rem;background:rgba(10,9,8,.72);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);font-family:Georgia,"Times New Roman",serif}'
    + '.ltz-overlay.is-open{display:flex}'
    + '.ltz-card{position:relative;width:100%;max-width:30rem;max-height:92vh;overflow-y:auto;background:#0A0908;border:1px solid rgba(240,230,210,.18);border-radius:1rem;padding:2rem 1.75rem 1.75rem;text-align:center;color:#F0E6D2;box-shadow:0 24px 60px rgba(0,0,0,.55);animation:ltz-rise .32s cubic-bezier(.2,.8,.3,1) both}'
    + '@keyframes ltz-rise{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}'
    + '@media (prefers-reduced-motion:reduce){.ltz-card{animation:none}}'
    + '.ltz-close{position:absolute;top:.9rem;right:.9rem;width:2rem;height:2rem;border:0;border-radius:50%;background:transparent;color:#F0E6D2;font-size:1.4rem;line-height:1;cursor:pointer;opacity:.55}'
    + '.ltz-close:hover{opacity:1}.ltz-close:focus-visible{outline:2px solid #F0E6D2;outline-offset:2px;opacity:1}'
    + '.ltz-logo{display:block;width:180px;max-width:60%;height:auto;margin:0 auto 1.1rem}'
    + '.ltz-rule{width:3.5rem;height:2px;background:#C8452E;border:0;margin:0 auto 1.3rem}'
    + '.ltz-eyebrow{font-size:.98rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(240,230,210,.75);margin:0 0 .4rem;font-weight:700}'
    + '.ltz-headline{font-size:clamp(1.85rem,7.5vw,2.4rem);line-height:1.08;color:#F0E6D2;margin:0 0 1.15rem;font-weight:700}'
    + '.ltz-lede{font-size:1rem;font-weight:700;color:#F0E6D2;margin:0 0 .5rem}'
    + '.ltz-body{font-size:.96rem;line-height:1.55;color:rgba(240,230,210,.85);margin:0 0 .9rem}'
    + '.ltz-signoff{font-style:italic;color:#C8452E;margin:0 0 1.4rem}'
    + '.ltz-form-label{display:block;font-size:.84rem;letter-spacing:.06em;text-transform:uppercase;color:rgba(240,230,210,.8);margin-bottom:.55rem;font-weight:700}'
    + '.ltz-field{display:flex;gap:.5rem;flex-wrap:wrap}'
    + '.ltz-input{flex:1 1 12rem;min-width:0;padding:.7rem .85rem;border:1px solid rgba(240,230,210,.3);border-radius:.4rem;background:rgba(240,230,210,.06);font:inherit;font-size:.95rem;color:#F0E6D2}'
    + '.ltz-input::placeholder{color:rgba(240,230,210,.45)}'
    + '.ltz-input:focus-visible{outline:2px solid #C8452E;outline-offset:1px}'
    + '.ltz-btn{flex:0 0 auto;padding:.7rem 1.2rem;border:0;border-radius:.4rem;background:#C8452E;color:#F0E6D2;font:inherit;font-size:.92rem;letter-spacing:.07em;text-transform:uppercase;font-weight:700;cursor:pointer}'
    + '.ltz-btn:hover{background:#A5361F}.ltz-btn:focus-visible{outline:2px solid #F0E6D2;outline-offset:2px}.ltz-btn[disabled]{opacity:.6;cursor:default}'
    + '.ltz-status{min-height:1.2rem;margin:.6rem 0 0;font-size:.88rem;color:#E0A18F}'
    + '.ltz-fineprint{margin:.85rem 0 0;font-size:.78rem;color:rgba(240,230,210,.5)}'
    + '.ltz-alt{display:inline-block;margin-top:1.1rem;font-size:.92rem;color:#F0E6D2;text-decoration:underline;text-underline-offset:3px}'
    + '.ltz-dismiss{display:inline-block;margin-top:1.2rem;margin-left:1rem;background:none;border:0;border-bottom:1px solid rgba(240,230,210,.4);padding:0 0 2px;font:inherit;font-size:.92rem;color:rgba(240,230,210,.85);cursor:pointer}'
    + '.ltz-dismiss:hover{color:#F0E6D2;border-bottom-color:#F0E6D2}';

  var LOGO = '/assets/images/brand/litzas-logo-cream.png';

  function cardTop(titleId, headline) {
    return '<div class="ltz-card">'
      + '<button class="ltz-close" type="button" data-ltz-dismiss aria-label="Close">&times;</button>'
      + '<img class="ltz-logo" src="' + LOGO + '" alt="Litzas Pizza">'
      + '<hr class="ltz-rule">'
      + '<p class="ltz-eyebrow">Midvale &middot; Fort Union</p>'
      + '<h2 class="ltz-headline" id="' + titleId + '">' + headline + '</h2>';
  }

  function emailForm(idx, label) {
    return '<form data-ltz-form>'
      + '<label class="ltz-form-label" for="ltz-email-' + idx + '">' + label + '</label>'
      + '<div class="ltz-field">'
      + '<input class="ltz-input" id="ltz-email-' + idx + '" type="email" name="email" placeholder="you@email.com" required autocomplete="email">'
      + '<button class="ltz-btn" type="submit">Notify me</button>'
      + '</div>'
      + '<p class="ltz-status" data-ltz-status role="status" aria-live="polite"></p>'
      + (idx === 1 ? '<p class="ltz-fineprint">One email about this closure. That\u2019s it.</p>' : '')
      + '</form>';
  }

  var closureHTML = cardTop('ltz-closure-title', 'Temporarily Closed')
    + '<p class="ltz-lede">Due to a neighborhood power outage</p>'
    + '<p class="ltz-body">Our Midvale location is closed today, and we can\u2019t take phone orders there right now. We\u2019re so sorry for the inconvenience \u2014 we\u2019ll reopen as soon as power is restored.</p>'
    + '<p class="ltz-body">Our Salt Lake City location is open regular hours.</p>'
    + '<p class="ltz-signoff">Please stay safe, Midvale.</p>'
    + emailForm(1, 'Get an email when Midvale reopens')
    + '<a class="ltz-alt" href="tel:+18013595352">Call Salt Lake City &middot; 801-359-5352</a>'
    + '<button class="ltz-dismiss" type="button" data-ltz-dismiss>Continue to the site</button>'
    + '</div>';

  var orderingHTML = cardTop('ltz-ordering-title', 'Phones Are Down')
    + '<p class="ltz-body">Midvale is temporarily closed due to a neighborhood power outage, so no one can answer that line today. We\u2019re so sorry \u2014 thank you for your patience.</p>'
    + '<p class="ltz-body">Salt Lake City is open and taking orders.</p>'
    + emailForm(2, 'Tell me when Midvale is back')
    + '<a class="ltz-alt" href="tel:+18013595352">Call Salt Lake City &middot; 801-359-5352</a>'
    + '<button class="ltz-dismiss" type="button" data-ltz-dismiss>Back to the site</button>'
    + '</div>';

  function init() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    function makeOverlay(id, titleId, html) {
      var el = document.createElement('div');
      el.className = 'ltz-overlay';
      el.id = id;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-labelledby', titleId);
      el.hidden = true;
      el.innerHTML = html;
      document.body.appendChild(el);
      return el;
    }

    var closureModal = makeOverlay('ltz-closure', 'ltz-closure-title', closureHTML);
    var orderingModal = makeOverlay('ltz-ordering', 'ltz-ordering-title', orderingHTML);
    var lastFocused = null;

    function openModal(m) {
      lastFocused = document.activeElement;
      m.hidden = false;
      m.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      var t = m.querySelector('input, button');
      if (t) t.focus();
    }
    function closeModal(m) {
      m.classList.remove('is-open');
      m.hidden = true;
      document.body.style.overflow = '';
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }
    function closeAll() {
      [closureModal, orderingModal].forEach(function (m) {
        if (m.classList.contains('is-open')) closeModal(m);
      });
    }

    [closureModal, orderingModal].forEach(function (m) {
      m.addEventListener('click', function (e) {
        if (e.target === m || (e.target.hasAttribute && e.target.hasAttribute('data-ltz-dismiss'))) closeModal(m);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });

    // Arrival popup
    var seen = false;
    if (ONCE_PER_SESSION) {
      try { seen = sessionStorage.getItem('ltz-closure-seen') === '1'; } catch (err) {}
    }
    if (!seen) {
      openModal(closureModal);
      try { sessionStorage.setItem('ltz-closure-seen', '1'); } catch (err) {}
    }

    // Intercept Midvale tel: links (Call to Order buttons + order modal entry).
    // SLC line dials normally; links inside our own popups are never blocked.
    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
      if (!link || link.closest('.ltz-overlay')) return;
      var digits = (link.getAttribute('href') || '').replace(/\D/g, '');
      var hit = BLOCKED_NUMBERS.some(function (num) {
        return digits.slice(-num.length) === num;
      });
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      closeAll();
      openModal(orderingModal);
    }, true);

    // Email capture
    document.querySelectorAll('[data-ltz-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('input[type="email"]');
        var button = form.querySelector('button[type="submit"]');
        var status = form.querySelector('[data-ltz-status]');
        var email = (input.value || '').trim();
        if (!email || email.indexOf('@') < 1) {
          status.textContent = 'Please enter a valid email address.';
          input.focus();
          return;
        }
        button.disabled = true;
        status.textContent = 'Adding you to the list\u2026';
        fetch(NOTIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, location: 'midvale', brand: 'litzas', reason: 'neighborhood-power-outage', page: window.location.pathname })
        }).then(function (res) {
          if (!res.ok) throw new Error('bad');
          status.textContent = 'You\u2019re on the list. We\u2019ll email you the minute we reopen.';
          form.reset();
        }).catch(function () {
          status.textContent = 'Thanks \u2014 we\u2019ll be back as soon as power is restored.';
          form.reset();
        }).then(function () { button.disabled = false; });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
