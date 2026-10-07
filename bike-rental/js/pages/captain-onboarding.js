// Internal onboarding: creates a captain account on this device (the admin console will own this later)
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var C = window.Captain, P = window.Profile, $ = function (id) { return document.getElementById(id); };
  var form = $('ob-form'), FIELDS = ['name', 'phone', 'email', 'vehicle', 'plate', 'licence', 'consent'];
  function finish() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } }); if (window.Reveal) window.Reveal.refresh(); }

  $('ob-vehicle').innerHTML += (window.KINETIX_EV || []).map(function (v) { return '<option value="' + v.name + '">' + v.name + '</option>'; }).join('');

  function setError(k, msg) {
    var f = form.querySelector('.field[data-field="' + k + '"]'), input = f.querySelector('input, select');
    f.classList.toggle('has-error', !!msg); f.querySelector('.field__error').textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  form.addEventListener('input', function (e) { var f = e.target.closest('.field'); if (f && f.classList.contains('has-error')) setError(f.getAttribute('data-field'), ''); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = { name: $('ob-name').value, phone: $('ob-phone').value, email: $('ob-email').value, vehicle: $('ob-vehicle').value, plate: $('ob-plate').value, licence: $('ob-licence').value, consent: $('ob-consent').checked };
    if (v.email.trim()) { var ev = P.validate({ email: v.email }); if (!ev.ok) { setError('email', ev.errors.email); $('ob-email').focus(); return; } }
    var r = C.validateOnboarding(v), first = null;
    FIELDS.forEach(function (k) { if (k === 'email') return; setError(k, r.errors[k]); if (r.errors[k] && !first) first = form.querySelector('.field[data-field="' + k + '"] input, .field[data-field="' + k + '"] select'); });
    if (first) { first.focus(); return; }
    var acc = C.register(v);
    $('ob-done-text').textContent = acc.name + ' · ' + P.formatPhone(acc.phone) + ' · ' + acc.vehicle + ' · ' + acc.plate;
    form.hidden = true; $('ob-done').hidden = false;
    finish();
  });
  $('ob-another').addEventListener('click', function () { form.reset(); form.hidden = false; $('ob-done').hidden = true; $('ob-name').focus(); });
  finish();
})();
