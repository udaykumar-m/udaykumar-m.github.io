// Confirmation page: reads ?id&ref&loc&from&to and fills the booking summary
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var B = window.Booking, cars = window.KINETIX_CARS || [];
  var TYPE = { hatchback: 'Hatchback', sedan: 'Sedan', suv: 'SUV', muv: 'MUV' };
  var booked = document.getElementById('confirm'), missing = document.getElementById('missing');

  function finish() {
    if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } });
    if (window.Reveal) window.Reveal.refresh();
  }
  function $(id) { return document.getElementById(id); }
  function text(id, v) { $(id).textContent = v; }
  // value + optional muted sub-line
  function detail(id, main, sub) {
    var el = $(id); el.textContent = main;
    if (sub) { var s = document.createElement('small'); s.textContent = sub; el.appendChild(s); }
  }

  var p = B.readParams(), car = null;
  for (var i = 0; i < cars.length; i++) if (cars[i].id === p.id) car = cars[i];
  if (!car) { missing.hidden = false; finish(); return; }

  var state = B.normalize(p), city = state.zone === 'city';
  var ref = /^KX-[A-Z0-9]{6}$/i.test(p.ref || '') ? p.ref.toUpperCase() : B.makeRef();
  if (ref !== p.ref) { p.ref = ref; B.replaceUrl(p); } // keep the page reloadable with its reference
  var q = B.quote(car, state), s = B.summary(state), tbc = 'To be confirmed at pickup';

  document.title = 'Booked ' + ref + ' — Kinetix';
  text('confirm-ref', ref);
  text('confirm-lead', 'Your ' + car.name + ' is reserved' + (state.loc ? ' at ' + state.loc : '') + '. Show your reference at the pickup point and you\'re off.');

  var img = $('booking-img');
  img.src = car.image; img.alt = car.name;
  text('booking-brand', car.brand);
  text('booking-title', car.name);
  text('booking-type', TYPE[car.type] || car.type);

  detail('d-zone', s.zoneLabel, city ? 'Same day, billed by the hour' : 'Across days, billed per day');
  detail('d-loc', state.loc || tbc, state.loc ? 'Kinetix pickup point' : '');
  detail('d-when', s.when || tbc, s.times);
  detail('d-duration', q.estimated ? tbc : s.duration, q.estimated ? '' : 'Billed as ' + q.units + ' ' + q.unitLabel);

  text('p-rate', B.formatINR(q.rate) + '/' + q.unitShort);
  text('p-line-label', q.estimated ? 'Rental (minimum 1 ' + q.unitShort + ')' : B.formatINR(q.rate) + ' × ' + q.units + ' ' + q.unitLabel);
  text('p-subtotal', B.formatINR(q.subtotal));
  text('p-deposit', B.formatINR(q.deposit));
  text('p-total', B.formatINR(q.total));

  text('step-pickup', 'Arrive at ' + (state.loc || 'the pickup point') + (s.startTime ? ' by ' + s.startTime : '') +
    ' with your driving licence and a photo ID. We\'ll do a two-minute walkaround together.');
  text('step-pay', 'Pay ' + B.formatINR(q.total) + ' by UPI or card at the counter. ' + B.formatINR(q.deposit) +
    ' of that is the deposit, returned when the car is back. Keys and papers are in the car.');

  // Pre-booking of an unavailable car: same summary, different promise
  var av = B.availability(car);
  if (av.reservable) {
    document.title = 'Reserved ' + ref + ' — Kinetix';
    text('confirm-eyebrow', 'Reservation placed');
    text('confirm-title', 'You\'re on the list!');
    text('confirm-lead', 'Your ' + car.name + ' is reserved for free' + (state.loc ? ' at ' + state.loc : '') + '. It\'s expected back by ' + av.label +
      '. We\'ll notify you the moment it\'s available, and you pay only then.');
    text('p-total-label', 'Total when available');
    text('p-note', 'Nothing is charged now. Prices exclude fuel; taxes shown at pickup. Deposit is returned when the car comes back as it left.');
    text('step-pickup-title', 'We\'ll notify you');
    text('step-pickup', 'Expect an SMS and email once the ' + car.name + ' is back, expected by ' + av.label + '. Your slot is held for 1 hour after that; if payment isn\'t received by then, the booking is cancelled.');
    text('step-pay', 'Once it\'s confirmed, bring your licence and a photo ID to ' + (state.loc || 'the pickup point') + ' and pay ' + B.formatINR(q.total) +
      ' by UPI or card. ' + B.formatINR(q.deposit) + ' of that is the deposit, returned when the car is back. Keys and papers are in the car.');
    text('confirm-notice-text', 'Subject to availability. Free to cancel any time before you pay.');
  }

  // Copy the reference; fall back to selecting it when the Clipboard API is unavailable (file://)
  var copy = $('copy-ref'), label = $('copy-label'), status = $('copy-status'), timer;
  copy.addEventListener('click', function () {
    var done = function () {
      copy.classList.add('is-copied'); label.textContent = 'Copied'; status.textContent = 'Reference copied';
      clearTimeout(timer);
      timer = setTimeout(function () { copy.classList.remove('is-copied'); label.textContent = 'Copy'; status.textContent = ''; }, 1600);
    };
    var fallback = function () {
      var range = document.createRange(), sel = window.getSelection();
      range.selectNodeContents($('confirm-ref')); sel.removeAllRanges(); sel.addRange(range);
      status.textContent = 'Reference selected. Press Ctrl+C or Cmd+C to copy.';
    };
    try { navigator.clipboard.writeText(ref).then(done, fallback); } catch (e) { fallback(); }
  });

  booked.hidden = false;
  finish();
})();
