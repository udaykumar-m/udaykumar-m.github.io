// My rides: the rider's history on this device, grouped by day, with status from the tracking records
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var R = window.Ride, P = window.Profile, $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function finish() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } }); if (window.Reveal) window.Reveal.refresh(); }
  function time(ms) { var d = new Date(ms), h = d.getHours(); return ((h % 12) || 12) + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes() + (h < 12 ? ' am' : ' pm'); }
  function dayLabel(ms) {
    var d = new Date(ms), now = new Date(), diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  var STATUS = { done: ['Completed', 'chip--accent', 'circle-check'], live: ['In progress', 'chip--solid', 'radio'], scheduled: ['Scheduled', '', 'calendar-clock'], cancelled: ['Cancelled', 'chip--muted', 'x'] };

  function render() {
    var p = P.get();
    $('rides-gate').hidden = !!p; $('rides-page').hidden = !p;
    if (!p) { finish(); return; }
    R.seedRides(p.phone);
    var list = R.rides().map(function (r) { r.status = R.rideStatus(r); return r; });
    var done = list.filter(function (r) { return r.status === 'done'; });
    var spent = done.reduce(function (a, r) { return a + (r.fare || 0); }, 0), co2 = done.reduce(function (a, r) { return a + (r.co2 || 0); }, 0);
    $('rides-sub').textContent = done.length ? done.length + ' electric rides so far, ' + p.name.split(' ')[0] + '.' : 'Your first ride will show up here.';
    $('rs-count').textContent = done.length; $('rs-spent').textContent = R.formatINR(spent);
    $('rs-co2').textContent = co2 >= 1000 ? (co2 / 1000).toFixed(1) + ' kg' : co2 + ' g';

    // scheduled rides first, then everything by day
    var upcoming = list.filter(function (r) { return r.status === 'scheduled'; }), past = list.filter(function (r) { return r.status !== 'scheduled'; });
    var groups = [], map = {};
    if (upcoming.length) { groups.push('Upcoming'); map['Upcoming'] = upcoming; }
    past.forEach(function (r) { var k = dayLabel(r.createdAt); if (!map[k]) { map[k] = []; groups.push(k); } map[k].push(r); });

    $('rides-groups').innerHTML = groups.length ? groups.map(function (k) {
      return '<section class="card rides-day"><h2 class="rides-day__head">' + esc(k) + '</h2><ul class="rides-list">' + map[k].map(function (r) {
        var st = STATUS[r.status], when = r.status === 'scheduled' ? R.formatWhen(r.at) : time(r.createdAt);
        var trackUrl = r.url || R.buildUrl('track.html', { pickup: r.pickup, drop: r.drop, when: r.when, at: r.at, name: r.name, phone: r.phone, by: r.by, ref: r.ref });
        var again = R.buildUrl('ride.html', { pickup: r.pickup, drop: r.drop });
        return '<li class="rides-list__row' + (r.status === 'cancelled' ? ' is-cancelled' : '') + '">' +
          '<span class="rides-list__time">' + esc(when) + '</span>' +
          '<span class="rides-list__route"><strong>' + esc(r.pickup) + ' → ' + esc(r.drop) + '</strong><small>' + r.km + ' km · ' + esc(r.ref) + (r.by ? ' · for ' + esc(r.name) : '') + '</small></span>' +
          '<span class="chip ' + st[1] + ' rides-list__status"><i data-lucide="' + st[2] + '"></i>' + st[0] + '</span>' +
          '<strong class="rides-list__amt">' + (r.status === 'cancelled' ? '—' : R.formatINR(r.fare)) + '</strong>' +
          '<span class="rides-list__actions"><a class="link small" href="' + trackUrl + '">' + (r.status === 'live' || r.status === 'scheduled' ? 'Track' : 'Receipt') + '</a><a class="link small" href="' + again + '">Book again</a></span>' +
        '</li>';
      }).join('') + '</ul></section>';
    }).join('') : '<div class="empty"><i data-lucide="route"></i><h3>No rides yet</h3><p>Book your first electric ride and it will show up here.</p><a class="btn btn--primary" href="ride.html">Book a ride</a></div>';
    finish();
  }
  $('gate-login').addEventListener('click', function () { if (window.Layout) window.Layout.login({ onDone: render }); });
  document.addEventListener('kinetix:profile', render);
  render();
})();
