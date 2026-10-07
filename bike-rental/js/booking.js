// Shared car-rental booking logic. Pure functions are Node-safe (global.window = {} is enough).
// The plan comes from the dates: pickup and drop on the same day = hourly, across days = daily.
(function (global) {
  var DEFAULT_AREAS = ["Bhimavaram Junction", "APSRTC Bus Station", "Mavullamma Temple", "SRKR Engineering College", "Vishnu Institute, Vishnupur", "Gunupudi", "Undi", "Palakoderu"];
  var RATES = { hourly: 120, daily: 1800, deposit: 2000 };
  var PARAM_KEYS = ["loc", "from", "to", "id", "ref"];
  var HOUR = 36e5, DAY = 864e5;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function hm(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function toLocal(d) { return ymd(d) + "T" + hm(d); }
  function today(now) { return ymd(now || new Date()); }
  function nextSlot(now) { // next 30-min boundary, as a Date
    var d = new Date((now || new Date()).getTime());
    d.setSeconds(0, 0);
    var m = d.getMinutes();
    d.setMinutes(m % 30 === 0 ? m : m + (30 - m % 30));
    return d;
  }
  function nowLocal(now) { return toLocal(nextSlot(now)); }
  function parseLocal(s) { // "YYYY-MM-DD", "YYYY-MM-DDTHH:MM" -> Date (local) or null
    if (!s || typeof s !== "string") return null;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    return isNaN(d.getTime()) ? null : d;
  }

  function areas() { return global.KINETIX_AREAS || DEFAULT_AREAS; }

  function normalize(state) {
    var s = state || {}, from = s.from || "", to = s.to || "";
    var f = parseLocal(from), t = parseLocal(to);
    var zone = f && t && ymd(f) !== ymd(t) ? "outside" : "city"; // city = hourly plan, outside = daily plan
    return { zone: zone, plan: zone === "city" ? "hourly" : "daily", loc: (s.loc || "").trim(), from: from, to: to };
  }

  // Duration in ms, or null when fields are missing/unparseable
  function span(state) {
    var s = normalize(state), f = parseLocal(s.from), t = parseLocal(s.to);
    if (!f || !t) return null;
    return { ms: t - f, startDate: f, endDate: t };
  }

  function validate(state, now, opts) {
    now = now || new Date();
    var s = normalize(state), e = {};
    var nb = opts && opts.notBefore ? parseLocal(opts.notBefore) : null;
    if (!s.loc) e.loc = "Enter a pickup location.";
    var f = parseLocal(s.from), t = parseLocal(s.to);
    if (!s.from) e.from = "Pick a pickup date and time.";
    else if (!f) e.from = "Enter a valid pickup date and time.";
    else if (f.getTime() < now.getTime() - 60000) e.from = "Pickup can't be in the past.";
    else if (nb && f.getTime() < nb.getTime()) e.from = "Available from " + nb.getDate() + " " + MONTHS[nb.getMonth()] + ", " + fmtTime(nb) + ". Pick a later pickup.";
    if (!s.to) e.to = "Pick a drop date and time.";
    else if (!t) e.to = "Enter a valid drop date and time.";
    else if (f && !e.from) {
      var ms = t - f;
      if (ms <= 0) e.to = "Drop must be after pickup.";
      else if (s.zone === "city" && ms < HOUR) e.to = "Minimum rental is 1 hour.";
    }
    return { ok: Object.keys(e).length === 0, errors: e };
  }

  function quote(car, state) {
    var s = normalize(state), b = car || {};
    var city = s.zone === "city";
    var rate = city ? (b.hourly || RATES.hourly) : (b.daily || RATES.daily);
    var deposit = typeof b.deposit === "number" ? b.deposit : RATES.deposit;
    var sp = span(s), units = 1, estimated = true, hours = null;
    if (sp && sp.ms > 0) {
      hours = sp.ms / HOUR;
      units = Math.max(1, Math.ceil(city ? hours : sp.ms / DAY));
      estimated = false;
    }
    var unitLabel = city ? (units === 1 ? "hr" : "hrs") : (units === 1 ? "day" : "days");
    var subtotal = rate * units;
    return {
      zone: s.zone, plan: s.plan, units: units, unitLabel: unitLabel, unitShort: city ? "hr" : "day",
      rate: rate, rateLabel: "₹" + rate + "/" + (city ? "hr" : "day"),
      subtotal: subtotal, deposit: deposit, total: subtotal + deposit,
      hours: hours, estimated: estimated,
      line: "₹" + rate + " × " + units + " " + unitLabel + " = " + formatINR(subtotal)
    };
  }

  function formatINR(n) {
    n = Math.round(+n || 0);
    var neg = n < 0, s = String(Math.abs(n));
    if (s.length > 3) {
      var last = s.slice(-3), rest = s.slice(0, -3);
      s = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last;
    }
    return (neg ? "-" : "") + "₹" + s;
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtTime(d) { var h = d.getHours(), m = d.getMinutes(); return ((h % 12) || 12) + ":" + pad(m) + (h < 12 ? " am" : " pm"); }
  function fmtDate(d) { return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function formatTime(s) { var d = parseLocal("2000-01-01T" + s); return d ? fmtTime(d) : ""; }
  function summary(state) { // human strings for cards/confirmation
    var s = normalize(state), sp = span(s), f = parseLocal(s.from), t = parseLocal(s.to);
    var out = { zoneLabel: s.zone === "city" ? "Hourly plan" : "Daily plan", plan: s.plan, when: "", times: "", duration: "", startTime: f ? fmtTime(f) : "" };
    if (s.zone === "city") {
      out.when = f ? fmtDate(f) : "";
      out.times = f && t ? fmtTime(f) + " – " + fmtTime(t) : "";
      out.duration = sp && sp.ms > 0 ? (Math.round(sp.ms / HOUR * 10) / 10) + " h" : "";
    } else {
      out.when = f ? fmtDate(f) + ", " + fmtTime(f) : "";
      out.times = t ? "to " + fmtDate(t) + ", " + fmtTime(t) : "";
      out.duration = sp && sp.ms > 0 ? Math.ceil(sp.ms / DAY) + (sp.ms > DAY ? " days" : " day") : "";
    }
    return out;
  }

  // Drop that keeps the pickup day: +3h, capped at 23:30 (a late pickup falls back to +1h)
  function defaultDrop(from) {
    var f = parseLocal(from);
    if (!f) return "";
    var t = new Date(f.getTime() + 3 * HOUR);
    if (ymd(t) !== ymd(f)) t = new Date(f.getFullYear(), f.getMonth(), f.getDate(), 23, 30);
    if (t.getTime() - f.getTime() < HOUR) t = new Date(f.getTime() + HOUR);
    return toLocal(t);
  }
  function addDays(local, n) { // "YYYY-MM-DDTHH:MM" shifted by n days, same time
    var d = parseLocal(local);
    if (!d) return "";
    d.setDate(d.getDate() + n);
    return toLocal(d);
  }
  function defaultState(now, opts) {
    now = now || new Date();
    var nb = opts && opts.notBefore ? parseLocal(opts.notBefore) : null;
    var later = nb && nb.getTime() > now.getTime() ? nb : null; // unavailable car: defaults start when it is back
    var start = later ? nextSlot(later) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0); // next full hour
    if (!later && start.getHours() * 60 + start.getMinutes() > 22 * 60 + 30) { // under 1h left today: tomorrow 9am
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 9, 0);
    }
    var from = toLocal(start);
    return { loc: "", from: from, to: defaultDrop(from) };
  }
  function minAttrs(state, now, opts) { // values for the min="" attributes
    now = now || new Date();
    var s = normalize(state), r = { from: nowLocal(now) };
    var nb = opts && opts.notBefore ? parseLocal(opts.notBefore) : null;
    if (nb && nb.getTime() > now.getTime() && toLocal(nb) > r.from) r.from = toLocal(nb);
    r.to = s.from && s.from > r.from ? s.from : r.from;
    return r;
  }
  function availability(car, now) { // unavailable cars with a known return date can be pre-booked
    var b = car || {}, nb = b.available === false ? parseLocal(b.availableFrom) : null;
    if (nb && nb.getTime() <= (now || new Date()).getTime()) nb = null;
    return {
      available: b.available !== false, reservable: !!nb,
      from: nb ? toLocal(nb) : "", fromDate: nb,
      label: nb ? nb.getDate() + " " + MONTHS[nb.getMonth()] + ", " + fmtTime(nb) : "",
      short: nb ? nb.getDate() + " " + MONTHS[nb.getMonth()] : ""
    };
  }

  function dec(s) { try { return decodeURIComponent(s.replace(/\+/g, " ")); } catch (e) { return ""; } }
  function readParams(search) {
    var q = search;
    if (q === undefined) q = (global.location && global.location.search) || "";
    var out = {}, parts = String(q).replace(/^\?/, "").split("&");
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var kv = parts[i].split("="), k = dec(kv[0]);
      if (PARAM_KEYS.indexOf(k) !== -1) out[k] = dec(kv[1] || "");
    }
    return out;
  }
  function writeParams(obj) { // -> "?loc=...&from=...&to=..." (empty values dropped)
    var o = obj || {}, pairs = [];
    PARAM_KEYS.forEach(function (k) {
      var v = o[k];
      if (v === undefined || v === null || v === "") return;
      pairs.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
    });
    return pairs.length ? "?" + pairs.join("&") : "";
  }
  function buildUrl(page, obj) { return page + writeParams(obj); }
  function replaceUrl(obj) {
    if (global.history && global.history.replaceState && global.location) {
      global.history.replaceState(null, "", global.location.pathname + writeParams(obj) + global.location.hash);
    }
  }
  function makeRef() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "KX-";
    for (var i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  global.Booking = {
    readParams: readParams, writeParams: writeParams, buildUrl: buildUrl, replaceUrl: replaceUrl,
    validate: validate, quote: quote, formatINR: formatINR, today: today, availability: availability,
    normalize: normalize, defaultState: defaultState, defaultDrop: defaultDrop, addDays: addDays, minAttrs: minAttrs,
    summary: summary, formatTime: formatTime, makeRef: makeRef,
    RATES: RATES,
    get AREAS() { return areas(); }
  };
})(typeof window !== "undefined" ? window : this);
