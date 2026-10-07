// One-time fade-up reveal for .reveal elements
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var instant = root.hasAttribute('data-shot') || reduced || !('IntersectionObserver' in window);
  var io = null;

  function showAll() {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }

  if (!instant) {
    root.classList.add('has-reveal');
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  }

  function refresh() {
    if (instant) { showAll(); return; }
    document.querySelectorAll('.reveal:not(.is-visible):not([data-reveal-seen])').forEach(function (el) {
      el.setAttribute('data-reveal-seen', '');
      io.observe(el);
    });
  }

  window.Reveal = { refresh: refresh, instant: instant };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
