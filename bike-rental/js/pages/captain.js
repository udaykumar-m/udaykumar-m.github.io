// Captain home: online switch, simulated request with a 20 s window, the ride in hand, today's rides
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var C = window.Captain, R = window.Ride, $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function icons() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } }); }
  function finish() { icons(); if (window.Reveal) window.Reveal.refresh(); }
  function inr(n) { return R.formatINR(n); }
  function time(ms) { var d = new Date(ms), h = d.getHours(); return ((h % 12) || 12) + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes() + (h < 12 ? ' am' : ' pm'); }

  var reqTimer = null, toastTimer = null, rating = 0;

  function gate() {
    var cap = C.current();
    $('cap-gate').hidden = !!cap; $('cap-home').hidden = !cap;
    if (!cap) { finish(); return null; }
    C.seedHistory(cap);
    return cap;
  }

  function toast(msg) {
    $('toast-text').textContent = msg; $('toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { $('toast').hidden = true; }, 3500);
  }

  function renderStatus(cap, st) {
    var h = new Date().getHours();
    $('cap-greet').textContent = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    $('cap-name').textContent = cap.name;
    $('status-pill').classList.toggle('is-on', st.online);
    $('status-pill-text').textContent = st.online ? (st.ride ? 'On a ride' : 'Online') : 'Offline';
    $('status-toggle').checked = st.online;
    $('status-title').textContent = st.online ? 'You\'re online' : 'You\'re offline';
    $('status-text').textContent = st.online ? 'Requests near you will show up here.' : 'Go online to start receiving ride requests.';
    var sum = C.summary();
    $('st-earn').textContent = inr(sum.todayEarn); $('st-rides').textContent = sum.todayRides;
    $('st-hours').textContent = C.hoursOnline(st); $('st-rating').textContent = cap.rating.toFixed(1) + ' ★';
  }

  function renderToday() {
    var list = C.rides().filter(function (r) { return new Date(r.at).toDateString() === new Date().toDateString(); }).slice(0, 6);
    $('today-list').innerHTML = list.length ? list.map(function (r) {
      return '<li class="ride-list__row' + (r.status === 'cancelled' ? ' is-cancelled' : '') + '"><span class="ride-list__time">' + time(r.at) + '</span>' +
        '<span class="ride-list__route">' + esc(r.pickup) + ' → ' + esc(r.drop) + '<small>' + (r.status === 'cancelled' ? 'Cancelled' + (r.reason ? ' · ' + esc(r.reason) : '') : r.km + ' km · ' + (r.paid === 'upi' ? 'UPI' : 'Cash')) + '</small></span>' +
        '<strong class="ride-list__amt">' + (r.status === 'cancelled' ? '—' : inr(r.share)) + '</strong></li>';
    }).join('') : '<li class="small muted">No rides yet today.</li>';
  }

  /* Request with a countdown */
  function showRequest(req) {
    $('req-pickup').textContent = req.pickup; $('req-topickup').textContent = req.toPickupKm + ' km';
    $('req-drop').textContent = req.drop; $('req-km').textContent = req.km + ' km';
    $('req-rider').textContent = req.rider; $('req-min').textContent = req.rideMin;
    $('req-fare').textContent = inr(req.fare); $('req-share').textContent = inr(req.share);
    $('request-card').hidden = false; $('wait-card').hidden = true;
    clearInterval(reqTimer);
    function tick() {
      var left = C.secondsLeft(req), pct = left / C.ACCEPT_SECONDS * 100;
      $('req-timer').textContent = left + ' s'; $('req-fill').style.width = pct + '%';
      if (left > 0) return;
      clearInterval(reqTimer); reqTimer = null;
      var st = C.state(); st.request = null; C.saveState(st);
      document.title = 'Captain — Kinetix';
      toast('Request expired. The rider was matched with another captain.');
      render();
    }
    tick(); reqTimer = setInterval(tick, 250);
    document.title = '(1) New request — Kinetix';
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('New ride request', { body: req.pickup + ' → ' + req.drop + ' · ' + inr(req.fare), tag: req.ref }); } catch (e) {}
    }
  }
  function simulate() {
    var st = C.state();
    if (!st.online || st.ride) return;
    st.request = C.makeRequest(); C.saveState(st);
    render();
  }

  /* Ride in hand */
  function renderRide(ride) {
    var stage = ride.stage, STAGES = ['accepted', 'arrived', 'started', 'ended', 'paid'];
    $('cap-steps').querySelectorAll('li').forEach(function (li) {
      var i = STAGES.indexOf(li.getAttribute('data-stage')), cur = STAGES.indexOf(stage === 'paid' ? 'ended' : stage);
      li.className = i < cur ? 'is-done' : i === cur ? 'is-active' : '';
    });
    var titles = {
      accepted: ['Head to the pickup', 'Ride to ' + ride.pickup + '. Tap when you reach the rider.'],
      arrived: ['Ask for the rider\'s code', 'Hand over the helmet, then enter the 4-digit code to start.'],
      started: ['Ride in progress', 'On the way to ' + ride.drop + ', about ' + ride.rideMin + ' min.'],
      ended: ['Collect the fare', 'The rider pays by cash or UPI after the ride.'],
      paid: ['Ride complete', 'Rate the rider and you\'re back online.']
    };
    $('ride-title').textContent = titles[stage][0]; $('ride-text').textContent = titles[stage][1];
    $('ride-rider').textContent = ride.rider; $('ride-phone').textContent = ride.riderPhone;
    $('ride-pickup').textContent = ride.pickup; $('ride-drop').textContent = ride.drop; $('ride-km').textContent = ride.km + ' km';
    ['accepted', 'arrived', 'started', 'ended', 'paid'].forEach(function (s) { $('act-' + s).hidden = s !== stage; });
    $('otp-hint').textContent = 'Demo: no rider app yet, the code is ' + ride.otp + '.';
    $('started-text').textContent = 'Riding to ' + ride.drop + '. Keep to the left, no pillion changes mid-way.';
    $('loc-start').textContent = ride.startLoc ? 'Location checked at ' + ride.pickup + ', ' + time(ride.startLoc.at) : '';
    $('loc-end').textContent = ride.endLoc ? (ride.endNote ? ride.endNote : 'Location checked at ' + ride.drop + ', ' + time(ride.endLoc.at)) : '';
    $('collect-amount').textContent = inr(ride.fare);
    $('paid-by').textContent = ride.paid === 'upi' ? 'UPI' : 'cash';
    $('ride-cancel-wrap').hidden = !(stage === 'accepted' || stage === 'arrived');
    $('ride-card').hidden = false; $('request-card').hidden = true; $('wait-card').hidden = true;
  }

  function render() {
    var cap = gate(); if (!cap) return;
    var st = C.state();
    renderStatus(cap, st);
    renderToday();
    $('ride-card').hidden = true; $('request-card').hidden = true; $('wait-card').hidden = true;
    if (st.ride) renderRide(st.ride);
    else if (st.request && C.secondsLeft(st.request) > 0) showRequest(st.request);
    else if (st.online) { $('wait-card').hidden = false; clearInterval(reqTimer); reqTimer = null; }
    finish();
  }

  /* Wiring */
  $('gate-login').addEventListener('click', function () { if (window.CaptainNav) window.CaptainNav.login(); });
  $('status-toggle').addEventListener('change', function () {
    var on = $('status-toggle').checked, st = C.state();
    if (!on && st.ride) { $('status-toggle').checked = true; toast('Finish the ride in hand before going offline.'); return; }
    if (window.CaptainNav) window.CaptainNav.setOnline(on); else { C.setOnline(on); render(); }
  });
  document.addEventListener('kinetix:captain', render);
  $('simulate').addEventListener('click', simulate);
  $('req-accept').addEventListener('click', function () { var st = C.state(); if (!st.request) return; clearInterval(reqTimer); reqTimer = null; document.title = 'Captain — Kinetix'; C.accept(st.request); render(); });
  $('req-decline').addEventListener('click', function () { var st = C.state(); st.request = null; C.saveState(st); clearInterval(reqTimer); reqTimer = null; document.title = 'Captain — Kinetix'; toast('Declined. Stay online for the next one.'); render(); });
  $('btn-arrived').addEventListener('click', function () { C.advance('arrived'); render(); $('ride-otp').focus(); });
  $('btn-start').addEventListener('click', function () {
    var st = C.state(), v = $('ride-otp').value.trim(), f = $('ride-otp').closest('.field');
    if (!st.ride) return;
    if (v !== st.ride.otp) { f.classList.add('has-error'); $('otp-error').textContent = v.length === 4 ? 'That code doesn\'t match. Ask the rider again.' : 'Enter the 4-digit code.'; $('ride-otp').focus(); return; }
    f.classList.remove('has-error'); $('otp-error').textContent = ''; $('ride-otp').value = '';
    var at = R.find(st.ride.pickup); // demo: the captain is at the pickup when the ride starts
    C.advance('started', null, { startLoc: { lat: at ? at.lat : 0, lng: at ? at.lng : 0, at: Date.now() } }); render();
  });
  $('ride-otp').addEventListener('input', function () { $('ride-otp').closest('.field').classList.remove('has-error'); });
  // End ride: the captain must be at the drop. The dev tag pretends they are 1.4 km away.
  var lm = $('loc-modal'), wrongLoc = false;
  function endRide(note, dist) {
    var st = C.state(); if (!st.ride) return;
    var at = R.find(st.ride.drop);
    C.advance('ended', null, { endLoc: { lat: at ? at.lat : 0, lng: at ? at.lng : 0, at: Date.now() }, endNote: note || '', endDistanceKm: dist || 0 });
    wrongLoc = false; render();
  }
  $('btn-end').addEventListener('click', function () {
    var st = C.state(); if (!st.ride) return;
    if (!wrongLoc) { endRide(); return; }
    $('lm-text').textContent = 'You are about 1.4 km from ' + st.ride.drop + '. The ride can only end at the rider\'s drop.';
    lm.showModal(); lm.querySelector('.modal__card').focus();
  });
  $('dev-wrongloc').addEventListener('click', function () { wrongLoc = true; toast('Simulating: you are 1.4 km away from the drop.'); });
  lm.addEventListener('click', function (e) { if (e.target === lm) lm.close(); });
  lm.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { lm.close(); }); });
  $('lm-early').addEventListener('click', function () { var st = C.state(); lm.close(); endRide('Ended 1.4 km before ' + (st.ride ? st.ride.drop : 'the drop') + ' at the rider\'s request, ' + time(Date.now()), 1.4); });
  $('btn-cash').addEventListener('click', function () { C.advance('paid', null, { paid: 'cash' }); render(); });
  $('btn-upi').addEventListener('click', function () { C.advance('paid', null, { paid: 'upi' }); render(); });
  $('stars').addEventListener('click', function (e) {
    var b = e.target.closest('[data-star]'); if (!b) return;
    rating = +b.getAttribute('data-star');
    $('stars').querySelectorAll('[data-star]').forEach(function (s) { var on = +s.getAttribute('data-star') <= rating; s.classList.toggle('is-on', on); s.setAttribute('aria-checked', String(+s.getAttribute('data-star') === rating)); });
  });
  $('btn-done').addEventListener('click', function () {
    var st = C.state(); if (!st.ride) return;
    var earned = st.ride.share;
    C.complete(rating || 5); rating = 0;
    $('stars').querySelectorAll('[data-star]').forEach(function (s) { s.classList.remove('is-on'); s.setAttribute('aria-checked', 'false'); });
    toast(inr(earned) + ' added to today\'s earnings. You\'re online for the next ride.');
    render();
  });
  var cm = $('cancel-modal'), cmOther = $('cm-other');
  function syncCancelBtn() {
    var r = cm.querySelector('input[name="cm-reason"]:checked');
    $('cm-confirm').disabled = !r; cmOther.hidden = !(r && r.value === 'Other');
  }
  $('btn-ride-cancel').addEventListener('click', function () {
    cm.querySelectorAll('input[name="cm-reason"]').forEach(function (i) { i.checked = false; }); cmOther.value = ''; syncCancelBtn();
    cm.showModal(); cm.querySelector('.modal__card').focus();
  });
  cm.addEventListener('change', syncCancelBtn);
  cm.addEventListener('click', function (e) { if (e.target === cm) cm.close(); });
  cm.querySelector('[data-close]').addEventListener('click', function () { cm.close(); });
  $('cm-confirm').addEventListener('click', function () {
    var r = cm.querySelector('input[name="cm-reason"]:checked'), reason = r ? (r.value === 'Other' ? (cmOther.value.trim() || 'Other') : r.value) : '';
    cm.close(); C.cancelRide(null, reason); toast('Ride cancelled. The rider is being re-matched.'); render();
  });

  render();
})();
