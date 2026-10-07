// Captain side: accounts, session, online state, simulated requests, the live ride and earnings.
// Everything lives in localStorage for the demo. Pure parts are Node-safe (global.window = {}).
(function (global) {
  var SHARE = 0.8; // captain keeps 80% of the fare
  var ACCEPT_SECONDS = 20, SESSION = 'kinetix-captain', STATE = 'kinetix-captain-state', RIDES = 'kinetix-captain-rides', BOOK = 'kinetix-captains';
  var RIDERS = ['Lakshmi P.', 'Ravi K.', 'Harika V.', 'Srinu B.', 'Anjali M.', 'Prasad N.', 'Divya S.', 'Kiran T.', 'Sravani G.', 'Mahesh R.'];

  function store() { try { return global.localStorage || null; } catch (e) { return null; } }
  function read(k, fallback) { var s = store(); if (!s) return fallback; try { return JSON.parse(s.getItem(k) || 'null') || fallback; } catch (e) { return fallback; } }
  function write(k, v) { var s = store(); if (s) { try { s.setItem(k, JSON.stringify(v)); } catch (e) {} } }
  function digits(p) { return String(p || '').replace(/\D/g, '').slice(-10); }
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  /* Accounts: seeded demo captains plus anyone added through the onboarding page */
  function all() {
    var seed = global.KINETIX_CAPTAINS || [], added = read(BOOK, []);
    return seed.concat(added);
  }
  function byPhone(phone) {
    var d = digits(phone), list = all();
    for (var i = 0; i < list.length; i++) if (digits(list[i].phone) === d) return list[i];
    return null;
  }
  function register(rec) {
    var book = read(BOOK, []), d = digits(rec.phone);
    book = book.filter(function (c) { return digits(c.phone) !== d; });
    var acc = { phone: d, name: String(rec.name || '').trim(), vehicle: rec.vehicle || 'Ola S1 Pro', plate: String(rec.plate || '').trim().toUpperCase(),
      rating: 5.0, rides: 0, since: new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' }), licence: String(rec.licence || '').trim(), email: String(rec.email || '').trim() };
    book.push(acc); write(BOOK, book);
    return acc;
  }
  function validateOnboarding(v) {
    var e = {}, P = global.Profile;
    if (!String(v.name || '').trim()) e.name = 'Enter the captain\'s name.';
    if (P) { var pv = P.validate({ phone: v.phone }); if (!pv.ok) e.phone = pv.errors.phone; } else if (!/^[6-9]\d{9}$/.test(digits(v.phone))) e.phone = 'Enter a valid 10-digit mobile number.';
    if (!e.phone && byPhone(v.phone)) e.phone = 'This number is already a captain.';
    if (!String(v.vehicle || '').trim()) e.vehicle = 'Pick the scooter.';
    if (!/^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/i.test(String(v.plate || '').trim())) e.plate = 'Enter the plate like AP 37 CE 4821.';
    if (String(v.licence || '').trim().length < 8) e.licence = 'Enter the driving licence number.';
    if (!v.consent) e.consent = 'Please confirm the documents are genuine.';
    return { ok: Object.keys(e).length === 0, errors: e };
  }

  /* Session */
  function current() { var s = read(SESSION, null); return s && s.phone ? byPhone(s.phone) : null; }
  function login(phone) { write(SESSION, { phone: digits(phone), since: Date.now() }); return current(); }
  function logout() { var s = store(); if (s) { try { s.removeItem(SESSION); } catch (e) {} } }

  /* Online state + the ride in hand */
  function state() { return read(STATE, { online: false, onlineSince: 0, onlineMs: 0, request: null, ride: null }); }
  function saveState(st) { write(STATE, st); return st; }
  function setOnline(on, now) {
    var st = state(); now = now || Date.now();
    if (on && !st.online) { st.online = true; st.onlineSince = now; }
    else if (!on && st.online) { st.online = false; st.onlineMs += now - st.onlineSince; st.onlineSince = 0; st.request = null; }
    return saveState(st);
  }
  function hoursOnline(st, now) { st = st || state(); now = now || Date.now(); var ms = st.onlineMs + (st.online ? now - st.onlineSince : 0); return Math.round(ms / 36e5 * 10) / 10; }

  /* Simulated request: two different places, fare from the ride engine */
  function makeRequest(now, seed) {
    var R = global.Ride, places = global.KINETIX_PLACES || [];
    if (!R || places.length < 2) return null;
    now = now || Date.now(); seed = seed === undefined ? now : seed;
    var h = hash(String(seed)), a = places[h % places.length], b = places[(h >>> 4) % places.length];
    if (a.id === b.id) b = places[(h % places.length + 1) % places.length];
    var q = R.estimate({ pickup: a.name, drop: b.name }), ref = 'KR-' + ('000000' + (h % 1679616).toString(36).toUpperCase()).slice(-6);
    return {
      ref: ref, rider: RIDERS[(h >>> 8) % RIDERS.length], riderPhone: '+91 9' + String(1000 + (h >>> 3) % 9000) + '• ••••',
      pickup: a.name, drop: b.name, km: q.km, rideMin: q.rideMin, fare: q.fare, share: Math.round(q.fare * SHARE),
      toPickupKm: Math.round((0.4 + (h % 22) / 10) * 10) / 10, otp: R.captain(ref).otp,
      at: now, expiresAt: now + ACCEPT_SECONDS * 1000
    };
  }
  function secondsLeft(req, now) { return Math.max(0, Math.ceil((req.expiresAt - (now || Date.now())) / 1000)); }

  /* Ride in hand: accepted -> arrived -> started -> paid -> (rated) done */
  function accept(req, now) {
    var st = state(); now = now || Date.now();
    st.request = null;
    st.ride = { ref: req.ref, rider: req.rider, riderPhone: req.riderPhone, pickup: req.pickup, drop: req.drop, km: req.km, rideMin: req.rideMin, fare: req.fare, share: req.share, otp: req.otp, stage: 'accepted', acceptedAt: now, log: [['accepted', now]] };
    return saveState(st);
  }
  function advance(stage, now, extra) {
    var st = state(); now = now || Date.now();
    if (!st.ride) return st;
    st.ride.stage = stage; st.ride.log.push([stage, now]);
    if (extra) for (var k in extra) st.ride[k] = extra[k];
    return saveState(st);
  }
  function complete(rating, now) { // move the ride into history
    var st = state(); now = now || Date.now();
    if (!st.ride) return st;
    var r = st.ride, rides = read(RIDES, []);
    rides.unshift({ ref: r.ref, rider: r.rider, pickup: r.pickup, drop: r.drop, km: r.km, fare: r.fare, share: r.share, paid: r.paid || 'cash', rating: rating || 0, at: now, status: 'done' });
    write(RIDES, rides);
    st.ride = null;
    return saveState(st);
  }
  function cancelRide(now, reason) {
    var st = state(); now = now || Date.now();
    if (!st.ride) return st;
    var r = st.ride, rides = read(RIDES, []);
    rides.unshift({ ref: r.ref, rider: r.rider, pickup: r.pickup, drop: r.drop, km: r.km, fare: 0, share: 0, paid: '', rating: 0, at: now, status: 'cancelled', reason: reason || '' });
    write(RIDES, rides);
    st.ride = null;
    return saveState(st);
  }

  /* History + earnings. A first visit gets a believable past so the pages are not empty. */
  function seedHistory(acc, now) {
    if (read(RIDES, null)) return;
    var R = global.Ride, places = global.KINETIX_PLACES || [];
    if (!R || !acc || places.length < 2) return;
    now = now || Date.now();
    var h = hash(acc.phone), rides = [], d = new Date(now);
    var today = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6, 0).getTime(), slots = [
      [0, 7 * 60 + 40], [0, 8 * 60 + 25], [0, 9 * 60 + 10], [0, 11 * 60 + 5], [0, 12 * 60 + 30],
      [1, 7 * 60 + 15], [1, 8 * 60 + 50], [1, 10 * 60 + 20], [1, 13 * 60], [1, 17 * 60 + 45], [1, 19 * 60 + 10],
      [2, 8 * 60], [2, 9 * 60 + 35], [2, 12 * 60 + 15], [2, 18 * 60 + 30]];
    slots.forEach(function (s, i) {
      var at = today - s[0] * 864e5 + (s[1] - 360) * 60000;
      if (at > now) return;
      var k = hash(acc.phone + i), a = places[(k * 7 + i) % places.length], b = places[(k * 31 + i * 5 + 17) % places.length]; // spread, not consecutive
      if (a.id === b.id) b = places[(k % places.length + 3) % places.length];
      var q = R.estimate({ pickup: a.name, drop: b.name });
      rides.push({ ref: 'KR-' + ('000000' + (k % 1679616).toString(36).toUpperCase()).slice(-6), rider: RIDERS[(k * 13 + i) % RIDERS.length], pickup: a.name, drop: b.name, km: q.km, fare: q.fare, share: Math.round(q.fare * SHARE), paid: ((k + i) % 3) ? 'upi' : 'cash', rating: 4 + ((k + i) % 5 === 0 ? 0 : 1), at: at, status: 'done' });
    });
    rides.sort(function (x, y) { return y.at - x.at; });
    write(RIDES, rides);
  }
  function rides() { return read(RIDES, []); }
  function summary(list, now) {
    now = now || Date.now(); list = list || rides();
    var d = new Date(now), today = ymd(d), weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 6).getTime();
    var out = { todayEarn: 0, todayRides: 0, weekEarn: 0, weekRides: 0, todayKm: 0 };
    list.forEach(function (r) {
      if (r.status !== 'done') return;
      if (ymd(new Date(r.at)) === today) { out.todayEarn += r.share; out.todayRides++; out.todayKm += r.km; }
      if (r.at >= weekStart) { out.weekEarn += r.share; out.weekRides++; }
    });
    out.todayKm = Math.round(out.todayKm * 10) / 10;
    return out;
  }

  global.Captain = {
    ACCEPT_SECONDS: ACCEPT_SECONDS,
    byPhone: byPhone, register: register, validateOnboarding: validateOnboarding,
    current: current, login: login, logout: logout,
    state: state, saveState: saveState, setOnline: setOnline, hoursOnline: hoursOnline,
    makeRequest: makeRequest, secondsLeft: secondsLeft, accept: accept, advance: advance, complete: complete, cancelRide: cancelRide,
    seedHistory: seedHistory, rides: rides, summary: summary
  };
})(typeof window !== 'undefined' ? window : this);
