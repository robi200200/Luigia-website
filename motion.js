/* Rivelazione progressiva delle sezioni + stato della barra di navigazione.
   Regole di sicurezza: se qualcosa non parte, il contenuto torna comunque visibile. */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var root = document.documentElement;
  root.classList.add('js-motion');

  var watched = [];
  var io = null;

  function reveal(el) {
    if (el.__revealed) return;
    el.__revealed = true;
    el.classList.add('is-in');
    if (io) io.unobserve(el);
  }

  function revealAll() {
    for (var i = 0; i < watched.length; i++) reveal(watched[i]);
  }

  /* rete di sicurezza: dopo un attimo nulla resta nascosto */
  setTimeout(function () { root.classList.remove('js-motion'); revealAll(); }, 4000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') schedule();
  });

  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) reveal(entries[i].target);
      }
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0.03 });
  }

  function check() {
    var h = window.innerHeight || root.clientHeight || 800;
    for (var i = 0; i < watched.length; i++) {
      var el = watched[i];
      if (el.__revealed) continue;
      if (!el.isConnected) { el.__revealed = true; continue; }
      if (el.getBoundingClientRect().top < h * 0.94) reveal(el);
    }
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; check(); navState(); });
  }

  function register(el) {
    if (el.__revealBound) return;
    el.__revealBound = true;
    if (el.hasAttribute('data-stagger')) {
      for (var i = 0; i < el.children.length; i++) {
        el.children[i].style.animationDelay = Math.min(i * 80, 480) + 'ms';
      }
    }
    watched.push(el);
    if (io) io.observe(el);
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches && node.matches('[data-reveal],[data-stagger]')) register(node);
    if (node.querySelectorAll) {
      var found = node.querySelectorAll('[data-reveal],[data-stagger]');
      for (var i = 0; i < found.length; i++) register(found[i]);
    }
    schedule();
  }

  function navState() {
    /* il documento può non essere l'elemento che scorre: cerca l'antenato scrollabile */
    var y = window.scrollY || window.pageYOffset || 0;
    if (!y) {
      var nav = document.querySelector('.nav');
      if (nav) {
        var p = nav.parentNode;
        while (p && p.nodeType === 1) {
          if (p.scrollTop) { y = p.scrollTop; break; }
          p = p.parentNode;
        }
      }
    }
    var navs = document.querySelectorAll('.nav');
    for (var i = 0; i < navs.length; i++) navs[i].classList.toggle('is-scrolled', y > 12);
  }

  /* lo scroll può avvenire su un contenitore interno: ascolto in fase di cattura */
  document.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule, { passive: true });

  function boot() {
    scan(document.body);
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) scan(added[j]);
      }
    }).observe(root, { childList: true, subtree: true });

    var ticks = 0;
    var timer = setInterval(function () {
      check();
      if (++ticks > 16) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
