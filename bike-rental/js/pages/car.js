// Car page: product details, booking card with live quote, similar cars
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var B = window.Booking, cars = window.KINETIX_CARS || [];
  var TYPE = { hatchback: 'Hatchback', sedan: 'Sedan', suv: 'SUV', muv: 'MUV' };
  var TRANS = { automatic: 'Automatic', manual: 'Manual' };
  var FIELDS = ['loc', 'from', 'to'];
  var $ = function (id) { return document.getElementById(id); };

  var params = B.readParams();
  var car = cars.filter(function (c) { return c.id === params.id; })[0] || null;

  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function refresh() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } }); if (window.Reveal) window.Reveal.refresh(); }
  function mileage(c) { return c.fuel === 'electric' ? c.mileage + ' km/charge' : c.mileage + ' kmpl'; }

  function availHtml(c, href) {
    var a = B.availability(c);
    if (!a.reservable) return '<button type="button" class="btn btn--primary btn--block" disabled>Unavailable</button>';
    return '<p class="car-card__avail"><i data-lucide="timer"></i>Available from ' + a.label + ' · pre-book free</p>' +
      '<a class="btn btn--outline btn--block" href="' + href + '">Book now</a>';
  }

  function cardHtml(c, state) {
    var city = state.zone !== 'outside';
    var href = B.buildUrl('car.html', merge(state, { id: c.id }));
    return '<article class="card card--lift car-card' + (c.available ? '' : ' car-card--unavailable') + '">' +
      '<h3 class="car-card__name"><a href="' + href + '">' + c.name + '</a></h3>' +
      '<div class="car-card__photo"><img src="' + c.image + '" alt="' + c.name + '">' +
        (c.available ? '' : '<span class="chip car-card__badge">Unavailable</span>') + '</div>' +
      '<div class="car-card__body">' +
        '<div class="car-card__meta"><span class="chip">' + TYPE[c.type] + '</span><span class="car-card__meta-text">' + c.seats + ' seats <span class="dot"></span> ' + TRANS[c.transmission] + ' <span class="dot"></span> ' + mileage(c) + '</span></div>' +
        '<div class="car-card__price"><small>Starting at</small><strong>' + B.formatINR(city ? c.hourly : c.daily) + '</strong><span>' + (city ? '/hour' : '/day') + '</span></div>' +
        '<p class="car-card__est">' + (city ? B.formatINR(c.daily) + '/day' : B.formatINR(c.hourly) + '/hour') + ' + ' + B.formatINR(c.deposit) + ' deposit</p>' +
        (c.available ? '<a class="btn btn--primary btn--block" href="' + href + '">Book now</a>' : availHtml(c, href)) +
      '</div></article>';
  }

  // Same type first (available ones ahead), then the closest hourly rates from the rest
  function similar(c) {
    var same = [], rest = [];
    cars.forEach(function (x) { if (x.id !== c.id) (x.type === c.type ? same : rest).push(x); });
    same.sort(function (x, y) { return (y.available ? 1 : 0) - (x.available ? 1 : 0) || Math.abs(x.hourly - c.hourly) - Math.abs(y.hourly - c.hourly); });
    rest.sort(function (x, y) { return Math.abs(x.hourly - c.hourly) - Math.abs(y.hourly - c.hourly); });
    return same.concat(rest).slice(0, 3);
  }

  function renderSimilar(list, state) {
    $('similar-grid').innerHTML = list.map(function (c) { return cardHtml(c, state); }).join('');
    refresh();
  }

  // Missing / unknown id
  if (!car) {
    document.title = 'Car not found — Kinetix';
    $('car-missing').hidden = false;
    $('similar-title').textContent = 'Popular picks';
    $('similar-sub').textContent = 'Customers book these most often.';
    var picks = cars.filter(function (c) { return c.hero && c.available; })
      .sort(function (a, b) { return a.hero - b.hero; }).slice(0, 3);
    renderSimilar(picks, B.normalize(params));
    return;
  }

  // Product
  document.title = car.name + ' — Kinetix';
  $('car-page').hidden = false;
  var img = $('car-img');
  img.src = car.image; img.alt = car.name;
  var av = B.availability(car), opts = av.reservable ? { notBefore: av.from } : null;
  if (!car.available) {
    $('car-hero').classList.add('is-unavailable'); $('car-badge').hidden = false;
    if (av.reservable) $('car-badge').textContent = 'Back ' + av.short;
  }
  $('car-brand').textContent = car.brand + ' · ' + TYPE[car.type];
  $('car-name').textContent = car.name;
  $('car-type').textContent = TYPE[car.type];
  $('car-seats').textContent = car.seats + ' seats';
  $('car-trans').textContent = TRANS[car.transmission];
  $('car-mileage').textContent = mileage(car);
  $('car-blurb').textContent = car.blurb;
  $('rate-hourly').textContent = B.formatINR(car.hourly);
  $('rate-daily').textContent = B.formatINR(car.daily);
  $('rate-deposit').textContent = B.formatINR(car.deposit);
  $('rate-hint').textContent = B.formatINR(car.hourly) + '/hr same day · ' + B.formatINR(car.daily) + '/day across days';
  ['engine', 'mileage', 'transmission', 'seats', 'boot', 'fuel'].forEach(function (k) { $('spec-' + k).textContent = car.specs[k]; });
  if (car.fuel === 'electric') {
    $('spec-engine-label').textContent = 'Motor';
    $('spec-mileage-label').textContent = 'Range';
    $('spec-fuel-label').textContent = 'Battery';
  }

  // Booking card
  var form = $('booking-form'), inputs = {};
  var d = B.defaultState(null, opts);
  var state = B.normalize({ loc: params.loc || '', from: params.from || d.from, to: params.to || d.to });
  if (opts && B.validate(state, null, opts).errors.from) { // search dates may predate the car's return: move to the first free slot
    state = B.normalize({ loc: state.loc, from: d.from, to: d.to });
  }

  FIELDS.forEach(function (k) { inputs[k] = $(k); inputs[k].value = state[k]; });

  function setMins() {
    var m = B.minAttrs(state, null, opts);
    inputs.from.min = m.from; inputs.to.min = m.to;
  }
  function setError(k, msg) {
    var f = $('field-' + k);
    f.classList.toggle('has-error', !!msg);
    $('err-' + k).textContent = msg || '';
    if (msg) inputs[k].setAttribute('aria-invalid', 'true'); else inputs[k].removeAttribute('aria-invalid');
  }
  function syncUrl() { B.replaceUrl(merge(state, { id: car.id })); }
  // Keep the back link and similar-car links in step with the chosen dates
  function syncLinks() { $('car-back').href = B.buildUrl('cars.html', state); renderSimilar(similar(car), state); }

  function updateQuote() {
    var q = B.quote(car, state), s = B.summary(state);
    $('q-line').textContent = q.rateLabel + ' × ' + q.units + ' ' + q.unitLabel + (q.estimated ? ' (estimate)' : '');
    $('q-sub').textContent = B.formatINR(q.subtotal);
    $('q-dep').textContent = B.formatINR(q.deposit);
    $('q-total').textContent = B.formatINR(q.total);
    $('q-when').textContent = [s.zoneLabel, s.when, s.times, s.duration].filter(Boolean).join(' · ') || 'Fill in the dates to see your total.';
  }

  FIELDS.forEach(function (k) {
    inputs[k].addEventListener('input', function () {
      state[k] = inputs[k].value;
      setError(k, '');
      // drop stays on the pickup day unless it was already moved past the pickup
      if (k === 'from' && (!inputs.to.value || inputs.to.value <= inputs.from.value)) { inputs.to.value = B.defaultDrop(inputs.from.value); state.to = inputs.to.value; setError('to', ''); }
      state = B.normalize(state); // re-derives the plan from the dates
      if (k === 'from') setMins();
      updateQuote();
      syncUrl();
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var r = B.validate(state, null, opts), first = null;
    FIELDS.forEach(function (k) { setError(k, r.errors[k]); if (r.errors[k] && !first) first = inputs[k]; });
    if (first) { first.focus(); return; }
    window.location.href = B.buildUrl('confirmation.html', merge(state, { id: car.id, ref: B.makeRef() }));
  });

  if (av.reservable) {
    $('booking-title').textContent = 'Reserve this car';
    $('booking-sub').textContent = 'Free to reserve. Pay only once it\'s available.';
    $('booking-reserve').hidden = false;
    $('booking-reserve-text').innerHTML = '<strong>Subject to availability.</strong> This car is out until ' + av.label +
      '. Reserve it now for free, we\'ll notify you the moment it\'s back, and you pay only then.';
    $('confirm-btn').innerHTML = 'Reserve for free <i data-lucide="bell"></i>';
    $('booking-terms').textContent = 'No payment now. Cancel free any time before you pay.';
    $('q-total-label').textContent = 'Total when available';
  } else if (!car.available) { $('booking-notice').hidden = false; $('confirm-btn').disabled = true; }

  updateQuote();
  setMins();
  $('similar-sub').textContent = 'More cars like the ' + car.name + ', priced for the same plan.';
  syncLinks();
  form.addEventListener('change', syncLinks);
})();
