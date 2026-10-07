// Blog page: table of contents, cheapest-car picks and teaser cards
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var TEASERS = [
    { icon: 'wallet', tag: 'Fares', title: 'What a day of Kinetix rides costs in Bhimavaram',
      excerpt: 'A college commute, a market run and a late temple visit, added up against the auto fares for the same routes.' },
    { icon: 'battery-charging', tag: 'Fleet', title: 'How we charge, check and clean the fleet every night',
      excerpt: 'What happens at the hub between 11:30 pm and 5:30 am so every scooter starts the day full, checked and wiped down.' }
  ];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function renderToc() {
    var list = document.getElementById('toc'), heads = document.querySelectorAll('#post-body h2[id]');
    if (!list || !heads.length) return;
    list.innerHTML = Array.prototype.map.call(heads, function (h) {
      return '<li><a href="#' + h.id + '">' + esc(h.textContent) + '</a></li>';
    }).join('');

    // Highlight the section in view; skipped when IntersectionObserver is missing
    if (!('IntersectionObserver' in window)) return;
    var links = list.querySelectorAll('a'), current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) current = en.target.id; });
      links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + current); });
    }, { rootMargin: '-20% 0px -60% 0px' });
    heads.forEach(function (h) { io.observe(h); });
  }

  // Three cheapest available cars; the card stays hidden when the car data is missing
  function renderPicks() {
    var card = document.getElementById('picks-card'), el = document.getElementById('picks');
    var cars = window.KINETIX_CARS, B = window.Booking;
    if (!card || !el) return;
    if (!Array.isArray(cars) || !cars.length) { card.hidden = true; return; }
    var picks = cars.filter(function (c) { return c.available !== false && typeof c.hourly === 'number'; })
      .sort(function (a, b) { return a.hourly - b.hourly; }).slice(0, 3);
    if (!picks.length) { card.hidden = true; return; }
    el.innerHTML = picks.map(function (c) {
      var inr = B ? B.formatINR(c.hourly) : '₹' + c.hourly;
      var tr = c.transmission ? String(c.transmission).charAt(0).toUpperCase() + String(c.transmission).slice(1) : '';
      var meta = [c.seats ? c.seats + ' seats' : '', tr].filter(Boolean).join(' · ');
      return '<li><a class="pick" href="car.html?id=' + encodeURIComponent(c.id) + '">' +
        '<span class="pick__photo"><img src="' + esc(c.image || '') + '" alt="' + esc(c.name) + '" loading="lazy"></span>' +
        '<span><span class="pick__name">' + esc(c.name) + '</span><br><span class="pick__meta">' + esc(meta) + '</span></span>' +
        '<span class="pick__price">' + inr + '<small>/hr</small></span></a></li>';
    }).join('');
    card.hidden = false;
  }

  function renderTeasers() {
    var el = document.getElementById('teasers');
    if (!el) return;
    el.innerHTML = TEASERS.map(function (t, i) {
      return '<article class="card card--lift teaser reveal reveal--delay-' + (i + 1) + '">' +
        '<div class="teaser__top"><span class="teaser__icon"><i data-lucide="' + t.icon + '"></i></span><span class="chip">' + esc(t.tag) + '</span></div>' +
        '<h3 class="teaser__title"><a href="#">' + esc(t.title) + '</a></h3>' +
        '<p class="teaser__excerpt">' + esc(t.excerpt) + '</p>' +
        '<a class="link" href="#">Read more <i data-lucide="arrow-right"></i></a></article>';
    }).join('');
  }

  renderToc();
  renderPicks();
  renderTeasers();
  if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } });
  if (window.Reveal) window.Reveal.refresh();
})();
