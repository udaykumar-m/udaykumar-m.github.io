// Contact page: ride zones from data, client-only form validation + inline success
(function (global) {
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE = /^\+?[\d\s()-]{8,16}$/;

  // Pure: returns {ok, errors:{name,email,phone,message}} — Node-safe
  function validate(v) {
    var e = {};
    v = v || {};
    if (!(v.name || '').trim()) e.name = 'Enter your name.';
    if (!(v.email || '').trim()) e.email = 'Enter your email address.';
    else if (!EMAIL.test(v.email.trim())) e.email = 'Enter a valid email address.';
    if ((v.phone || '').trim() && !PHONE.test(v.phone.trim())) e.phone = 'Enter a valid phone number.';
    if ((v.message || '').trim().length < 10) e.message = 'Tell us a little more (at least 10 characters).';
    return { ok: Object.keys(e).length === 0, errors: e };
  }
  global.ContactPage = { validate: validate };

  if (typeof document === 'undefined') return;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // First eight places from the shared list; falls back to the area names
  function renderZones() {
    var list = document.getElementById('ride-zones');
    if (!list) return;
    var places = Array.isArray(global.KINETIX_PLACES) ? global.KINETIX_PLACES.map(function (p) { return p.name; }) : (global.KINETIX_AREAS || []);
    list.innerHTML = places.slice(0, 8).map(function (name) {
      return '<li class="contact-point"><i data-lucide="map-pin"></i><span>' + esc(name) + '</span></li>';
    }).join('');
  }

  function bindForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var fields = ['name', 'email', 'phone', 'message'];
    var success = document.getElementById('cf-success');

    function input(k) { return document.getElementById('cf-' + k); }
    function setError(k, msg) {
      var el = input(k), field = el.closest('.field'), err = document.getElementById('cf-' + k + '-error');
      field.classList.toggle('has-error', !!msg);
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      err.textContent = msg || '';
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var values = {};
      fields.forEach(function (k) { values[k] = input(k).value; });
      var res = validate(values);
      var first = null;
      fields.forEach(function (k) {
        setError(k, res.errors[k]);
        if (res.errors[k] && !first) first = input(k);
      });
      if (!res.ok) { success.hidden = true; first.focus(); return; }

      document.getElementById('cf-success-text').textContent =
        'Thanks, ' + values.name.trim().split(/\s+/)[0] + '! We’ll reply to ' + values.email.trim() + ' within the hour.';
      success.hidden = false;
      form.reset();
      document.getElementById('cf-submit').blur();
      success.scrollIntoView({ block: 'nearest' });
    });

    // Clear an error as soon as the field is corrected
    fields.forEach(function (k) {
      input(k).addEventListener('input', function () {
        if (input(k).closest('.field').classList.contains('has-error')) setError(k, '');
      });
    });
  }

  renderZones();
  bindForm();
  if (global.lucide) global.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } });
  if (global.Reveal) global.Reveal.refresh();
})(typeof window !== 'undefined' ? window : this);
