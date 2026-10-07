// Place picker: turns any input[data-places] into a search-as-you-type list over KINETIX_PLACES,
// with a "Choose on map" option that drops a pin on a static map. Client-side for the demo; swap search() for an API later.
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var MAX = 8, count = 0;
  var SVG = function (body) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>'; };
  var PIN = SVG('<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>');
  var MAP = SVG('<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>');
  var SEARCH = SVG('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>');
  var X = SVG('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>');
  var MARKER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function places() { return window.KINETIX_PLACES || []; }
  function exact(v) { v = String(v || '').trim().toLowerCase(); for (var i = 0; i < places().length; i++) if (places()[i].name.toLowerCase() === v) return places()[i]; return null; }
  function pinOf(v) { var m = String(v || '').match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)$/); return m ? { lat: +m[1], lng: +m[2] } : null; }

  // Name starts with the query first, then a word inside it, then anywhere
  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    var tiers = [[], [], []];
    places().forEach(function (p) {
      var n = p.name.toLowerCase(), i = n.indexOf(q);
      if (i === -1) return;
      tiers[i === 0 ? 0 : (n.charAt(i - 1) === ' ' || n.charAt(i - 1) === ',' ? 1 : 2)].push(p);
    });
    return tiers[0].concat(tiers[1], tiers[2]).slice(0, MAX);
  }
  function mark(name, q) {
    q = q.trim();
    var i = name.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1 || !q) return esc(name);
    return esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + q.length)) + '</mark>' + esc(name.slice(i + q.length));
  }
  function km(a, b) {
    var R = 6371, rad = function (x) { return x * Math.PI / 180; }, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function nearest(pt) {
    var best = null, d = Infinity;
    places().forEach(function (p) { var k = km(pt, p); if (k < d) { d = k; best = p; } });
    return { place: best, km: d };
  }
  function fire(input) { input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }

  /* ---- Static map: pixel <-> lat/lng through the tile grid it was stitched from ---- */
  var M = window.KINETIX_MAP, mapDialog = null, mapFor = null, mapPin = null, mapSearch = null;
  function toPx(pt) {
    var n = Math.pow(2, M.zoom), lat = pt.lat * Math.PI / 180;
    return { x: ((pt.lng + 180) / 360 * n - M.x0) * 256, y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2 * n - M.y0) * 256 };
  }
  function toLatLng(px) {
    var n = Math.pow(2, M.zoom);
    return { lng: (px.x / 256 + M.x0) / n * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * (px.y / 256 + M.y0) / n))) * 180 / Math.PI };
  }
  function buildMap() {
    var d = document.createElement('dialog');
    d.className = 'modal modal--map'; d.id = 'map-modal'; d.setAttribute('aria-labelledby', 'map-title');
    d.innerHTML =
      '<div class="modal__card map-card">' +
        '<button type="button" class="btn-icon modal__close" data-map-close aria-label="Close">' + X + '</button>' +
        '<div><h2 class="modal__title" id="map-title">Choose on map</h2><p class="small muted">Search a place, or tap anywhere on the map to drop a pin.</p></div>' +
        '<div class="input-wrap map-card__search">' + SEARCH + '<input class="input" id="map-search" type="text" placeholder="Search places…" autocomplete="off" aria-label="Search places"></div>' +
        '<div class="map" id="map-view" role="application" aria-label="Map of Bhimavaram. Click to place a pin."><div class="map__canvas" style="width:' + M.width + 'px;height:' + M.height + 'px">' +
          '<img src="' + M.image + '" alt="" width="' + M.width + '" height="' + M.height + '" draggable="false"><span class="map__pin" id="map-pin" hidden>' + MARKER + '</span></div></div>' +
        '<div class="map-card__foot"><p class="map__caption" id="map-caption">Tap the map to drop a pin.</p><span class="tiny muted">© OpenStreetMap contributors</span></div>' +
        '<div class="row map-card__actions"><button type="button" class="btn btn--primary" id="map-use" disabled>Use this location</button><button type="button" class="btn btn--ghost" data-map-close>Cancel</button></div>' +
      '</div>';
    document.body.appendChild(d);
    var view = d.querySelector('#map-view'), canvas = d.querySelector('.map__canvas'), pinEl = d.querySelector('#map-pin'), cap = d.querySelector('#map-caption'), use = d.querySelector('#map-use');
    mapSearch = d.querySelector('#map-search');

    function place(pt, scroll) {
      var px = toPx(pt), near = nearest(pt);
      mapPin = { lat: Math.round(pt.lat * 10000) / 10000, lng: Math.round(pt.lng * 10000) / 10000, near: near };
      pinEl.style.left = px.x + 'px'; pinEl.style.top = px.y + 'px'; pinEl.hidden = false;
      cap.textContent = (near.place && near.km < 3 ? 'Pin near ' + near.place.name + ' · ' + (near.km < 0.1 ? 'right there' : near.km.toFixed(1) + ' km away') : 'Pin dropped') + ' · ' + mapPin.lat + ', ' + mapPin.lng;
      use.disabled = false;
      if (scroll) { view.scrollLeft = px.x - view.clientWidth / 2; view.scrollTop = px.y - view.clientHeight / 2; }
    }
    canvas.addEventListener('click', function (e) {
      var r = canvas.getBoundingClientRect();
      place(toLatLng({ x: e.clientX - r.left, y: e.clientY - r.top }));
    });
    attach(mapSearch, { noMap: true });
    mapSearch.addEventListener('change', function () { var p = exact(mapSearch.value); if (p) place(p, true); });
    use.addEventListener('click', function () {
      if (!mapPin || !mapFor) return;
      var label = mapPin.near.place && mapPin.near.km < 3 ? 'Map pin near ' + mapPin.near.place.name : 'Map pin';
      mapFor.value = label + ' (' + mapPin.lat + ', ' + mapPin.lng + ')';
      d.close(); fire(mapFor); mapFor.focus();
    });
    d.querySelectorAll('[data-map-close]').forEach(function (b) { b.addEventListener('click', function () { d.close(); }); });
    d.place = place; d.pinEl = pinEl; d.cap = cap; d.use = use; d.view = view;
    return d;
  }
  function openMap(input) {
    if (!M) return;
    mapDialog = mapDialog || buildMap();
    mapFor = input; mapPin = null;
    mapSearch.value = '';
    var start = pinOf(input.value) || exact(input.value);
    if (start) mapDialog.place(start, true);
    else { // fresh: centre on town, no pin yet
      mapDialog.pinEl.hidden = true; mapDialog.use.disabled = true; mapDialog.cap.textContent = 'Tap the map to drop a pin.';
      var c = toPx({ lat: 16.544, lng: 81.527 });
      mapDialog.showModal();
      mapDialog.view.scrollLeft = c.x - mapDialog.view.clientWidth / 2; mapDialog.view.scrollTop = c.y - mapDialog.view.clientHeight / 2;
      mapSearch.focus();
      return;
    }
    mapDialog.showModal();
    var px = toPx(start); mapDialog.view.scrollLeft = px.x - mapDialog.view.clientWidth / 2; mapDialog.view.scrollTop = px.y - mapDialog.view.clientHeight / 2;
    mapSearch.focus();
  }

  /* ---- The list under an input ---- */
  function attach(input, opts) {
    opts = opts || {};
    var wrap = input.closest('.input-wrap') || input.parentNode, id = 'picker-' + (++count), withMap = !opts.noMap && !!M;
    var list = document.createElement('ul');
    list.className = 'picker'; list.id = id; list.setAttribute('role', 'listbox'); list.hidden = true;
    wrap.appendChild(list);
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox'); input.setAttribute('aria-controls', id); input.setAttribute('aria-expanded', 'false');
    var rows = [], active = -1, picking = false;

    function close() { list.hidden = true; list.innerHTML = ''; rows = []; active = -1; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
    function open() {
      if (picking) return;
      var q = input.value, found = search(q);
      if (!q.trim() && !withMap) { close(); return; }
      rows = (withMap ? [{ map: true }] : []).concat(found.map(function (p) { return { place: p }; })); // map first, as the default option
      list.innerHTML = rows.map(function (r, i) {
        return r.map
          ? '<li class="picker__item picker__item--map" role="option" id="' + id + '-' + i + '" aria-selected="false">' + MAP + '<span class="picker__name">Choose on map</span><span class="picker__kind">Drop a pin</span></li>'
          : '<li class="picker__item" role="option" id="' + id + '-' + i + '" aria-selected="false">' + PIN + '<span class="picker__name">' + mark(r.place.name, q) + '</span>' + (r.place.kind ? '<span class="picker__kind">' + esc(r.place.kind) + '</span>' : '') + '</li>';
      }).join('') + (q.trim() && !found.length ? '<li class="picker__empty">No places match "' + esc(q.trim()) + '"</li>' : '');
      list.hidden = false; input.setAttribute('aria-expanded', 'true');
      setActive(-1);
    }
    function setActive(i) {
      active = i;
      var els = list.querySelectorAll('.picker__item');
      for (var k = 0; k < els.length; k++) els[k].setAttribute('aria-selected', String(k === i));
      if (i >= 0) { input.setAttribute('aria-activedescendant', id + '-' + i); els[i].scrollIntoView({ block: 'nearest' }); }
      else input.removeAttribute('aria-activedescendant');
    }
    function pick(i) {
      var r = rows[i];
      if (!r) return;
      close();
      if (r.map) { openMap(input); return; }
      input.value = r.place.name;
      picking = true; fire(input); picking = false; // the programmatic input event must not reopen the list
    }

    input.addEventListener('input', open);
    input.addEventListener('focus', function () { if (!exact(input.value) && !pinOf(input.value)) open(); }); // empty field: just the map option
    input.addEventListener('blur', function () { setTimeout(close, 120); }); // let a click on a row land first
    input.addEventListener('keydown', function (e) {
      if (list.hidden) { if (e.key === 'ArrowDown') { open(); e.preventDefault(); } return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(rows.length ? (active + 1) % rows.length : -1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(rows.length ? (active - 1 + rows.length) % rows.length : -1); }
      else if (e.key === 'Enter') {
        var placeRows = [], k; for (k = 0; k < rows.length; k++) if (rows[k].place) placeRows.push(k);
        if (active >= 0) { e.preventDefault(); pick(active); } else if (placeRows.length === 1) { e.preventDefault(); pick(placeRows[0]); }
      }
      else if (e.key === 'Escape') { close(); }
    });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep focus on the input
    list.addEventListener('click', function (e) {
      var row = e.target.closest('.picker__item');
      if (row) pick(Array.prototype.indexOf.call(list.querySelectorAll('.picker__item'), row));
    });
  }

  function init() { document.querySelectorAll('input[data-places]').forEach(function (i) { attach(i); }); }
  window.Picker = { attach: attach, openMap: openMap };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
