// My profile: name and email are editable, the mobile is the login
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var P = window.Profile, $ = function (id) { return document.getElementById(id); }, form = $('profile-form'), toastTimer;
  function finish() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } }); if (window.Reveal) window.Reveal.refresh(); }
  function setError(k, msg) {
    var f = form.querySelector('.field[data-field="' + k + '"]'), input = f.querySelector('.input');
    f.classList.toggle('has-error', !!msg); f.querySelector('.field__error').textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  function render() {
    var p = P.get();
    $('rides-gate').hidden = !!p; $('profile-page').hidden = !p;
    if (!p) { finish(); return; }
    $('pf-title').textContent = 'Hi, ' + P.first(p);
    $('pf-sub').textContent = 'Riding with Kinetix since ' + new Date(p.since || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) + '.';
    $('pf-name').textContent = p.name; $('pf-phone').textContent = p.phone;
    $('pf-in-name').value = p.name; $('pf-in-phone').value = p.phone; $('pf-in-email').value = p.email || '';
    finish();
  }
  form.addEventListener('input', function (e) { var f = e.target.closest('.field'); if (f && f.classList.contains('has-error')) setError(f.getAttribute('data-field'), ''); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var p = P.get(); if (!p) return;
    var v = P.validate({ name: $('pf-in-name').value, email: $('pf-in-email').value });
    setError('name', v.errors.name); setError('email', v.errors.email);
    if (!v.ok) { (v.errors.name ? $('pf-in-name') : $('pf-in-email')).focus(); return; }
    var saved = P.set({ name: $('pf-in-name').value, phone: p.phone, email: $('pf-in-email').value });
    saved.since = p.since; try { localStorage.setItem('kinetix-profile', JSON.stringify(saved)); } catch (err) {}
    if (window.Layout) window.Layout.render();
    render();
    $('pf-toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { $('pf-toast').hidden = true; }, 2500);
  });
  $('gate-login').addEventListener('click', function () { if (window.Layout) window.Layout.login({ onDone: render }); });
  document.addEventListener('kinetix:profile', render);
  render();
})();
