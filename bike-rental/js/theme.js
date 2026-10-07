// Theme init + toggle. Pages also run a tiny inline copy of the init in <head> to avoid a flash.
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var root = document.documentElement;
  var KEY = 'kinetix-theme';

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function preferred() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function get() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function apply(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist) { try { localStorage.setItem(KEY, theme); } catch (e) {} }
    var next = theme === 'dark' ? 'light' : 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', 'Switch to ' + next + ' theme');
      b.setAttribute('title', 'Switch to ' + next + ' theme');
    });
  }

  // Screenshot helper presets data-theme and must not be overridden
  if (!root.hasAttribute('data-shot')) {
    apply(stored() || preferred(), false);
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!stored()) apply(e.matches ? 'dark' : 'light', false);
      });
    }
  }

  window.Theme = {
    get: get,
    set: function (t) { apply(t === 'dark' ? 'dark' : 'light', true); },
    toggle: function () { apply(get() === 'dark' ? 'light' : 'dark', true); },
    bind: function (btn) {
      if (!btn) return;
      btn.setAttribute('data-theme-toggle', '');
      btn.addEventListener('click', window.Theme.toggle);
      apply(get(), false);
    }
  };
})();
