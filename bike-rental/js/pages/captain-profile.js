// Captain profile: account, scooter and document status
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var C = window.Captain, P = window.Profile, $ = function (id) { return document.getElementById(id); };
  function finish() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } }); if (window.Reveal) window.Reveal.refresh(); }

  function render() {
    var cap = C.current();
    $('cap-gate').hidden = !!cap; $('cap-profile').hidden = !cap;
    if (!cap) { finish(); return; }
    $('p-name').textContent = cap.name; $('p-meta').textContent = 'Kinetix captain · Bhimavaram';
    $('p-phone').textContent = P.formatPhone(cap.phone); $('p-rating').textContent = cap.rating.toFixed(1) + ' ★';
    $('p-rides').textContent = cap.rides; $('p-since').textContent = cap.since;
    var ev = (window.KINETIX_EV || []).filter(function (v) { return v.name === cap.vehicle; })[0];
    $('v-img').src = ev ? ev.image : ''; $('v-img').alt = cap.vehicle;
    $('v-name').textContent = cap.vehicle + (ev ? ' · ' + ev.range : ''); $('v-plate').textContent = cap.plate;
    $('d-licence').textContent = cap.licence || 'On file'; $('d-rc').textContent = cap.plate;
    finish();
  }
  $('gate-login').addEventListener('click', function () { if (window.CaptainNav) window.CaptainNav.login(); });
  $('p-logout').addEventListener('click', function () { var a = document.querySelector('[data-captain-logout]'); if (a) a.click(); });
  document.addEventListener('kinetix:captain', render);
  render();
})();
