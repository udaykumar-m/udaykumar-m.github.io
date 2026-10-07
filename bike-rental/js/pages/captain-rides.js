// Captain rides: earnings tiles and the ride history grouped by day
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var C = window.Captain, R = window.Ride, $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function finish() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } }); if (window.Reveal) window.Reveal.refresh(); }
  function time(ms) { var d = new Date(ms), h = d.getHours(); return ((h % 12) || 12) + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes() + (h < 12 ? ' am' : ' pm'); }
  function dayLabel(ms) {
    var d = new Date(ms), now = new Date(), diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function stars(n) { var s = ''; for (var i = 1; i <= 5; i++) s += '<i data-lucide="star" class="' + (i <= n ? 'is-on' : '') + '"></i>'; return '<span class="stars stars--sm" aria-label="' + n + ' of 5">' + s + '</span>'; }

  function render() {
    var cap = C.current();
    $('cap-gate').hidden = !!cap; $('cap-rides').hidden = !cap;
    if (!cap) { finish(); return; }
    C.seedHistory(cap);
    var list = C.rides(), sum = C.summary(list);
    $('e-today').textContent = R.formatINR(sum.todayEarn); $('e-today-sub').textContent = sum.todayRides + ' rides · ' + sum.todayKm + ' km';
    $('e-week').textContent = R.formatINR(sum.weekEarn); $('e-week-sub').textContent = sum.weekRides + ' rides';
    $('e-payout').textContent = R.formatINR(sum.weekEarn); $('e-rating').textContent = cap.rating.toFixed(1) + ' ★'; $('e-rating-sub').textContent = cap.rides + ' lifetime rides';

    var groups = [], map = {};
    list.forEach(function (r) { var k = dayLabel(r.at); if (!map[k]) { map[k] = []; groups.push(k); } map[k].push(r); });
    $('history').innerHTML = groups.length ? groups.map(function (k) {
      var rows = map[k], total = rows.reduce(function (a, r) { return a + (r.status === 'done' ? r.share : 0); }, 0);
      return '<section class="card cap-day"><header class="cap-day__head"><h2>' + esc(k) + '</h2><span class="small muted">' + rows.length + ' rides · <strong>' + R.formatINR(total) + '</strong></span></header><ul class="ride-list ride-list--full">' +
        rows.map(function (r) {
          var off = r.status === 'cancelled';
          return '<li class="ride-list__row' + (off ? ' is-cancelled' : '') + '"><span class="ride-list__time">' + time(r.at) + '</span>' +
            '<span class="ride-list__route">' + esc(r.pickup) + ' → ' + esc(r.drop) + '<small>' + esc(r.rider) + ' · ' + (off ? 'Cancelled' + (r.reason ? ' · ' + esc(r.reason) : '') : r.km + ' km · fare ' + R.formatINR(r.fare) + ' · ' + (r.paid === 'upi' ? 'UPI' : 'Cash')) + '</small></span>' +
            (off ? '<span class="ride-list__rate"></span>' : '<span class="ride-list__rate">' + stars(r.rating) + '</span>') +
            '<strong class="ride-list__amt">' + (off ? '—' : R.formatINR(r.share)) + '</strong></li>';
        }).join('') + '</ul></section>';
    }).join('') : '<div class="empty"><i data-lucide="route"></i><h3>No rides yet</h3><p>Go online from the home page to take your first ride.</p></div>';
    finish();
  }
  $('gate-login').addEventListener('click', function () { if (window.CaptainNav) window.CaptainNav.login(); });
  document.addEventListener('kinetix:captain', render);
  render();
})();
