// Renders the shared nav, CTA band and footer into #site-header / #site-cta / #site-footer,
// and owns the login (mobile + code) and logout dialogs used from the nav and the ride page.
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var LINKS = [
    ['Home', 'index.html'], ['Ride', 'ride.html'], ['Rent a car', 'cars.html'],
    ['Blog', 'blog.html'], ['Contact', 'contact.html']
  ];
  var ALIAS = { 'track.html': 'ride.html', 'car.html': 'cars.html', 'confirmation.html': 'cars.html', 'rides.html': '', 'profile.html': '' }; // sub-pages light up their parent link
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (page.indexOf('_shot_') === 0) page = page.replace(/^_shot_[a-z]+_\d+_/, ''); // screenshot helper copies
  if (page === '' || page === '/') page = 'index.html';
  var active = ALIAS[page] || page;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function icons() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } }); }
  function profile() { return window.Profile ? window.Profile.get() : null; }

  function brand() {
    return '<a class="brand" href="index.html" aria-label="Kinetix home"><span class="brand__mark"><i data-lucide="zap"></i></span><span class="brand__name">Kinetix</span></a>';
  }
  function account() { // "Log in" until a profile exists, then the rider's name with a small menu
    var p = profile();
    if (!p) return '<a class="nav__login" href="#" data-login>Log in</a>';
    return '<div class="account"><button type="button" class="nav__login nav__user" data-account aria-haspopup="menu" aria-expanded="false"><i data-lucide="user"></i>' + esc(window.Profile.first(p)) + '<i data-lucide="chevron-down" class="account__caret"></i></button>' +
      '<div class="account__menu" role="menu" hidden><a role="menuitem" href="profile.html"' + (page === 'profile.html' ? ' aria-current="page"' : '') + '><i data-lucide="user"></i>My profile</a>' +
      '<a role="menuitem" href="rides.html"' + (page === 'rides.html' ? ' aria-current="page"' : '') + '><i data-lucide="route"></i>My rides</a>' +
      '<hr class="account__rule"><button type="button" role="menuitem" data-logout><i data-lucide="log-out"></i>Log out</button></div></div>';
  }
  function mobileAccount() { // the same three entries, flat, in the phone menu
    var p = profile();
    if (!p) return '<a href="#" data-login>Log in</a>';
    return '<a href="profile.html" class="nav__user"><i data-lucide="user"></i>My profile</a><a href="rides.html" class="nav__user"><i data-lucide="route"></i>My rides</a><a href="#" class="nav__user" data-logout><i data-lucide="log-out"></i>Log out</a>';
  }
  function links() {
    return LINKS.map(function (l) {
      var on = l[1] === active;
      return '<a href="' + l[1] + '"' + (on ? ' class="is-active" aria-current="page"' : '') + '>' + l[0] + '</a>';
    }).join('');
  }

  function renderHeader(el) {
    el.className = 'site-header';
    el.innerHTML =
      '<a class="skip-link" href="#main">Skip to content</a>' +
      '<div class="container nav">' + brand() +
        '<nav class="nav__links" aria-label="Main">' + links() + '</nav>' +
        '<div class="nav__actions">' +
          '<button type="button" class="theme-toggle" id="theme-toggle" aria-label="Switch theme">' +
            '<span class="theme-toggle__sun"><i data-lucide="sun"></i></span><span class="theme-toggle__moon"><i data-lucide="moon"></i></span></button>' +
          account() +
          '<a class="btn btn--primary" href="ride.html">Book a ride</a>' +
          '<button type="button" class="nav__burger" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu"><i data-lucide="menu"></i><i data-lucide="x"></i></button>' +
        '</div>' +
      '</div>' +
      '<div class="nav-menu" id="nav-menu"><nav class="container nav-menu__inner" aria-label="Mobile">' + links() +
        mobileAccount() + '<a class="btn btn--primary" href="ride.html">Book a ride</a></nav></div>';

    var burger = el.querySelector('.nav__burger'), menu = el.querySelector('#nav-menu');
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', open);
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a:not([data-login]):not([data-logout])')) burger.click(); });
    el.querySelectorAll('[data-logout]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); closeAccount(); openLogout(); }); });
    var acc = el.querySelector('[data-account]'), accMenu = el.querySelector('.account__menu');
    function closeAccount() { if (acc) { acc.setAttribute('aria-expanded', 'false'); accMenu.hidden = true; } }
    if (acc) {
      acc.addEventListener('click', function (e) { e.stopPropagation(); var open = accMenu.hidden; accMenu.hidden = !open; acc.setAttribute('aria-expanded', String(open)); });
      document.addEventListener('click', function (e) { if (!e.target.closest('.account')) closeAccount(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAccount(); });
    }
    el.querySelectorAll('[data-login]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); openLogin(); }); });
    if (window.Theme) window.Theme.bind(el.querySelector('#theme-toggle'));
  }

  /* ---- Login: mobile -> code -> (name, only for a new number) ---- */
  var loginDialog = null, loginOpts = {};
  function buildLogin() {
    var d = document.createElement('dialog');
    d.className = 'modal'; d.id = 'auth-modal'; d.setAttribute('aria-labelledby', 'au-title');
    d.innerHTML =
      '<form class="modal__card" id="auth-form" novalidate>' +
        '<button type="button" class="btn-icon modal__close" data-close aria-label="Close"><i data-lucide="x"></i></button>' +
        '<span class="modal__icon"><i data-lucide="smartphone"></i></span>' +
        '<div><h2 class="modal__title" id="au-title"></h2><p class="small muted" id="au-sub"></p></div>' +
        '<div class="auth__step" data-step="phone">' +
          '<div class="field" data-field="phone"><label class="label" for="au-phone">Mobile</label>' +
            '<div class="input-wrap"><i data-lucide="phone"></i><input class="input" id="au-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="98xxx xxxxx"></div><p class="field__error"></p></div>' +
          '<button type="submit" class="btn btn--primary btn--lg btn--block">Send code <i data-lucide="arrow-right"></i></button>' +
          '<p class="tiny muted text-center">No password. We text a 4-digit code each time.</p>' +
        '</div>' +
        '<div class="auth__step" data-step="otp" hidden>' +
          '<p class="auth__sent small"><i data-lucide="message-square"></i><span>Code sent to <strong id="au-to"></strong></span><button type="button" class="link link--inline" id="au-change">Change</button></p>' +
          '<div class="field" data-field="otp"><label class="label" for="au-otp">4-digit code</label>' +
            '<input class="input otp-input" id="au-otp" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="4" placeholder="····">' +
            '<p class="field__hint" id="au-demo"></p><p class="field__error"></p></div>' +
          '<button type="submit" class="btn btn--primary btn--lg btn--block">Verify <i data-lucide="arrow-right"></i></button>' +
          '<p class="tiny muted text-center">Didn\'t get it? <button type="button" class="link link--inline" id="au-resend">Resend code</button></p>' +
        '</div>' +
        '<div class="auth__step" data-step="name" hidden>' +
          '<div class="field" data-field="name"><label class="label" for="au-name">Your name</label>' +
            '<div class="input-wrap"><i data-lucide="user"></i><input class="input" id="au-name" type="text" autocomplete="name" placeholder="Full name"></div><p class="field__error"></p></div>' +
          '<div class="field" data-field="email"><label class="label" for="au-email">Email</label>' +
            '<div class="input-wrap"><i data-lucide="mail"></i><input class="input" id="au-email" type="email" autocomplete="email" placeholder="you@example.com"></div><p class="field__error"></p></div>' +
          '<button type="submit" class="btn btn--primary btn--lg btn--block" id="au-create">Create profile <i data-lucide="arrow-right"></i></button>' +
        '</div>' +
      '</form>';
    document.body.appendChild(d);
    var P = window.Profile, form = d.querySelector('#auth-form'), step = 'phone';
    var $ = function (id) { return d.querySelector('#' + id); };
    var COPY = {
      phone: ['Log in with your mobile', 'Enter the number you ride with.'],
      otp: ['Enter the code', 'It\'s valid for 10 minutes.'],
      name: ['New here? Let\'s set you up', 'Your name and email. Receipts go to the email, ride updates to your mobile.']
    };

    function setError(k, msg) {
      var f = form.querySelector('.field[data-field="' + k + '"]'), input = f.querySelector('.input');
      f.classList.toggle('has-error', !!msg); f.querySelector('.field__error').textContent = msg || '';
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
    function show(s) {
      step = s;
      d.querySelectorAll('.auth__step').forEach(function (el) { el.hidden = el.getAttribute('data-step') !== s; });
      $('au-title').textContent = COPY[s][0];
      $('au-sub').textContent = s === 'phone' && loginOpts.reason ? loginOpts.reason : COPY[s][1];
      var input = { phone: $('au-phone'), otp: $('au-otp'), name: $('au-name') }[s];
      setTimeout(function () { input.focus(); }, 30);
    }
    function sendCode() { // demo: no SMS yet, so the code is shown on screen
      $('au-to').textContent = P.formatPhone($('au-phone').value);
      $('au-demo').textContent = 'Demo: no SMS yet, your code is ' + P.otpFor($('au-phone').value) + '.';
      $('au-otp').value = '';
      show('otp');
    }
    function finishCaptain(cap) {
      window.Captain.login(cap.phone);
      d.close();
      document.dispatchEvent(new CustomEvent('kinetix:captain'));
      if (typeof loginOpts.onDone === 'function' && loginOpts.captainOnly) loginOpts.onDone(cap);
      else if (!/captain/.test(location.pathname)) location.href = 'captain.html';
    }
    function finish(rec) {
      var p = P.set({ name: rec.name, email: rec.email, phone: $('au-phone').value });
      d.close();
      render(); // nav shows the rider
      document.dispatchEvent(new CustomEvent('kinetix:profile'));
      if (typeof loginOpts.onDone === 'function') loginOpts.onDone(p);
    }

    form.addEventListener('input', function (e) {
      var f = e.target.closest('.field');
      if (f && f.classList.contains('has-error')) setError(f.getAttribute('data-field'), '');
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v;
      if (step === 'phone') {
        v = P.validate({ phone: $('au-phone').value });
        if (!v.ok) { setError('phone', v.errors.phone); $('au-phone').focus(); return; }
        if (loginOpts.captainOnly && !(window.Captain && window.Captain.byPhone($('au-phone').value))) { setError('phone', 'This number isn\'t registered as a captain.'); $('au-phone').focus(); return; }
        sendCode();
      } else if (step === 'otp') {
        v = P.validate({ otp: $('au-otp').value });
        if (!v.ok) { setError('otp', v.errors.otp); $('au-otp').focus(); return; }
        if ($('au-otp').value.trim() !== P.otpFor($('au-phone').value)) { setError('otp', 'That code doesn\'t match. Try again.'); $('au-otp').focus(); return; }
        var cap = window.Captain && window.Captain.byPhone($('au-phone').value);
        if (cap) { finishCaptain(cap); return; } // captain numbers go to the captain side
        var known = P.lookup($('au-phone').value);
        if (known) finish(known); else { $('au-name').value = ''; $('au-email').value = ''; show('name'); } // registered: straight through
      } else {
        v = P.validate({ name: $('au-name').value, email: $('au-email').value });
        setError('name', v.errors.name); setError('email', v.errors.email);
        if (!v.ok) { (v.errors.name ? $('au-name') : $('au-email')).focus(); return; }
        finish({ name: $('au-name').value, email: $('au-email').value });
      }
    });
    $('au-change').addEventListener('click', function () { show('phone'); });
    $('au-resend').addEventListener('click', function () { sendCode(); });
    d.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { d.close(); }); });
    d.start = function () {
      form.reset(); ['phone', 'otp', 'name', 'email'].forEach(function (k) { setError(k, ''); });
      $('au-create').innerHTML = (loginOpts.createLabel || 'Create profile') + ' <i data-lucide="arrow-right"></i>';
      show('phone');
    };
    return d;
  }
  // opts: { reason: sub-line for the first step, createLabel: button text for a new rider, onDone(profile) }
  function openLogin(opts) {
    if (!window.Profile) return;
    loginOpts = opts || {};
    loginDialog = loginDialog || buildLogin();
    loginDialog.start();
    icons();
    loginDialog.showModal();
  }

  /* ---- Logout ---- */
  var logoutDialog = null;
  function buildLogout() {
    var d = document.createElement('dialog');
    d.className = 'modal'; d.id = 'logout-modal'; d.setAttribute('aria-labelledby', 'lo-title');
    d.innerHTML =
      '<div class="modal__card modal__card--compact" tabindex="-1">' +
        '<button type="button" class="btn-icon modal__close" data-close aria-label="Close"><i data-lucide="x"></i></button>' +
        '<div class="modal__head"><span class="modal__icon modal__icon--sm"><i data-lucide="log-out"></i></span><h2 class="modal__title" id="lo-title">Log out?</h2></div>' +
        '<p class="small muted">Are you sure you want to log out of Kinetix on this device?</p>' +
        '<div class="modal__actions"><button type="button" class="btn btn--outline btn--lg" data-close>Cancel</button><button type="button" class="btn btn--primary btn--lg" id="lo-confirm"><i data-lucide="log-out"></i>Log out</button></div>' +
      '</div>';
    document.body.appendChild(d);
    d.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { d.close(); }); });
    d.querySelector('#lo-confirm').addEventListener('click', function () {
      window.Profile.clear();
      d.close();
      render(); // nav goes back to "Log in"
      document.dispatchEvent(new CustomEvent('kinetix:profile')); // pages showing the rider refresh themselves
    });
    return d;
  }
  function openLogout() {
    var p = profile();
    if (!p) return;
    logoutDialog = logoutDialog || buildLogout();
    icons();
    logoutDialog.showModal();
    logoutDialog.querySelector('.modal__card').focus(); // no ring on the button until the keyboard is used
  }

  function renderCta(el) {
    el.className = 'site-cta';
    el.innerHTML =
      '<div class="container"><section class="cta-band reveal" aria-labelledby="cta-title">' +
        '<h2 class="cta-band__title" id="cta-title">Ready to ride electric?</h2>' +
        '<p class="cta-band__text">Rides from ₹20, cars from ₹120 an hour. No surge, no hidden fees.</p>' +
        '<a class="btn btn--light btn--lg" href="ride.html">Book a ride <i data-lucide="arrow-right"></i></a>' +
      '</section></div>';
  }

  function col(title, items) {
    return '<div class="footer__col"><h3>' + title + '</h3>' + items.map(function (i) {
      return '<a href="' + i[1] + '">' + i[0] + '</a>';
    }).join('') + '</div>';
  }
  function renderFooter(el) {
    el.className = 'site-footer';
    el.innerHTML =
      '<div class="container"><div class="footer__card">' +
        '<div class="footer__top">' +
          '<div class="footer__brand">' + brand() +
            '<p class="footer__desc">Electric bike taxi and self-drive car rentals in Bhimavaram.</p>' +
            '<div class="footer__social">' +
              '<a href="#" aria-label="Instagram"><i data-lucide="instagram"></i></a>' +
              '<a href="#" aria-label="Twitter"><i data-lucide="twitter"></i></a>' +
              '<a href="#" aria-label="LinkedIn"><i data-lucide="linkedin"></i></a>' +
              '<a href="#" aria-label="YouTube"><i data-lucide="youtube"></i></a>' +
            '</div></div>' +
          '<div class="footer__cols">' +
            col('Services', [['Book a ride', 'ride.html'], ['Schedule a ride', 'ride.html?when=later'], ['Rent a car', 'cars.html'], ['My rides', 'rides.html']]) +
            col('Company', [['About', '#'], ['Blog', 'blog.html'], ['Contact', 'contact.html'], ['Captain login', 'captain.html']]) +
            col('Support', [['FAQ', 'contact.html'], ['Safety', '#'], ['Terms', '#'], ['Privacy', '#']]) +
          '</div></div>' +
        '<div class="footer__bottom"><span>© 2026 Kinetix. All rights reserved.</span>' +
          '<nav aria-label="Legal"><a href="#">Privacy Policy</a><a href="#">Terms of Service</a></nav></div>' +
      '</div></div>' +
      '<div class="footer__wordmark-wrap" aria-hidden="true"><div class="footer__wordmark">Kinetix</div></div>';
  }

  function render() {
    var h = document.getElementById('site-header'), c = document.getElementById('site-cta'), f = document.getElementById('site-footer');
    if (h) renderHeader(h);
    if (c) renderCta(c);
    if (f) renderFooter(f);
    icons();
    if (window.Reveal) window.Reveal.refresh();
  }
  window.Layout = { render: render, login: openLogin, logout: openLogout };
  render();
})();
