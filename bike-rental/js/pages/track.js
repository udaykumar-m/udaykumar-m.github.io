// Ride status page: a courier-style log that advances on demo timers; survives reloads via localStorage
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var R = window.Ride, root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function icons() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } }); }
  function finish() { icons(); if (window.Reveal) window.Reveal.refresh(); }

  var p = R.readParams(), s = R.normalize(p), q = R.estimate(s);
  var ref = /^KR-[A-Z0-9]{6}$/i.test(p.ref || '') ? p.ref.toUpperCase() : null;
  if (!ref || !q) { $('missing').hidden = false; finish(); return; }

  var later = s.when === 'later', KEY = 'kinetix-ride-' + ref;
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* private mode: the log restarts on reload */ } }
  var rec = load() || { startedAt: Date.now(), cancelled: false };
  if (!load()) save(rec);
  rec.rematches = rec.rematches || []; // captain cancellations before pickup: the ride is matched again
  function captainNow() { return R.captain(ref + (rec.rematches.length ? '-' + rec.rematches.length : '')); }
  var cap = captainNow();
  // Screenshot helper: ?t=<seconds> freezes the log at that point
  var shotT = root.hasAttribute('data-shot') ? (location.search.match(/[?&]t=(\d+)/) || [])[1] : null;
  if (shotT) rec.startedAt = Date.now() - shotT * 1000;

  var ICON = { requested: 'radar', assigned: 'user-check', onway: 'navigation', arrived: 'map-pin', started: 'bike', done: 'flag', cancelled: 'x', recancel: 'user-x', busy: 'clock' };
  var HEAD = {
    requested: ['Ride requested', 'Finding you a captain…'],
    assigned: ['Captain assigned', cap.first + ' is your captain'],
    onway: ['On the way', 'Captain on the way'],
    arrived: ['At pickup', 'Your captain is here'],
    started: ['Riding', 'Ride in progress'],
    done: ['Completed', 'Ride completed'],
    scheduled: ['Ride scheduled', 'See you at ' + R.formatWhen(s.at)],
    cancelled: ['Cancelled', 'Ride cancelled']
  };

  // Static parts
  document.title = 'Ride ' + ref + ' — Kinetix';
  $('track-ref').textContent = ref;
  $('track-lead').textContent = q.from.name + ' → ' + q.to.name + ' · ' + q.km + ' km · ' + R.formatINR(q.fare);
  $('f-base').textContent = R.formatINR(q.base);
  $('f-dist-label').textContent = q.km + ' km × ' + R.formatINR(q.perKm);
  $('f-dist').textContent = R.formatINR(q.distanceCharge);
  $('f-total').textContent = R.formatINR(q.fare);
  $('f-eco').textContent = 'Electric ride: ' + q.co2 + ' g CO₂ avoided.';
  $('f-rider').textContent = s.name ? 'Rider: ' + s.name + (s.phone ? ' · ' + s.phone : '') + (s.by ? ' · booked by ' + s.by : '') : '';
  function fillCaptain() {
    cap = captainNow();
    HEAD.assigned[1] = cap.first + ' is your captain';
    $('cap-name').textContent = cap.name;
    $('cap-meta').textContent = cap.rating + ' ★ · ' + cap.rides + ' rides';
    $('cap-vehicle').textContent = cap.vehicle;
    $('cap-plate').textContent = cap.plate;
    $('cap-otp').textContent = cap.otp;
    $('cap-phone').textContent = cap.phone;
    $('cap-call').href = 'tel:' + cap.phone.replace(/\s/g, '');
  }

  function stepHtml(st) {
    return '<li class="tl-step is-' + st.state + (st.key === 'recancel' ? ' is-warn' : '') + '">' +
      '<span class="tl-step__dot"><i data-lucide="' + (st.state === 'done' && st.key !== 'cancelled' && st.key !== 'recancel' ? 'check' : ICON[st.key]) + '"></i></span>' +
      '<div class="tl-step__body"><div class="tl-step__head"><span class="tl-step__title">' + esc(st.title) + '</span>' +
        (st.time ? '<time class="tl-step__time">' + R.formatTime(st.time) + '</time>' : '') + '</div>' +
        (st.detail ? '<p class="tl-step__detail">' + esc(st.detail) + '</p>' : '') + '</div></li>';
  }

  var BUSY_MS = 20000; // demo wait while the captain drops off a previous rider
  function clock(now) { // the log stands still during the busy window, then carries on
    var b = rec.busy; if (!b) return now;
    return now < b.until ? b.at : now - (b.until - b.at);
  }
  function render() {
    var now = Date.now(), now2 = clock(now);
    fillCaptain();
    var steps = R.timeline(s, { startedAt: rec.startedAt, ref: ref, quote: q, captain: cap, now: now2 });
    var stage = later ? 'scheduled' : R.stage(rec.startedAt, now2);
    if (rec.busy) { // insert the wait after the step it happened on; later times shift by the wait
      var b = rec.busy, shift = b.until - b.at, idx = -1;
      steps.forEach(function (st, i) { if (st.time && +st.time > b.at - 1) st.time = new Date(+st.time + shift); if (st.key === b.after) idx = i; });
      steps.splice(idx + 1, 0, { key: 'busy', title: 'Captain finishing another ride', state: now < b.until ? 'active' : 'done', time: new Date(b.at),
        detail: cap.first + ' is dropping off a rider nearby and will reach you after that, in about ' + (cap.eta + 6) + ' min.' });
    }
    if (rec.rematches.length) { // earlier attempts stay in the log, then the search starts again
      var prefix = [];
      rec.rematches.forEach(function (m, i) {
        var prev = R.captain(ref + (i ? '-' + i : ''));
        prefix.push({ key: 'requested', title: i ? 'Finding another captain' : 'Ride requested', state: 'done', time: new Date(m.requestedAt), detail: '' });
        prefix.push({ key: 'assigned', title: 'Captain assigned', state: 'done', time: new Date(m.requestedAt + 6000), detail: prev.name + ' · ' + prev.vehicle + ' · ' + prev.plate });
        prefix.push({ key: 'recancel', title: 'Captain cancelled', state: 'done', time: new Date(m.at), detail: prev.first + ' had to cancel. We\'re finding you another captain. No charge.' });
      });
      steps[0].title = 'Finding another captain';
      steps = prefix.concat(steps);
    }
    if (rec.cancelled) {
      stage = 'cancelled';
      steps = steps.filter(function (st) { return st.state !== 'pending' && st.time && +st.time <= rec.cancelledAt; })
        .map(function (st) { st.state = 'done'; return st; });
      steps.push({ key: 'cancelled', title: 'Ride cancelled', state: 'done', time: new Date(rec.cancelledAt), detail: (rec.cancelReason ? 'Reason: ' + rec.cancelReason + '. ' : '') + 'No charge. Book again whenever you\'re ready.' });
    }
    var live = stage !== 'done' && stage !== 'cancelled' && stage !== 'scheduled';
    $('timeline').innerHTML = steps.map(stepHtml).join('');

    var h = stage === 'requested' && rec.rematches.length ? ['Re-matching', 'Finding you another captain…'] :
      rec.busy && now < rec.busy.until ? ['On another ride', cap.first + ' will reach you in about ' + (cap.eta + 6) + ' min'] : HEAD[stage];
    $('track-eyebrow').textContent = h[0];
    $('track-title').textContent = h[1];
    $('dev-recancel-wrap').hidden = !(stage === 'assigned' || stage === 'onway' || stage === 'arrived') || rec.cancelled;
    $('dev-busy').hidden = !!rec.busy || !(stage === 'assigned' || stage === 'onway');

    $('timeline-live').hidden = !live;
    var note = $('timeline-note');
    note.hidden = !(later || stage === 'done');
    note.textContent = later ? 'Updates appear here from 10 minutes before pickup. We\'ll also text ' + (s.phone || 'you') + '.' :
      'Thanks for riding electric. You avoided ' + q.co2 + ' g of CO₂ on this trip.';

    var showCap = !later && !rec.cancelled && stage !== 'requested';
    $('captain-card').hidden = !showCap;
    var started = stage === 'started' || stage === 'done';
    $('otp-box').hidden = started;
    $('otp-done').hidden = !started;
    $('cap-call').hidden = stage === 'done';
    $('f-note').textContent = stage === 'done' ? 'Paid by UPI or cash to your captain.' : 'Pay by UPI or cash when the ride ends.';

    $('btn-cancel').hidden = started || rec.cancelled;
    $('btn-again').hidden = !(stage === 'done' || rec.cancelled);
    $('btn-share').hidden = rec.cancelled;
    icons();
  }

  var tickTimer = null;
  function tick() {
    clearTimeout(tickTimer); tickTimer = null;
    if (later || rec.cancelled || shotT) return;
    var now = Date.now(), n = R.nextChange(rec.startedAt, clock(now));
    if (n === null) return;
    if (rec.busy && now < rec.busy.until) n += (rec.busy.until - now) / 1000; // nothing moves until the captain is free
    tickTimer = setTimeout(function () { render(); tick(); }, n * 1000 + 50);
  }
  $('dev-busy').addEventListener('click', function () {
    var now = Date.now(), stage = R.stage(rec.startedAt, clock(now));
    rec.busy = { at: now, until: now + BUSY_MS, after: stage }; save(rec);
    render(); tick();
  });
  // Development hook: the captain backs out before pickup and the ride is matched again
  $('dev-recancel').addEventListener('click', function () {
    rec.rematches.push({ at: Date.now(), requestedAt: rec.startedAt });
    rec.startedAt = Date.now(); rec.busy = null; save(rec);
    render(); tick();
  });

  // Cancel: a dismissable confirmation (outside tap, X, Escape or back button keeps the ride)
  var cm = $('cancel-modal'), cmReasons = $('cm-reasons'), cmOther = $('cm-other');
  function chosenReason() {
    var r = cm.querySelector('input[name="cm-reason"]:checked');
    if (!r) return '';
    return r.value === 'Other' ? (cmOther.value.trim() || 'Other') : r.value;
  }
  function syncCancelBtn() {
    var needs = !cmReasons.hidden;
    $('cm-confirm').disabled = needs && !cm.querySelector('input[name="cm-reason"]:checked');
    cmOther.hidden = !(cm.querySelector('input[name="cm-reason"]:checked') || {}).value || cm.querySelector('input[name="cm-reason"]:checked').value !== 'Other';
  }
  $('btn-cancel').addEventListener('click', function () {
    var stage = later ? 'scheduled' : R.stage(rec.startedAt, clock(Date.now()));
    var assigned = stage === 'assigned' || stage === 'onway' || stage === 'arrived'; // a captain is already on it: ask why
    cmReasons.hidden = !assigned;
    $('cm-text').textContent = assigned ? 'Your captain has already accepted. Tell us why so we can match you better next time. No charge.' : 'Are you sure you want to cancel? There is no charge before the ride starts.';
    cm.querySelectorAll('input[name="cm-reason"]').forEach(function (i) { i.checked = false; }); cmOther.value = '';
    syncCancelBtn();
    cm.showModal(); cm.querySelector('.modal__card').focus();
  });
  cm.addEventListener('change', syncCancelBtn);
  cm.addEventListener('click', function (e) { if (e.target === cm) cm.close(); });
  cm.querySelector('[data-close]').addEventListener('click', function () { cm.close(); });
  $('cm-confirm').addEventListener('click', function () {
    cm.close();
    rec.cancelled = true; rec.cancelledAt = Date.now(); rec.cancelReason = chosenReason(); save(rec);
    render();
  });

  // Share: native sheet where available, otherwise copy the link
  var share = $('btn-share'), shareLabel = $('share-label'), shareTimer;
  share.addEventListener('click', function () {
    var data = { title: 'My Kinetix ride ' + ref, text: q.from.name + ' to ' + q.to.name + ' with ' + cap.name + ' (' + cap.plate + ')', url: location.href };
    var done = function () {
      shareLabel.textContent = 'Link copied';
      clearTimeout(shareTimer); shareTimer = setTimeout(function () { shareLabel.textContent = 'Share ride'; }, 1600);
    };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    try { navigator.clipboard.writeText(location.href).then(done, function () { window.prompt('Copy this link', location.href); }); }
    catch (e) { window.prompt('Copy this link', location.href); }
  });

  $('track').hidden = false;
  render();
  tick();
  finish();
})();
