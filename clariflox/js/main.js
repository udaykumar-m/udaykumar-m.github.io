(function () {
  'use strict';

  /* ---------- Mobile nav ---------- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');

  function setMenu(open) {
    links.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      setMenu(!links.classList.contains('is-open'));
    });

    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setMenu(false);
    });
  }

  /* ---------- Active link on scroll ---------- */
  var navAnchors = Array.prototype.slice.call(document.querySelectorAll('.nav__links a:not(.btn)'));
  // Track every nav target (including the Contact button) so no text link stays
  // highlighted once the visitor has scrolled into the contact section.
  var sections = Array.prototype.slice.call(document.querySelectorAll('.nav__links a'))
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  function setActive() {
    var offset = window.innerHeight * 0.35;
    var current = sections[0];
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= offset) current = sections[i];
    }
    navAnchors.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + current.id);
    });
  }

  if (sections.length) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () { setActive(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
    setActive();
  }

  /* ---------- Toast ---------- */
  var toast = document.getElementById('toast');
  var toastClose = document.getElementById('toastClose');
  var toastTimer = null;

  function showToast() {
    if (!toast) return;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 10000);
  }
  function hideToast() {
    if (!toast) return;
    toast.hidden = true;
    clearTimeout(toastTimer);
  }
  if (toastClose) toastClose.addEventListener('click', hideToast);

  /* ---------- Contact form (front-end only, no sending) ---------- */
  var form = document.getElementById('contactForm');
  var note = document.getElementById('formNote');

  if (form && note) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var fields = Array.prototype.slice.call(form.querySelectorAll('[required]'));
      var firstInvalid = null;

      fields.forEach(function (f) {
        var valid = f.value.trim() !== '' && f.checkValidity();
        f.classList.toggle('is-invalid', !valid);
        if (!valid && !firstInvalid) firstInvalid = f;
      });

      if (firstInvalid) {
        note.className = 'form__note is-error';
        note.textContent = 'Please fill in all required fields.';
        firstInvalid.focus();
        return;
      }

      // No mail backend is wired up: tell the visitor and point them to WhatsApp.
      note.className = 'form__note';
      note.textContent = '';
      showToast();
    });

    form.addEventListener('input', function (e) {
      if (e.target.classList.contains('is-invalid') && e.target.value.trim() !== '') {
        e.target.classList.remove('is-invalid');
      }
    });
  }
})();
