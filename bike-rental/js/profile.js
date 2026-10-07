// Rider profile kept on this device (name + mobile), plus a tiny "known numbers" book so a returning
// number logs straight in. The backend (and real SMS codes) will own all of this later. Node-safe.
(function (global) {
  var KEY = 'kinetix-profile', BOOK = 'kinetix-accounts';
  function store() { try { return global.localStorage || null; } catch (e) { return null; } }
  function read(k, fallback) { var s = store(); if (!s) return fallback; try { return JSON.parse(s.getItem(k) || 'null') || fallback; } catch (e) { return fallback; } }
  function write(k, v) { var s = store(); if (s) { try { s.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: lasts for this page only */ } } }

  function digits(p) { return String(p || '').replace(/\D/g, '').slice(-10); }
  function validPhone(p) { return /^[6-9]\d{9}$/.test(digits(p)); }
  function formatPhone(p) { var d = digits(p); return d.length === 10 ? '+91 ' + d.slice(0, 5) + ' ' + d.slice(5) : String(p || '').trim(); }
  function validate(v) { // {phone, name}: only the keys present are checked
    var e = {};
    if ('phone' in v) { if (!String(v.phone || '').trim()) e.phone = 'Enter your mobile number.'; else if (!validPhone(v.phone)) e.phone = 'Enter a valid 10-digit mobile number.'; }
    if ('name' in v && !String(v.name || '').trim()) e.name = 'Enter your name.';
    if ('email' in v) { var em = String(v.email || '').trim(); if (!em) e.email = 'Enter your email.'; else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) e.email = 'Enter a valid email address.'; }
    if ('otp' in v && !/^\d{4}$/.test(String(v.otp || '').trim())) e.otp = 'Enter the 4-digit code.';
    return { ok: Object.keys(e).length === 0, errors: e };
  }
  // Demo stand-in for the SMS code: stable per number so a reload shows the same one
  function otpFor(phone) { var d = digits(phone), h = 7; for (var i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) >>> 0; return String(1000 + h % 9000); }

  function get() { var p = read(KEY, null); return p && p.name && p.phone ? p : null; }
  function lookup(phone) { // {name, email} for a known number, else null
    var r = read(BOOK, {})[digits(phone)];
    return r ? (typeof r === 'string' ? { name: r, email: '' } : r) : null;
  }
  function remember(phone, rec) { var b = read(BOOK, {}); b[digits(phone)] = { name: String(rec.name || '').trim(), email: String(rec.email || '').trim() }; write(BOOK, b); }
  function set(p) {
    var v = { name: String(p.name || '').trim(), phone: formatPhone(p.phone), email: String(p.email || '').trim(), since: Date.now() };
    write(KEY, v); remember(v.phone, v);
    return v;
  }
  function clear() { var s = store(); if (s) { try { s.removeItem(KEY); } catch (e) {} } }
  function first(p) { return String((p || get() || {}).name || '').split(/\s+/)[0]; }

  global.Profile = { get: get, set: set, clear: clear, first: first, lookup: lookup, remember: remember, validate: validate, otpFor: otpFor, formatPhone: formatPhone };
})(typeof window !== 'undefined' ? window : this);
