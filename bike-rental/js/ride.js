// EV bike-taxi ride logic. Pure functions are Node-safe (global.window = {} is enough).
// No map: the fare comes from the road distance between two known Bhimavaram places.
(function (global) {
  var RATES = { base: 20, perKm: 6, min: 25, autoBase: 30, autoPerKm: 12, co2PerKm: 70 }; // rupees; CO2 in grams vs a petrol bike
  var ROAD_FACTOR = 1.3, SPEED_KMH = 22;
  var HOURS = { open: 5 * 60 + 30, close: 23 * 60 + 30 }; // minutes from midnight
  var MIN_LEAD = 15, MAX_DAYS = 7;
  var PARAM_KEYS = ["pickup", "drop", "when", "at", "name", "phone", "by", "ref"]; // by = who booked, when ride for someone else
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function toLocal(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function parseLocal(s) {
    if (!s || typeof s !== "string") return null;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    return isNaN(d.getTime()) ? null : d;
  }
  function fmtTime(d) { var h = d.getHours(); return ((h % 12) || 12) + ":" + pad(d.getMinutes()) + (h < 12 ? " am" : " pm"); }
  function fmtDay(d) { return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()]; }
  function formatTime(d) { return d ? fmtTime(d) : ""; }
  function formatWhen(s) { var d = parseLocal(s); return d ? fmtDay(d) + ", " + fmtTime(d) : ""; }
  function formatINR(n) {
    n = Math.round(+n || 0);
    var s = String(Math.abs(n));
    if (s.length > 3) s = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + s.slice(-3);
    return (n < 0 ? "-" : "") + "₹" + s;
  }

  function places() { return global.KINETIX_PLACES || []; }
  // Exact name first, then a unique prefix, then a unique substring
  function find(name) {
    var raw = String(name || "").trim(), pin = raw.match(/^(.*?)\s*\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)$/); // "Map pin near X (16.54, 81.52)"
    if (pin) return { id: "pin", name: pin[1] || "Map pin", lat: +pin[2], lng: +pin[3], kind: "Map pin" };
    var q = raw.toLowerCase();
    if (!q) return null;
    var exact = null, pre = [], has = [];
    places().forEach(function (p) {
      var n = p.name.toLowerCase();
      if (n === q) exact = p; else if (n.indexOf(q) === 0) pre.push(p); else if (n.indexOf(q) !== -1) has.push(p);
    });
    return exact || (pre.length === 1 ? pre[0] : null) || (has.length === 1 ? has[0] : null);
  }
  function distanceKm(a, b) { // haversine × road factor, floor 0.5 km, one decimal
    if (!a || !b) return 0;
    var R = 6371, rad = function (x) { return x * Math.PI / 180; };
    var dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var km = 2 * R * Math.asin(Math.sqrt(h)) * ROAD_FACTOR;
    return Math.max(0.5, Math.round(km * 10) / 10);
  }
  function fare(km) {
    var f = Math.max(RATES.min, Math.round(RATES.base + RATES.perKm * km));
    var auto = Math.round(RATES.autoBase + RATES.autoPerKm * km);
    return {
      km: km, base: RATES.base, perKm: RATES.perKm, distanceCharge: Math.round(RATES.perKm * km),
      fare: f, auto: auto, saving: Math.max(0, auto - f), co2: Math.round(RATES.co2PerKm * km),
      rideMin: Math.max(3, Math.round(km / SPEED_KMH * 60))
    };
  }

  function normalize(state) {
    var s = state || {}, later = s.when === "later";
    return {
      pickup: String(s.pickup || "").trim(), drop: String(s.drop || "").trim(),
      when: later ? "later" : "now", at: later ? String(s.at || "") : "",
      name: String(s.name || "").trim(), phone: String(s.phone || "").trim(), by: String(s.by || "").trim()
    };
  }
  // Fare estimate for a state, or null until both places are known and different
  function estimate(state) {
    var s = normalize(state), a = find(s.pickup), b = find(s.drop);
    if (!a || !b || a.id === b.id) return null;
    var q = fare(distanceKm(a, b));
    q.from = a; q.to = b;
    return q;
  }
  function withinHours(d) { var m = d.getHours() * 60 + d.getMinutes(); return m >= HOURS.open && m <= HOURS.close; }
  function validPhone(p) { return /^(\+91)?[6-9]\d{9}$/.test(String(p).replace(/[\s-]/g, "")); }
  function validate(state, now) {
    now = now || new Date();
    var s = normalize(state), e = {}, a = find(s.pickup), b = find(s.drop);
    if (!s.pickup) e.pickup = "Enter a pickup point.";
    else if (!a) e.pickup = "Pick a place from the list.";
    if (!s.drop) e.drop = "Enter a drop point.";
    else if (!b) e.drop = "Pick a place from the list.";
    else if (a && a.id === b.id) e.drop = "Drop must be different from pickup.";
    if (s.when === "later") {
      var d = parseLocal(s.at);
      if (!s.at) e.at = "Pick a date and time.";
      else if (!d) e.at = "Enter a valid date and time.";
      else if (d.getTime() < now.getTime() + MIN_LEAD * 60000) e.at = "Schedule at least 15 minutes ahead.";
      else if (d.getTime() > now.getTime() + MAX_DAYS * 864e5) e.at = "We take rides up to 7 days ahead.";
      else if (!withinHours(d)) e.at = "Rides run 5:30 am to 11:30 pm.";
    } else if (!withinHours(now)) e.when = "Rides run 5:30 am to 11:30 pm. Schedule one for later.";
    return { ok: Object.keys(e).length === 0, errors: e };
  }
  // Default "later" slot: an hour ahead, rounded up to a quarter hour, inside riding hours
  function defaultAt(now) {
    var d = new Date((now || new Date()).getTime() + 60 * 60000);
    d.setSeconds(0, 0);
    var m = d.getMinutes();
    d.setMinutes(m % 15 === 0 ? m : m + (15 - m % 15));
    if (!withinHours(d)) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (d.getHours() >= 12 ? 1 : 0), 6, 0);
    return toLocal(d);
  }
  function minAt(now) { return toLocal(new Date((now || new Date()).getTime() + MIN_LEAD * 60000)); }

  // Mock captain, derived from the reference so a reload shows the same person
  var CAPTAINS = [["Suresh Kumar", "98481 23456"], ["Ravi Teja", "97011 45678"], ["Naga Lakshmi", "99493 78901"], ["Prasad Varma", "96180 23457"],
  ["Anil Raju", "98665 34578"], ["Srinivas Rao", "94410 56789"], ["Bhavani Devi", "97046 67890"], ["Kiran Babu", "99599 89012"]];
  var VEHICLES = ["Ola S1 Pro", "Ather 450X", "TVS iQube", "Bajaj Chetak"];
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function captain(ref) {
    var h = hash(String(ref || "")), L = "ABCDEFGHJKLMNPQRSTUVWXYZ", c = CAPTAINS[h % CAPTAINS.length];
    return {
      name: c[0], first: c[0].split(" ")[0], phone: "+91 " + c[1], vehicle: VEHICLES[(h >>> 3) % VEHICLES.length],
      plate: "AP 37 " + L[(h >>> 5) % L.length] + L[(h >>> 10) % L.length] + " " + (1000 + (h >>> 4) % 9000),
      otp: String(1000 + (h >>> 7) % 9000), eta: 3 + (h % 4), rating: (4.6 + (h % 4) / 10).toFixed(1), rides: 300 + (h % 1500)
    };
  }

  // Status log, courier style. `at` = demo seconds after the request; a real app pushes these events.
  var STEPS = [
    { key: "requested", title: "Ride requested", at: 0 },
    { key: "assigned", title: "Captain assigned", at: 6 },
    { key: "onway", title: "Captain on the way", at: 12 },
    { key: "arrived", title: "Captain at pickup", at: 24 },
    { key: "started", title: "Ride started", at: 32 },
    { key: "done", title: "Ride completed", at: 46 }
  ];
  function timeline(state, opts) {
    var s = normalize(state), o = opts || {}, q = o.quote || estimate(s), c = o.captain || captain(o.ref);
    var later = s.when === "later", startedAt = +o.startedAt || 0, now = o.now ? +o.now : Date.now();
    var elapsed = later || !startedAt ? -1 : (now - startedAt) / 1000;
    var pickup = q ? q.from.name : s.pickup, drop = q ? q.to.name : s.drop;
    var details = {
      requested: later ? "Scheduled for " + formatWhen(s.at) + ". A captain is assigned about 10 minutes before pickup." : "",
      assigned: c.name + " · " + c.vehicle + " · " + c.plate,
      onway: "Arriving at " + pickup + " in about " + c.eta + " min.",
      arrived: "At " + pickup + ". Share OTP " + c.otp + " with " + c.first + " to start.",
      started: "On the way to " + drop + (q ? ", about " + q.rideMin + " min." : "."),
      done: "Reached " + drop + ". Pay " + (q ? formatINR(q.fare) : "the fare") + " by UPI or cash."
    };
    return STEPS.map(function (st, i) {
      var next = STEPS[i + 1], state = "pending";
      if (later) state = i === 0 ? "done" : "pending";
      else if (elapsed >= st.at) state = !next || elapsed >= next.at ? "done" : "active";
      if (!later && i === 0 && elapsed >= 0) state = next && elapsed >= next.at ? "done" : "active";
      return {
        key: st.key, title: st.title, at: st.at, state: state,
        detail: state === "pending" ? "" : details[st.key],
        time: later ? (i === 0 && startedAt ? new Date(startedAt) : null) : (state === "pending" ? null : new Date(startedAt + st.at * 1000))
      };
    });
  }
  function nextChange(startedAt, now) { // seconds until the next step flips, or null when done
    var elapsed = ((now ? +now : Date.now()) - startedAt) / 1000;
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].at > elapsed) return STEPS[i].at - elapsed;
    return null;
  }
  function stage(startedAt, now) { // key of the current step
    var elapsed = ((now ? +now : Date.now()) - startedAt) / 1000, k = STEPS[0].key;
    STEPS.forEach(function (st) { if (elapsed >= st.at) k = st.key; });
    return k;
  }

  function dec(s) { try { return decodeURIComponent(s.replace(/\+/g, " ")); } catch (e) { return ""; } }
  function readParams(search) {
    var q = search === undefined ? ((global.location && global.location.search) || "") : search, out = {};
    String(q).replace(/^\?/, "").split("&").forEach(function (p) {
      if (!p) return;
      var kv = p.split("="), k = dec(kv[0]);
      if (PARAM_KEYS.indexOf(k) !== -1) out[k] = dec(kv[1] || "");
    });
    return out;
  }
  function writeParams(obj) {
    var o = obj || {}, pairs = [];
    PARAM_KEYS.forEach(function (k) { if (o[k] !== undefined && o[k] !== null && o[k] !== "") pairs.push(encodeURIComponent(k) + "=" + encodeURIComponent(o[k])); });
    return pairs.length ? "?" + pairs.join("&") : "";
  }
  function buildUrl(page, obj) { return page + writeParams(obj); }
  function replaceUrl(obj) {
    if (global.history && global.history.replaceState && global.location) global.history.replaceState(null, "", global.location.pathname + writeParams(obj) + global.location.hash);
  }
  function makeRef() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "KR-";
    for (var i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  /* Rider history, kept on this device. Status comes from the ride record the tracking page keeps. */
  var HISTORY = "kinetix-rider-rides";
  function store() { try { return global.localStorage || null; } catch (e) { return null; } }
  function readJSON(k, fb) { var st = store(); if (!st) return fb; try { return JSON.parse(st.getItem(k) || "null") || fb; } catch (e) { return fb; } }
  function writeJSON(k, v) { var st = store(); if (st) { try { st.setItem(k, JSON.stringify(v)); } catch (e) {} } }
  function rides() { return readJSON(HISTORY, []); }
  function remember(rec) { // called when a ride is requested
    var list = rides().filter(function (r) { return r.ref !== rec.ref; });
    list.unshift(rec); writeJSON(HISTORY, list.slice(0, 50));
  }
  function rideStatus(rec, now) { // "scheduled" | "cancelled" | "done" | "live"
    var r = readJSON("kinetix-ride-" + rec.ref, null);
    if (r && r.cancelled) return "cancelled";
    if (rec.when === "later") return "scheduled";
    if (!r) return "live";
    return stage(r.startedAt, now) === "done" ? "done" : "live";
  }
  function seedRides(phone, now) { // a first visit gets three finished rides so the page is not empty
    if (readJSON(HISTORY, null) || !phone) return;
    now = now || Date.now();
    var list = places(); if (list.length < 2) return;
    var h = hash(String(phone)), out = [];
    [[1, 8 * 60 + 40], [2, 18 * 60 + 5], [4, 9 * 60 + 15]].forEach(function (sl, i) {
      var k = hash(phone + i), a = list[(k * 7 + i) % list.length], b = list[(k * 31 + 17) % list.length];
      if (a.id === b.id) b = list[(k % list.length + 3) % list.length];
      var q = estimate({ pickup: a.name, drop: b.name }), d = new Date(now), at = new Date(d.getFullYear(), d.getMonth(), d.getDate() - sl[0], 0, sl[1]).getTime();
      var ref = "KR-" + ("000000" + ((h + i * 7919) % 1679616).toString(36).toUpperCase()).slice(-6);
      out.push({ ref: ref, pickup: a.name, drop: b.name, when: "now", at: "", km: q.km, fare: q.fare, co2: q.co2, saving: q.saving, createdAt: at });
      writeJSON("kinetix-ride-" + ref, { startedAt: at, cancelled: false }); // long finished
    });
    writeJSON(HISTORY, out);
  }

  global.Ride = {
    rides: rides, remember: remember, rideStatus: rideStatus, seedRides: seedRides,
    RATES: RATES, find: find, estimate: estimate,
    normalize: normalize, validate: validate, defaultAt: defaultAt, minAt: minAt,
    captain: captain, timeline: timeline, nextChange: nextChange, stage: stage,
    readParams: readParams, writeParams: writeParams, buildUrl: buildUrl, replaceUrl: replaceUrl, makeRef: makeRef,
    formatINR: formatINR, formatWhen: formatWhen, formatTime: formatTime
  };
})(typeof window !== "undefined" ? window : this);
