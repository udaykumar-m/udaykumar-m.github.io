// Captain pages: header with the Online/Offline switch, login gate and logout dialog (#captain-header)
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var C = window.Captain, el = document.getElementById('captain-header');
  if (!el || !C) return;
  var LINKS = [['Home', 'captain.html'], ['Rides', 'captain-rides.html'], ['Profile', 'captain-profile.html']];
  var page = (location.pathname.split('/').pop() || '').toLowerCase().replace(/^_shot_[a-z]+_\d+_/, '');
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function icons() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } }); }
  function emit() { document.dispatchEvent(new CustomEvent('kinetix:captain')); }

  function links() {
    return LINKS.map(function (l) { return '<a href="' + l[1] + '"' + (l[1] === page ? ' class="is-active" aria-current="page"' : '') + '>' + l[0] + '</a>'; }).join('');
  }
  function switchHtml(st) {
    return '<label class="switch online-switch' + (st.online ? ' is-on' : '') + '" id="online-switch"><input type="checkbox" id="online-toggle"' + (st.online ? ' checked' : '') + '><span class="switch__track"></span><span class="online-switch__label">' + (st.online ? 'Online' : 'Offline') + '</span></label>';
  }
  function render() {
    var cap = C.current(), st = C.state();
    el.className = 'site-header captain-header';
    el.innerHTML =
      '<a class="skip-link" href="#main">Skip to content</a>' +
      '<div class="container nav">' +
        '<a class="brand" href="captain.html" aria-label="Kinetix captain home"><span class="brand__mark"><i data-lucide="zap"></i></span><span class="brand__name">Kinetix</span><span class="chip chip--accent brand__tag">Captain</span></a>' +
        '<nav class="nav__links" aria-label="Captain">' + (cap ? links() : '') + '</nav>' +
        '<div class="nav__actions">' +
          (cap ? switchHtml(st) : '') +
          '<button type="button" class="theme-toggle" id="theme-toggle" aria-label="Switch theme"><span class="theme-toggle__sun"><i data-lucide="sun"></i></span><span class="theme-toggle__moon"><i data-lucide="moon"></i></span></button>' +
          (cap ? '<a class="nav__login nav__user" href="#" data-captain-logout><i data-lucide="user"></i>' + esc(cap.name.split(' ')[0]) + '</a>' : '<a class="nav__login" href="#" data-captain-login>Captain login</a>') +
          '<a class="btn btn--outline hide-mobile" href="index.html">Rider site</a>' +
          '<button type="button" class="nav__burger" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu"><i data-lucide="menu"></i><i data-lucide="x"></i></button>' +
        '</div>' +
      '</div>' +
      '<div class="nav-menu" id="nav-menu"><nav class="container nav-menu__inner" aria-label="Captain mobile">' + (cap ? links() : '') +
        (cap ? '<a href="#" class="nav__user" data-captain-logout><i data-lucide="user"></i>' + esc(cap.name) + '</a>' : '<a href="#" data-captain-login>Captain login</a>') +
        '<a href="index.html">Rider site</a></nav></div>';

    var burger = el.querySelector('.nav__burger'), menu = el.querySelector('#nav-menu');
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', open);
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a:not([data-captain-login]):not([data-captain-logout])')) burger.click(); });
    if (window.Theme) window.Theme.bind(el.querySelector('#theme-toggle'));
    el.querySelectorAll('[data-captain-login]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); login(); }); });
    el.querySelectorAll('[data-captain-logout]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); openLogout(); }); });
    var toggle = el.querySelector('#online-toggle');
    if (toggle) toggle.addEventListener('change', function () { setOnline(toggle.checked); });
    icons();
  }

  function setOnline(on) {
    C.setOnline(on);
    if (on && 'Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) {} }
    var sw = el.querySelector('#online-switch');
    if (sw) { sw.classList.toggle('is-on', on); sw.querySelector('.online-switch__label').textContent = on ? 'Online' : 'Offline'; sw.querySelector('input').checked = on; }
    emit();
  }
  function login() {
    if (!window.Layout) return;
    window.Layout.login({ captainOnly: true, reason: 'Enter your captain mobile number.', onDone: function () { render(); emit(); } });
  }

  var logoutDialog = null;
  function openLogout() {
    if (!logoutDialog) {
      logoutDialog = document.createElement('dialog');
      logoutDialog.className = 'modal'; logoutDialog.setAttribute('aria-labelledby', 'clo-title');
      logoutDialog.innerHTML =
        '<div class="modal__card modal__card--compact" tabindex="-1">' +
          '<button type="button" class="btn-icon modal__close" data-close aria-label="Close"><i data-lucide="x"></i></button>' +
          '<div class="modal__head"><span class="modal__icon modal__icon--sm"><i data-lucide="log-out"></i></span><h2 class="modal__title" id="clo-title">Log out?</h2></div>' +
          '<p class="small muted">You will go offline and stop receiving requests on this device.</p>' +
          '<div class="modal__actions"><button type="button" class="btn btn--outline btn--lg" data-close>Cancel</button><button type="button" class="btn btn--primary btn--lg" id="clo-confirm"><i data-lucide="log-out"></i>Log out</button></div>' +
        '</div>';
      document.body.appendChild(logoutDialog);
      logoutDialog.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { logoutDialog.close(); }); });
      logoutDialog.addEventListener('click', function (e) { if (e.target === logoutDialog) logoutDialog.close(); });
      logoutDialog.querySelector('#clo-confirm').addEventListener('click', function () {
        C.setOnline(false); C.logout(); logoutDialog.close(); render(); emit();
      });
      icons();
    }
    logoutDialog.showModal(); logoutDialog.querySelector('.modal__card').focus();
  }

  window.CaptainNav = { render: render, login: login, setOnline: setOnline };
  render();
})();
