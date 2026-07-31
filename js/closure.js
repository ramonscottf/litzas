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
    + '.ltz-overlay{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:1.25rem;background:rgba(10,9,8,.78);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}'
    + '.ltz-overlay.is-open{display:flex}'
    + '.ltz-card{position:relative;width:100%;max-width:29rem;max-height:92vh;overflow-y:auto;background:#0a0908;border:1px solid rgba(174,152,96,.28);border-radius:28px;padding:2.3rem 1.9rem 1.9rem;text-align:center;color:#f4ede0;box-shadow:0 34px 90px rgba(0,0,0,.58),0 0 60px rgba(174,152,96,.12);animation:ltz-rise .4s cubic-bezier(.16,1,.3,1) both}'
    + '@keyframes ltz-rise{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}'
    + '@media (prefers-reduced-motion:reduce){.ltz-card{animation:none}}'
    + '.ltz-close{position:absolute;top:.85rem;right:.85rem;width:2.1rem;height:2.1rem;border:0;border-radius:50%;background:rgba(244,237,224,.07);color:#f4ede0;font-size:1.25rem;line-height:1;cursor:pointer;transition:background .2s}'
    + '.ltz-close:hover{background:rgba(244,237,224,.15)}.ltz-close:focus-visible{outline:2px solid #ae9860;outline-offset:2px}'
    + '.ltz-logo{display:block;width:170px;max-width:56%;height:auto;margin:0 auto 1.2rem}'
    + '.ltz-eyebrow{font-family:"Oswald","Arial Narrow",sans-serif;font-size:.74rem;letter-spacing:.24em;text-transform:uppercase;color:#ae9860;margin:0 0 .55rem;font-weight:600}'
    + '.ltz-headline{font-family:"Anton","Arial Narrow",sans-serif;font-size:clamp(2.2rem,8.5vw,3rem);line-height:1.04;letter-spacing:.02em;color:#f4ede0;margin:0 0 1.05rem;font-weight:400;text-transform:uppercase}'
    + '.ltz-rule{width:56px;height:2px;background:linear-gradient(90deg,transparent,#ae9860,transparent);border:0;margin:0 auto 1.15rem}'
    + '.ltz-lede{font-size:.98rem;font-weight:700;color:#f4ede0;margin:0 0 .5rem}'
    + '.ltz-body{font-size:.93rem;line-height:1.65;color:rgba(244,237,224,.78);margin:0 0 .85rem}'
    + '.ltz-signoff{font-family:"Oswald","Arial Narrow",sans-serif;font-size:.85rem;letter-spacing:.14em;text-transform:uppercase;color:#c9b079;margin:0 0 1.5rem}'
    + '.ltz-form-label{display:block;font-family:"Oswald","Arial Narrow",sans-serif;font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(244,237,224,.85);margin-bottom:.6rem;font-weight:600}'
    + '.ltz-field{display:flex;gap:.5rem;flex-wrap:wrap}'
    + '.ltz-input{flex:1 1 12rem;min-width:0;padding:.78rem .95rem;border:1px solid rgba(244,237,224,.22);border-radius:999px;background:rgba(244,237,224,.05);font:inherit;font-size:.93rem;color:#f4ede0;transition:border-color .2s,background .2s}'
    + '.ltz-input::placeholder{color:rgba(244,237,224,.38)}'
    + '.ltz-input:hover{border-color:rgba(244,237,224,.38)}'
    + '.ltz-input:focus-visible{outline:none;border-color:#ae9860;background:rgba(244,237,224,.08);box-shadow:0 0 0 3px rgba(174,152,96,.18)}'
    + '.ltz-btn{flex:0 0 auto;padding:.78rem 1.5rem;border:0;border-radius:999px;background:#ae9860;color:#0a0908;font-family:"Oswald","Arial Narrow",sans-serif;font-size:.78rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;box-shadow:0 8px 28px rgba(174,152,96,.26);transition:transform .2s cubic-bezier(.16,1,.3,1),background .2s,box-shadow .2s}'
    + '.ltz-btn:hover{background:#c9b079;transform:translateY(-2px);box-shadow:0 12px 34px rgba(174,152,96,.34)}'
    + '.ltz-btn:focus-visible{outline:2px solid #f4ede0;outline-offset:2px}.ltz-btn[disabled]{opacity:.6;cursor:default;transform:none}'
    + '.ltz-status{min-height:1.2rem;margin:.6rem 0 0;font-size:.85rem;font-weight:500;color:#c9b079}'
    + '.ltz-fineprint{margin:.8rem 0 0;font-size:.75rem;color:rgba(244,237,224,.42)}'
    + '.ltz-alt{display:inline-block;margin-top:1.05rem;font-family:"Oswald","Arial Narrow",sans-serif;font-size:.8rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#ae9860;text-decoration:none;border-bottom:1px solid rgba(174,152,96,.4);padding-bottom:2px;transition:color .2s,border-color .2s}'
    + '.ltz-alt:hover{color:#c9b079;border-bottom-color:#c9b079}'
    + '.ltz-dismiss{display:inline-block;margin-top:1.25rem;margin-left:1.2rem;background:none;border:0;padding:0;font:inherit;font-size:.86rem;font-weight:500;color:rgba(244,237,224,.5);cursor:pointer;transition:color .2s}'
    + '.ltz-dismiss:hover{color:#f4ede0}';

  var LOGO = '/assets/images/brand/litzas-logo-cream.png';

  function cardTop(titleId, headline) {
    return '<div class="ltz-card">'
      + '<button class="ltz-close" type="button" data-ltz-dismiss aria-label="Close">&times;</button>'
      + '<img class="ltz-logo" src="' + LOGO + '" alt="Litzas Pizza">'
      + '<p class="ltz-eyebrow">Midvale &middot; Fort Union</p>'
      + '<h2 class="ltz-headline" id="' + titleId + '">' + headline + '</h2>'
      + '<hr class="ltz-rule">';
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
