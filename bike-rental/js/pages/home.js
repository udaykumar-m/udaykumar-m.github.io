// Home: EV carousel, ride-or-car booking card, car teaser cards
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var B = window.Booking, R = window.Ride;
  var evs = window.KINETIX_EV || [], cars = window.KINETIX_CARS || [], places = window.KINETIX_PLACES || [];
  var root = document.documentElement;
  var shot = root.hasAttribute('data-shot');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function icons() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } }); }

  if ($('trust-places')) $('trust-places').textContent = places.length;

  /* Hero carousel: the captain fleet */
  (function carousel() {
    var wrap = $('hero-carousel'), slidesEl = $('carousel-slides'), dotsEl = $('carousel-dots'), cap = $('carousel-caption');
    if (!wrap || !slidesEl || !evs.length) return;
    var i = 0, timer = null, paused = false, stopped = shot || reduced;

    slidesEl.innerHTML = evs.map(function (v, n) {
      return '<div class="carousel__slide' + (n === 0 ? ' is-active' : '') + '" role="group" aria-roledescription="slide" aria-label="' + (n + 1) + ' of ' + evs.length + '"' + (n ? ' aria-hidden="true"' : '') + '>' +
        '<img src="' + esc(v.image) + '" alt="' + esc(v.name) + '" draggable="false"' + (n ? ' loading="lazy"' : '') + '></div>';
    }).join('');
    dotsEl.innerHTML = evs.map(function (v, n) {
      return '<button type="button" class="carousel__dot' + (n === 0 ? ' is-active' : '') + '" aria-label="Show ' + esc(v.name) + '"' + (n === 0 ? ' aria-current="true"' : '') + '></button>';
    }).join('');
    var slides = slidesEl.children, dots = dotsEl.children;

    // user-triggered changes announce the caption; autoplay stays quiet
    function show(n, user) {
      cap.setAttribute('aria-live', user ? 'polite' : 'off');
      i = (n + evs.length) % evs.length;
      for (var k = 0; k < slides.length; k++) {
        var on = k === i;
        slides[k].classList.toggle('is-active', on);
        if (on) slides[k].removeAttribute('aria-hidden'); else slides[k].setAttribute('aria-hidden', 'true');
        dots[k].classList.toggle('is-active', on);
        if (on) dots[k].setAttribute('aria-current', 'true'); else dots[k].removeAttribute('aria-current');
      }
      cap.innerHTML = esc(evs[i].name) + ' <span class="muted">·</span> <span class="accent">' + esc(evs[i].range) + '</span>';
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function play() { if (stopped || paused || timer) return; timer = setInterval(function () { show(i + 1); }, 4500); }
    function restart() { stop(); play(); }

    wrap.querySelector('.carousel__prev').addEventListener('click', function () { show(i - 1, true); restart(); });
    wrap.querySelector('.carousel__next').addEventListener('click', function () { show(i + 1, true); restart(); });
    dotsEl.addEventListener('click', function (e) {
      var d = e.target.closest('.carousel__dot');
      if (d) { show(Array.prototype.indexOf.call(dots, d), true); restart(); }
    });
    wrap.addEventListener('focusin', function () { paused = true; stop(); });
    wrap.addEventListener('focusout', function () { paused = false; play(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else play(); });

    show(0);
    play();
  })();

  /* Booking card: ride / car tabs */
  (function tabs() {
    var card = $('home-card');
    if (!card) return;
    var tabs = card.querySelectorAll('[data-tab]'), panels = { ride: $('panel-ride'), car: $('panel-car') };
    function select(name) {
      for (var k = 0; k < tabs.length; k++) {
        var on = tabs[k].getAttribute('data-tab') === name;
        tabs[k].setAttribute('aria-selected', String(on));
        tabs[k].setAttribute('aria-pressed', String(on));
        tabs[k].tabIndex = on ? 0 : -1;
      }
      panels.ride.hidden = name !== 'ride';
      panels.car.hidden = name !== 'car';
    }
    for (var k = 0; k < tabs.length; k++) {
      tabs[k].addEventListener('click', function () { select(this.getAttribute('data-tab')); });
      tabs[k].addEventListener('keydown', function (e) { // arrow keys move between tabs
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        var next = this.getAttribute('data-tab') === 'ride' ? 'car' : 'ride';
        select(next); card.querySelector('[data-tab="' + next + '"]').focus();
      });
    }
    select(B && B.readParams().loc ? 'car' : 'ride');
  })();

  function fieldErrors(form, keys, errors) {
    var first = null;
    keys.forEach(function (k) {
      var f = form.querySelector('.field[data-field="' + k + '"]');
      if (!f) return;
      var msg = errors[k], input = f.querySelector('.input');
      f.classList.toggle('has-error', !!msg);
      f.querySelector('.field__error').textContent = msg || '';
      if (msg) { input.setAttribute('aria-invalid', 'true'); if (!first) first = input; } else input.removeAttribute('aria-invalid');
    });
    if (first) first.focus();
  }
  function clearOnInput(form) {
    form.addEventListener('input', function (e) {
      var f = e.target.closest('.field');
      if (f && f.classList.contains('has-error')) { f.classList.remove('has-error'); e.target.removeAttribute('aria-invalid'); }
    });
  }

  /* Ride panel: pickup, drop, now or later; the fare shows on the ride page */
  (function ride() {
    var form = $('panel-ride');
    if (!form || !R) return;
    var pickup = $('h-pickup'), drop = $('h-drop'), when = $('h-when'), at = $('h-at'), fieldAt = $('h-field-at');

    function syncWhen() {
      var later = when.value === 'later';
      fieldAt.hidden = !later;
      if (later && !at.value) at.value = R.defaultAt();
      at.min = R.minAt();
    }
    function read() { return R.normalize({ pickup: pickup.value, drop: drop.value, when: when.value, at: at.value }); }

    var p = R.readParams();
    pickup.value = p.pickup || ''; drop.value = p.drop || '';
    when.value = p.when === 'later' ? 'later' : 'now'; at.value = p.at || '';
    syncWhen();
    when.addEventListener('change', syncWhen);
    clearOnInput(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = read(), errors = R.validate(s).errors, mine = {};
      ['pickup', 'drop', 'when', 'at'].forEach(function (k) { if (errors[k]) mine[k] = errors[k]; }); // name and phone come later
      fieldErrors(form, ['pickup', 'drop', 'when', 'at'], mine);
      if (Object.keys(mine).length) return;
      window.location.href = R.buildUrl('ride.html', s);
    });
  })();

  /* Car panel: same contract as the cars page search */
  (function car() {
    var form = $('panel-car');
    if (!form || !B) return;
    var inputs = { loc: $('f-loc'), from: $('f-from'), to: $('f-to') }, hint = $('search-hint');

    var cheapest = { city: Infinity, outside: Infinity };
    cars.forEach(function (c) { if (c.available === false) return; cheapest.city = Math.min(cheapest.city, c.hourly); cheapest.outside = Math.min(cheapest.outside, c.daily); });
    if (!isFinite(cheapest.city)) cheapest.city = B.RATES.hourly;
    if (!isFinite(cheapest.outside)) cheapest.outside = B.RATES.daily;

    function read() { return B.normalize({ loc: inputs.loc.value, from: inputs.from.value, to: inputs.to.value }); }
    function updateMins() { var m = B.minAttrs(read()); inputs.from.min = m.from; inputs.to.min = m.to; }
    function updateHint() {
      var city = read().zone === 'city';
      hint.textContent = city ? 'Same-day rental · hourly plan · from ₹' + cheapest.city + '/hour' : 'Multi-day rental · daily plan · from ₹' + cheapest.outside + '/day';
    }

    clearOnInput(form);
    form.addEventListener('input', function (e) {
      // drop stays on the pickup day unless the renter already moved it past the pickup
      if (e.target === inputs.from && (!inputs.to.value || inputs.to.value <= inputs.from.value)) inputs.to.value = B.defaultDrop(inputs.from.value);
      updateMins(); updateHint();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = read(), v = B.validate(s);
      if (!v.ok) { fieldErrors(form, ['loc', 'from', 'to'], v.errors); return; }
      window.location.href = B.buildUrl('cars.html', s);
    });

    // prefill from URL params if present, else tomorrow at the next full hour (home page only)
    var p = B.readParams(), d = B.defaultState(), from = B.addDays(d.from, 1);
    inputs.loc.value = p.loc || '';
    inputs.from.value = p.from || from;
    inputs.to.value = p.to || B.defaultDrop(from);
    updateMins(); updateHint();
  })();

  /* Car teaser: the four hero cars, same card as the cars page */
  (function teaser() {
    var grid = $('cars-teaser');
    if (!grid) return;
    var TYPE = { hatchback: 'Hatchback', sedan: 'Sedan', suv: 'SUV', muv: 'MUV' };
    var picks = cars.filter(function (c) { return c.hero; }).sort(function (a, b) { return a.hero - b.hero; }).slice(0, 4);
    if (!picks.length) { grid.closest('section').hidden = true; return; }
    grid.innerHTML = picks.map(function (c, n) {
      var href = 'car.html?id=' + encodeURIComponent(c.id), off = c.available === false, a = off && B ? B.availability(c) : null;
      var mileage = c.fuel === 'electric' ? c.mileage + ' km/charge' : c.mileage + ' kmpl';
      return '<article class="card card--lift car-card reveal' + (n ? ' reveal--delay-' + Math.min(n, 3) : '') + (off ? ' car-card--unavailable' : '') + '">' +
        '<h3 class="car-card__name"><a href="' + href + '">' + esc(c.name) + '</a></h3>' +
        '<div class="car-card__photo"><img src="' + esc(c.image) + '" alt="' + esc(c.name) + '" loading="lazy">' + (off ? '<span class="chip car-card__badge">Unavailable</span>' : '') + '</div>' +
        '<div class="car-card__body">' +
          '<div class="car-card__meta"><span class="chip">' + (c.fuel === 'electric' ? 'Electric' : TYPE[c.type] || '') + '</span><span>' + c.seats + ' seats</span><span class="dot"></span><span>' + esc(mileage) + '</span></div>' +
          '<div class="car-card__price"><small>Starting at</small><strong>' + B.formatINR(c.hourly) + '</strong><span>/hour</span></div>' +
          '<p class="car-card__est">' + B.formatINR(c.daily) + '/day + ' + B.formatINR(c.deposit) + ' deposit</p>' +
          (off && a && a.reservable ? '<p class="car-card__avail"><i data-lucide="timer"></i>Available from ' + esc(a.label) + ' · pre-book free</p><a class="btn btn--outline btn--block" href="' + href + '">Book now</a>' :
            '<a class="btn btn--primary btn--block" href="' + href + '">Book now</a>') +
        '</div></article>';
    }).join('');
  })();

  icons();
  if (window.Reveal) window.Reveal.refresh();
})();
