// Car list: search sidebar (booking params) + client-side filters, all on KINETIX_CARS
(function (global) {
  var TYPE_LABEL = { hatchback: "Hatchback", sedan: "Sedan", suv: "SUV", muv: "MUV" };
  var TRANS_LABEL = { automatic: "Automatic", manual: "Manual" };
  var TRANS = ["any", "automatic", "manual"];
  var FUEL = ["any", "electric", "petrol", "diesel"];
  var SORTS = ["price-asc", "price-desc", "mileage", "seats"];

  function rateOf(c, zone) { return zone === "outside" ? c.daily : c.hourly; }
  function defaultFilters() { return { types: [], max: null, mileage: 0, trans: "any", fuel: "any", avail: false, sort: "price-asc" }; }

  function filterCars(cars, f, zone) {
    var out = cars.filter(function (c) {
      if (f.types.length && f.types.indexOf(c.type) === -1) return false;
      if (f.max !== null && rateOf(c, zone) > f.max) return false;
      if (f.mileage && c.mileage < f.mileage) return false;
      if (f.trans !== "any" && c.transmission !== f.trans) return false;
      if (f.fuel !== "any" && c.fuel !== f.fuel) return false;
      if (f.avail && !c.available) return false;
      return true;
    });
    out.sort(function (a, b) {
      if (f.sort === "price-desc") return rateOf(b, zone) - rateOf(a, zone) || a.name.localeCompare(b.name);
      if (f.sort === "mileage") return b.mileage - a.mileage || a.name.localeCompare(b.name);
      if (f.sort === "seats") return b.seats - a.seats || rateOf(a, zone) - rateOf(b, zone) || a.name.localeCompare(b.name);
      return rateOf(a, zone) - rateOf(b, zone) || a.name.localeCompare(b.name);
    });
    return out;
  }

  // Filter params live next to the booking params so the list state is shareable
  function parseFilters(search) {
    var f = defaultFilters(), q = {};
    String(search || "").replace(/^\?/, "").split("&").forEach(function (p) {
      if (!p) return;
      var kv = p.split("=");
      try { q[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || "").replace(/\+/g, " ")); } catch (e) { /* malformed escape: ignore */ }
    });
    if (q.type) f.types = q.type.split(",").filter(function (t) { return TYPE_LABEL[t]; });
    if (q.max && !isNaN(+q.max)) f.max = +q.max;
    if (q.mileage && !isNaN(+q.mileage)) f.mileage = +q.mileage;
    if (TRANS.indexOf(q.trans) !== -1) f.trans = q.trans;
    if (FUEL.indexOf(q.fuel) !== -1) f.fuel = q.fuel;
    f.avail = q.avail === "1";
    if (SORTS.indexOf(q.sort) !== -1) f.sort = q.sort;
    return f;
  }
  function filterQuery(f, zoneMax) {
    var p = [];
    if (f.types.length) p.push("type=" + f.types.join(","));
    if (f.max !== null && f.max < zoneMax) p.push("max=" + f.max);
    if (f.mileage) p.push("mileage=" + f.mileage);
    if (f.trans !== "any") p.push("trans=" + f.trans);
    if (f.fuel !== "any") p.push("fuel=" + f.fuel);
    if (f.avail) p.push("avail=1");
    if (f.sort !== "price-asc") p.push("sort=" + f.sort);
    return p.join("&");
  }
  function activeCount(f, zoneMax) {
    return (f.types.length ? 1 : 0) + (f.max !== null && f.max < zoneMax ? 1 : 0) + (f.mileage ? 1 : 0) +
      (f.trans !== "any" ? 1 : 0) + (f.fuel !== "any" ? 1 : 0) + (f.avail ? 1 : 0);
  }
  function priceBounds(cars, zone) {
    var r = cars.map(function (c) { return rateOf(c, zone); });
    return { min: Math.min.apply(null, r), max: Math.max.apply(null, r) };
  }

  global.CarsPage = { filterCars: filterCars, parseFilters: parseFilters, filterQuery: filterQuery, activeCount: activeCount, priceBounds: priceBounds, defaultFilters: defaultFilters, TYPE_LABEL: TYPE_LABEL };

  if (typeof document === "undefined" || !global.Booking) return;

  var B = global.Booking, cars = global.KINETIX_CARS || [];
  var $ = function (id) { return document.getElementById(id); };
  var form = $("search-form"), grid = $("car-grid"), sidebar = $("cars-sidebar"), quick = $("quick-chips");
  var inputs = { loc: $("f-loc"), from: $("f-from"), to: $("f-to") };
  var priceRange = $("f-price"), mileageRange = $("f-mileage"), availSwitch = $("f-avail"), sortSel = $("f-sort");

  var params = B.readParams();
  if (!params.from) { var dflt = B.defaultState(); params.from = dflt.from; params.to = dflt.to; } // today, next full hour
  var state = B.normalize(params);
  var filters = parseFilters(global.location.search);

  // Datalist of pickup points
  Object.keys(inputs).forEach(function (k) { inputs[k].value = state[k] || ""; });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function readForm() { return B.normalize({ loc: inputs.loc.value, from: inputs.from.value, to: inputs.to.value }); }
  // The form's data-zone mirrors the active plan (city = hourly, outside = daily) for rates and labels
  function setZone(zone) { form.setAttribute("data-zone", zone); }
  function setMins() {
    var m = B.minAttrs(readForm());
    inputs.from.min = m.from; inputs.to.min = m.to;
  }
  // "Available now only" makes sense only for pickups today
  function syncAvail() {
    var todayPick = inputs.from.value.slice(0, 10) === B.today();
    availSwitch.disabled = !todayPick;
    $("avail-wrap").classList.toggle("is-disabled", !todayPick);
    $("avail-note").hidden = todayPick;
    if (!todayPick && filters.avail) { filters.avail = false; availSwitch.checked = false; render(); syncUrl(); }
  }
  function showErrors(errors) {
    var first = null;
    form.querySelectorAll(".field[data-field]").forEach(function (f) {
      var k = f.getAttribute("data-field"), msg = errors[k], input = f.querySelector(".input");
      f.classList.toggle("has-error", !!msg);
      f.querySelector(".field__error").textContent = msg || "";
      if (msg) { input.setAttribute("aria-invalid", "true"); if (!first && f.offsetParent !== null) first = input; }
      else input.removeAttribute("aria-invalid");
    });
    if (first) first.focus();
  }

  // Price slider is re-scaled to the active zone's rate range
  function syncPriceRange(keepRatio) {
    var zone = form.getAttribute("data-zone"), b = priceBounds(cars, zone);
    var ratio = keepRatio && +priceRange.max > +priceRange.min ? (+priceRange.value - +priceRange.min) / (+priceRange.max - +priceRange.min) : 1;
    var step = zone === "outside" ? 50 : 10;
    priceRange.min = b.min; priceRange.max = b.max; priceRange.step = step;
    var v = filters.max !== null && !keepRatio ? filters.max : b.min + Math.round(ratio * (b.max - b.min) / step) * step;
    priceRange.value = Math.min(b.max, Math.max(b.min, v));
    filters.max = +priceRange.value;
    $("price-min").textContent = B.formatINR(b.min); $("price-max").textContent = B.formatINR(b.max);
    $("price-out").textContent = B.formatINR(filters.max) + (zone === "outside" ? "/day" : "/hr");
  }
  function pressChip(b, on) { b.setAttribute("aria-pressed", String(on)); b.classList.toggle("chip--solid", on); }
  function syncChips(wrap, attr, value) {
    wrap.querySelectorAll("[" + attr + "]").forEach(function (b) { pressChip(b, b.getAttribute(attr) === value); });
  }
  function syncFilterControls() {
    quick.querySelectorAll(".chip").forEach(function (b) {
      var t = b.getAttribute("data-type");
      if (b.hasAttribute("data-fuel")) pressChip(b, filters.fuel === "electric");
      else pressChip(b, t ? filters.types.indexOf(t) !== -1 : filters.types.length === 0 && filters.fuel !== "electric");
    });
    mileageRange.value = filters.mileage;
    $("mileage-out").textContent = filters.mileage ? filters.mileage + " kmpl+" : "Any";
    syncChips($("trans-chips"), "data-trans", filters.trans);
    syncChips($("fuel-chips"), "data-fuel", filters.fuel);
    availSwitch.checked = filters.avail;
    sortSel.value = filters.sort;
  }

  function tripSummary() {
    var el = $("trip-summary"), s = state, ok = s.loc && B.validate(s).ok;
    el.hidden = !ok;
    if (!ok) { el.innerHTML = ""; return; }
    var sm = B.summary(s);
    el.innerHTML =
      '<span class="chip"><i data-lucide="map-pin"></i>' + esc(s.loc) + '</span>' +
      '<span class="chip"><i data-lucide="calendar"></i>' + esc(sm.when + (s.zone === "city" ? ", " + sm.times : " " + sm.times)) + '</span>' +
      '<span class="chip chip--accent"><i data-lucide="' + (s.zone === "city" ? "clock" : "route") + '"></i>' + esc(sm.duration + " · " + sm.zoneLabel) + '</span>';
  }

  // Unavailable with a return date: say when it is back and allow a free pre-booking
  function availHtml(c, href) {
    var a = B.availability(c);
    if (!a.reservable) return '<button class="btn btn--primary btn--block" type="button" disabled>Unavailable</button>';
    return '<p class="car-card__avail"><i data-lucide="timer"></i>Available from ' + a.label + ' · pre-book free</p>' +
      '<a class="btn btn--outline btn--block" href="' + href + '">Book now</a>';
  }

  function card(c, zone) {
    var booking = B.buildUrl("car.html", Object.assign({}, state, { id: c.id }));
    var mil = c.fuel === "electric" ? c.mileage + " km/charge" : c.mileage + " kmpl";
    // main line = rate for the active plan; sub-line = the other rate + deposit
    var hourly = zone !== "outside";
    var est = '<p class="car-card__est">' + (hourly ? B.formatINR(c.daily) + "/day" : B.formatINR(c.hourly) + "/hour") + " + " + B.formatINR(c.deposit) + " deposit</p>";
    return '<article class="card card--lift car-card' + (c.available ? "" : " car-card--unavailable") + '">' +
      '<h3 class="car-card__name"><a href="' + booking + '">' + esc(c.name) + '</a></h3>' +
      '<div class="car-card__photo"><img src="' + c.image + '" alt="' + esc(c.name) + '" loading="lazy">' +
        (c.available ? "" : '<span class="chip car-card__badge">Unavailable</span>') + '</div>' +
      '<div class="car-card__body">' +
        '<div class="car-card__meta"><span class="chip">' + TYPE_LABEL[c.type] + '</span><span class="car-card__meta-text">' + c.seats + ' seats <span class="dot"></span> ' + TRANS_LABEL[c.transmission] + ' <span class="dot"></span> ' + mil + '</span></div>' +
        '<div class="car-card__price"><small>Starting at</small><strong>' + B.formatINR(rateOf(c, zone)) + '</strong><span>' + (hourly ? "/hour" : "/day") + '</span></div>' + est +
        (c.available ? '<a class="btn btn--primary btn--block" href="' + booking + '">Book now</a>' : availHtml(c, booking)) +
      '</div></article>';
  }

  function render() {
    var zone = form.getAttribute("data-zone");
    var list = filterCars(cars, filters, zone);
    var avail = list.filter(function (c) { return c.available; }).length;
    grid.innerHTML = list.length ? list.map(function (c) { return card(c, zone); }).join("") :
      '<div class="empty"><i data-lucide="search"></i><h3>No cars match these filters</h3><p>Try a higher price cap, another fuel or gearbox, or clear the filters.</p>' +
      '<button type="button" class="btn btn--outline" id="empty-reset">Clear filters</button></div>';
    var n = activeCount(filters, priceBounds(cars, zone).max);
    $("result-count").textContent = list.length === cars.length
      ? cars.length + " cars · " + avail + " available today · " + (zone === "outside" ? "daily" : "hourly") + " rates"
      : list.length + " of " + cars.length + " cars match · " + avail + " available";
    $("toolbar-count").textContent = list.length ? "Showing " + list.length + " " + (list.length === 1 ? "car" : "cars") + (n ? " · " + n + (n === 1 ? " filter" : " filters") + " on" : "") : "";
    $("filter-count").hidden = !n; $("filter-count").textContent = n;
    var reset = $("empty-reset"); if (reset) reset.addEventListener("click", resetFilters);
    tripSummary();
    if (global.lucide) global.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } });
    if (global.Reveal) global.Reveal.refresh();
  }
  function syncUrl() {
    var fq = filterQuery(filters, priceBounds(cars, form.getAttribute("data-zone")).max);
    var qs = B.writeParams(state);
    global.history.replaceState(null, "", global.location.pathname + (qs ? qs + (fq ? "&" + fq : "") : (fq ? "?" + fq : "")) + global.location.hash);
  }
  function resetFilters() {
    filters = defaultFilters();
    syncPriceRange(false); syncFilterControls(); render(); syncUrl();
  }
  function apply() { syncFilterControls(); render(); syncUrl(); }

  Object.keys(inputs).forEach(function (k) {
    inputs[k].addEventListener("input", function () {
      var f = inputs[k].closest(".field");
      if (f && f.classList.contains("has-error")) { f.classList.remove("has-error"); f.querySelector(".field__error").textContent = ""; inputs[k].removeAttribute("aria-invalid"); }
      // drop stays on the pickup day unless it was already moved past the pickup
      if (k === "from" && (!inputs.to.value || inputs.to.value <= inputs.from.value)) inputs.to.value = B.defaultDrop(inputs.from.value);
      setMins();
      if (k === "from") syncAvail();
    });
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var s = readForm(), v = B.validate(s);
    showErrors(v.errors);
    if (!v.ok) return;
    var planChanged = s.zone !== form.getAttribute("data-zone");
    state = s; setZone(s.zone);
    if (planChanged) syncPriceRange(true);
    render(); syncUrl();
    if (sidebar.classList.contains("is-open") && global.innerWidth <= 960) grid.scrollIntoView({ behavior: global.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });

  // Filters apply immediately. Quick type chips toggle; "All" clears them; Electric toggles the fuel filter
  quick.querySelectorAll(".chip").forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.hasAttribute("data-fuel")) { filters.fuel = filters.fuel === "electric" ? "any" : "electric"; apply(); return; }
      var t = b.getAttribute("data-type"), i = filters.types.indexOf(t);
      if (!t) { filters.types = []; if (filters.fuel === "electric") filters.fuel = "any"; }
      else if (i === -1) filters.types.push(t); else filters.types.splice(i, 1);
      apply();
    });
  });
  priceRange.addEventListener("input", function () {
    filters.max = +priceRange.value;
    $("price-out").textContent = B.formatINR(filters.max) + (form.getAttribute("data-zone") === "outside" ? "/day" : "/hr");
    render();
  });
  priceRange.addEventListener("change", syncUrl);
  mileageRange.addEventListener("input", function () {
    filters.mileage = +mileageRange.value;
    $("mileage-out").textContent = filters.mileage ? filters.mileage + " kmpl+" : "Any";
    render();
  });
  mileageRange.addEventListener("change", syncUrl);
  $("trans-chips").querySelectorAll("[data-trans]").forEach(function (b) {
    b.addEventListener("click", function () { filters.trans = b.getAttribute("data-trans"); apply(); });
  });
  $("fuel-chips").querySelectorAll("[data-fuel]").forEach(function (b) {
    b.addEventListener("click", function () { filters.fuel = b.getAttribute("data-fuel"); apply(); });
  });
  availSwitch.addEventListener("change", function () { filters.avail = availSwitch.checked; render(); syncUrl(); });
  sortSel.addEventListener("change", function () { filters.sort = sortSel.value; render(); syncUrl(); });
  $("filter-reset").addEventListener("click", resetFilters);

  // Mobile: dates and filters collapse behind a toggle
  var toggle = $("filter-toggle");
  toggle.addEventListener("click", function () {
    var open = !sidebar.classList.contains("is-open");
    sidebar.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Initial state: URL params if present, otherwise empty fields on the hourly plan
  setZone(state.zone);
  syncPriceRange(false); syncFilterControls(); setMins(); syncAvail(); render();
})(typeof window !== "undefined" ? window : this);
