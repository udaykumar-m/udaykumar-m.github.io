// Ride page: pickup/drop form, now-or-later, live fare card; first ride logs in via the shared dialog, then off to tracking
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var R = window.Ride, P = window.Profile;
  var FIELDS = ['pickup', 'drop', 'when', 'at'];
  var $ = function (id) { return document.getElementById(id); };

  var form = $('ride-form'), inputs = { pickup: $('r-pickup'), drop: $('r-drop'), at: $('r-at'), oname: $('r-oname'), ophone: $('r-ophone') };
  var other = $('ride-other'), forOther = false;
  var whenBtns = form.querySelectorAll('[data-when]'), fieldAt = $('field-at'), submit = $('r-submit');
  var state = R.normalize(R.readParams());

  function read() { return R.normalize({ pickup: inputs.pickup.value, drop: inputs.drop.value, when: state.when, at: inputs.at.value }); }
  function setError(scope, k, msg) {
    var f = scope.querySelector('.field[data-field="' + k + '"]'), input = f.querySelector('.input');
    f.classList.toggle('has-error', !!msg);
    f.querySelector('.field__error').textContent = msg || '';
    if (input) { if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  }
  function refreshIcons() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } }); }
  function setWhen(when) {
    state.when = when === 'later' ? 'later' : 'now';
    var later = state.when === 'later';
    for (var i = 0; i < whenBtns.length; i++) whenBtns[i].setAttribute('aria-pressed', String(whenBtns[i].getAttribute('data-when') === state.when));
    fieldAt.hidden = !later;
    if (later && !inputs.at.value) inputs.at.value = R.defaultAt();
    inputs.at.min = R.minAt();
    submit.innerHTML = (later ? 'Schedule ride' : 'Request ride') + ' <i data-lucide="arrow-right"></i>';
    setError(form, 'when', '');
    refreshIcons();
  }

  function updateFare() {
    var s = read(), q = R.estimate(s);
    $('fare-empty').hidden = !!q;
    $('fare-body').hidden = !q;
    if (!q) return;
    $('fare-total').textContent = R.formatINR(q.fare);
    $('fare-route').textContent = q.from.name + ' → ' + q.to.name;
    $('fare-km').textContent = q.km + ' km';
    $('fare-min').textContent = 'about ' + q.rideMin + ' min';
    $('fare-base').textContent = R.formatINR(q.base);
    $('fare-dist-label').textContent = q.km + ' km × ' + R.formatINR(q.perKm);
    $('fare-dist').textContent = R.formatINR(q.distanceCharge);
    $('fare-sum').textContent = R.formatINR(q.fare);
  }
  function syncUrl() { R.replaceUrl(read()); }

  // Who is riding: the logged-in rider by default, or someone they book for
  function showRider() {
    var p = P.get();
    $('ride-as').hidden = !p;
    if (p) $('ride-as-name').textContent = p.name + ' · ' + p.phone;
    if (!p) setOther(false);
  }
  function setOther(on) {
    forOther = on;
    other.hidden = !on;
    $('ride-as').hidden = on || !P.get();
    if (on) inputs.oname.focus();
  }
  function go(profile) {
    var s = read();
    if (forOther) { s.name = inputs.oname.value.trim(); s.phone = P.formatPhone(inputs.ophone.value); s.by = profile.name; }
    else { s.name = profile.name; s.phone = profile.phone; }
    s.ref = R.makeRef();
    search(s, R.buildUrl('track.html', s));
  }

  // Matching: a progress bar with status lines, then the tracking page (captain already assigned there).
  // The popup cannot be dismissed while searching; it ends by cancelling, failing or moving on.
  var sm = $('search-modal'), cm = $('cancel-modal'), smTimer = null, searching = false, current = null;
  function stopSearch() { clearInterval(smTimer); smTimer = null; searching = false; }
  function search(s, url) {
    var later = s.when === 'later', q = R.estimate(s), start = Date.now();
    var total = later ? 4000 : 20000;
    var lines = later
      ? [[0, 'Scheduling your ride…'], [2, 'Reserving a captain for ' + R.formatWhen(s.at) + '…']]
      : [[0, 'Sending your request to captains near ' + (q ? q.from.name : s.pickup) + '…'], [5, '3 captains within 2 km. Checking who is closest…'], [11, 'A captain is responding…'], [16, 'Confirming your ride…']];
    current = { s: s, url: url, q: q };
    $('sm-title').textContent = later ? 'Scheduling your ride' : 'Finding your captain';
    $('sm-route').textContent = q ? q.from.name + ' → ' + q.to.name + ' · ' + R.formatINR(q.fare) : '';
    $('sm-searching').hidden = false; $('sm-failed').hidden = true;
    var bar = $('sm-bar'), fill = bar.querySelector('.progress__fill'), status = $('sm-status');
    function tick() {
      var el = Date.now() - start, pct = Math.min(100, Math.round(el / total * 100)), line = lines[0][1];
      lines.forEach(function (l) { if (el >= l[0] * 1000) line = l[1]; });
      fill.style.width = pct + '%'; bar.setAttribute('aria-valuenow', pct);
      if (status.textContent !== line) status.textContent = line;
      if (el < total) return;
      stopSearch();
      if (!later) { try { localStorage.setItem('kinetix-ride-' + s.ref, JSON.stringify({ startedAt: Date.now() - 6000, cancelled: false })); } catch (e) {} } // land on "Captain assigned"
      R.remember({ ref: s.ref, pickup: q ? q.from.name : s.pickup, drop: q ? q.to.name : s.drop, when: s.when, at: s.at, km: q ? q.km : 0, fare: q ? q.fare : 0, co2: q ? q.co2 : 0, saving: q ? q.saving : 0, name: s.name, phone: s.phone, by: s.by || '', createdAt: Date.now(), url: url });
      window.location.href = url;
    }
    fill.style.width = '0%'; status.textContent = lines[0][1];
    searching = true;
    if (!sm.open) sm.showModal();
    sm.querySelector('.modal__card').focus();
    tick(); smTimer = setInterval(tick, 100);
  }
  function showFailed() {
    stopSearch();
    $('sm-failed-text').textContent = 'All captains near ' + (current && current.q ? current.q.from.name : 'your pickup') + ' are on rides right now. Please try again in a few minutes. Nothing has been charged.';
    $('sm-searching').hidden = true; $('sm-failed').hidden = false;
    refreshIcons();
    sm.querySelector('.modal__card').focus();
  }
  // Locked while searching: Escape / back button / outside taps do nothing until the request ends
  sm.addEventListener('cancel', function (e) { if (searching) e.preventDefault(); });
  sm.addEventListener('close', function () { if (searching) setTimeout(function () { sm.showModal(); }, 0); });
  sm.addEventListener('click', function (e) { if (!searching && e.target === sm) sm.close(); });
  $('sm-cancel').addEventListener('click', function () { cm.showModal(); cm.querySelector('.modal__card').focus(); });
  $('sm-dev').addEventListener('click', showFailed);
  $('sm-retry').addEventListener('click', function () { if (current) search(current.s, current.url); });
  $('sm-close').addEventListener('click', function () { sm.close(); });
  $('sm-dismiss').addEventListener('click', function () { sm.close(); });
  // Cancel confirmation: dismissable any way, only "Cancel ride" ends the request
  cm.addEventListener('click', function (e) { if (e.target === cm) cm.close(); });
  cm.querySelector('[data-close]').addEventListener('click', function () { cm.close(); });
  $('cm-confirm').addEventListener('click', function () { stopSearch(); cm.close(); sm.close(); });

  // Prefill from the home card, then show whatever fare that already gives
  inputs.pickup.value = state.pickup; inputs.drop.value = state.drop; inputs.at.value = state.at;
  setWhen(state.when);
  updateFare();
  showRider();

  form.addEventListener('input', function (e) {
    var f = e.target.closest('.field');
    if (f && f.classList.contains('has-error')) setError(form, f.getAttribute('data-field'), '');
    updateFare();
    syncUrl();
  });
  for (var i = 0; i < whenBtns.length; i++) {
    whenBtns[i].addEventListener('click', function () { setWhen(this.getAttribute('data-when')); syncUrl(); });
  }
  $('r-swap').addEventListener('click', function () {
    var a = inputs.pickup.value; inputs.pickup.value = inputs.drop.value; inputs.drop.value = a;
    setError(form, 'pickup', ''); setError(form, 'drop', '');
    updateFare(); syncUrl();
  });
  $('ride-for-other').addEventListener('click', function () { setOther(true); });
  $('ride-for-me').addEventListener('click', function () { setOther(false); });
  document.addEventListener('kinetix:profile', showRider);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = R.validate(read()), first = null;
    FIELDS.forEach(function (k) {
      setError(form, k, v.errors[k]);
      if (v.errors[k] && !first) first = inputs[k] || whenBtns[0];
    });
    if (forOther) { // the passenger's details, checked with the same rules as a profile
      var o = P.validate({ name: inputs.oname.value, phone: inputs.ophone.value });
      setError(form, 'oname', o.errors.name); setError(form, 'ophone', o.errors.phone);
      if (!first && o.errors.name) first = inputs.oname; if (!first && o.errors.phone) first = inputs.ophone;
    }
    if (first) { first.focus(); return; }
    var p = P.get();
    if (p) { go(p); return; }
    // first ride on this device: log in (mobile + code, name if new), then continue
    window.Layout.login({
      reason: 'Log in once and we\'ll ' + (state.when === 'later' ? 'schedule' : 'request') + ' your ride right after.',
      createLabel: state.when === 'later' ? 'Create profile and schedule ride' : 'Create profile and request ride',
      onDone: go
    });
  });

  refreshIcons();
  if (window.Reveal) window.Reveal.refresh();
})();
