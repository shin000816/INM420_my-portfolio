/* ============================================================
   Alex Rivera — Portfolio  |  js/main.js
   Final polished pass — March 2026

   Contents
   ────────
   1. Performance helpers  (debounce, raf-throttle)
   2. Cursor glow          (lerp-smoothed, GPU-only)
   3. Navbar scroll state  (glassmorphism trigger)
   4. Scroll progress bar  (% read indicator)
   5. Mobile nav           (drawer + backdrop + Escape key)
   6. Smooth scrolling     (offset for fixed nav, all anchors)
   7. Scroll reveal        (.scroll-reveal + .animate-on-scroll)
   8. Active nav link      (IntersectionObserver, no scroll listener)

   Design principles
   ─────────────────
   • Every animation touches only  opacity  or  transform
     (compositor-only — no layout or paint on animation frames).
   • All scroll listeners are  { passive: true }.
   • IntersectionObserver is used instead of scroll listeners
     wherever possible.
   • Each feature is an IIFE so nothing leaks to global scope.
   ============================================================ */


/* ── 1. Performance helpers ─────────────────────────────────
   rafThrottle: wraps a callback so it fires at most once per
   animation frame. Used for scroll + resize handlers.
   ---------------------------------------------------------- */
function rafThrottle(fn) {
  let ticking = false;
  return function (...args) {
    if (!ticking) {
      requestAnimationFrame(() => {
        fn.apply(this, args);
        ticking = false;
      });
      ticking = true;
    }
  };
}


/* ── 2. Cursor Glow ─────────────────────────────────────────
   A large radial-gradient div trails the cursor using lerp
   (linear interpolation) on each rAF tick — giving a soft,
   dreamy feel rather than snapping to exact cursor position.

   Only active on fine-pointer (mouse) devices.
   The CSS uses `pointer-events: none` so it never blocks clicks.
   ---------------------------------------------------------- */
(function initCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;

  /* Skip on touch-only devices */
  if (!window.matchMedia('(pointer: fine)').matches) return;

  let mouseX = window.innerWidth  / 2;
  let mouseY = window.innerHeight / 2;
  let glowX  = mouseX;
  let glowY  = mouseY;

  /* Capture true cursor position on every mousemove */
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  /* Fade in on first move — avoids a flash at (0, 0) on load */
  document.addEventListener('mousemove', () => {
    glow.style.opacity = '1';
  }, { once: true });

  /* Hide when cursor leaves / re-enters the window */
  document.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { glow.style.opacity = '1'; });

  /* LERP factor — 0.095 ≈ 9.5% of remaining distance per frame.
     Lower = lazier trail, higher = snappier.                     */
  const LERP = 0.095;

  function tick() {
    /* Ease glowX/glowY toward the real mouse position */
    glowX += (mouseX - glowX) * LERP;
    glowY += (mouseY - glowY) * LERP;

    /* translate3d keeps this on the GPU compositor layer */
    glow.style.transform =
      `translate3d(calc(${glowX}px - 50%), calc(${glowY}px - 50%), 0)`;

    requestAnimationFrame(tick);
  }
  tick();
}());


/* ── 3. Navbar scroll state ─────────────────────────────────
   Adds .scrolled to <header#navbar> when scrollY > 60 px.
   CSS responds with backdrop-filter blur + border-bottom.
   rafThrottle keeps it off the main thread between frames.
   ---------------------------------------------------------- */
(function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const THRESHOLD = 60;

  const update = rafThrottle(() => {
    navbar.classList.toggle('scrolled', window.scrollY > THRESHOLD);
  });

  window.addEventListener('scroll', update, { passive: true });
  update(); /* run once in case page loads already scrolled */
}());


/* ── 4. Scroll progress bar ─────────────────────────────────
   .nav-progress width = scrollY / (scrollHeight - innerHeight).
   Capped at 100 %. rafThrottle prevents multiple rAF calls
   per frame when the user scrolls very fast.
   ---------------------------------------------------------- */
(function initScrollProgress() {
  const bar = document.getElementById('navProgress');
  if (!bar) return;

  const update = rafThrottle(() => {
    const scrolled   = window.scrollY;
    const maxScroll  = document.documentElement.scrollHeight - window.innerHeight;
    const pct        = maxScroll > 0
                       ? Math.min((scrolled / maxScroll) * 100, 100)
                       : 0;
    bar.style.width  = pct + '%';
  });

  window.addEventListener('scroll', update, { passive: true });
  update();
}());


/* ── 5. Mobile nav ──────────────────────────────────────────
   Manages three elements together:
     #navToggle    hamburger ↔ × button
     #navLinks     side drawer panel
     #navBackdrop  dark overlay

   Close triggers: button click, backdrop click, any nav link
   click, Escape key, resize past mobile breakpoint (700 px).
   ---------------------------------------------------------- */
(function initMobileNav() {
  const toggle   = document.getElementById('navToggle');
  const drawer   = document.getElementById('navLinks');
  const backdrop = document.getElementById('navBackdrop');
  if (!toggle || !drawer) return;

  let isOpen = false;

  function openMenu() {
    isOpen = true;
    drawer.classList.add('open');
    toggle.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
    document.body.style.overflow = 'hidden'; /* prevent background scroll */
    /* Move focus into the drawer for keyboard users */
    const firstLink = drawer.querySelector('a');
    if (firstLink) firstLink.focus();
  }

  function closeMenu() {
    isOpen = false;
    drawer.classList.remove('open');
    toggle.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    document.body.style.overflow = '';
  }

  /* Hamburger click — toggle */
  toggle.addEventListener('click', () => {
    isOpen ? closeMenu() : openMenu();
  });

  /* Backdrop tap closes drawer */
  if (backdrop) backdrop.addEventListener('click', closeMenu);

  /* Any link inside the drawer closes it */
  drawer.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  /* Escape key closes drawer */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeMenu();
      toggle.focus(); /* return focus to the button that opened it */
    }
  });

  /* Auto-close when viewport grows past mobile breakpoint */
  window.addEventListener('resize', rafThrottle(() => {
    if (window.innerWidth > 700 && isOpen) closeMenu();
  }));
}());


/* ── 6. Smooth scrolling ────────────────────────────────────
   Intercepts every in-page anchor click globally:
   - Reads --nav-height from the CSS token so the offset
     always stays in sync with the CSS without duplication.
   - href="#" alone → scroll to top (footer back-to-top).
   - Unknown hash → browser handles natively (no override).
   ---------------------------------------------------------- */
(function initSmoothScroll() {
  function getNavHeight() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--nav-height')
      .trim();
    return parseInt(raw, 10) || 72;
  }

  document.addEventListener('click', (e) => {
    /* Walk up DOM — click may have landed on a child (icon, span…) */
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const href = link.getAttribute('href');

    /* "#" alone = back to top */
    if (href === '#') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      /* Return focus to top so keyboard users don't get lost */
      document.getElementById('main-content')?.focus();
      return;
    }

    const target = document.querySelector(href);
    if (!target) return; /* let browser handle unknown hash */

    e.preventDefault();

    const navOffset   = getNavHeight();
    const extraOffset = parseInt(link.dataset.scrollOffset || '0', 10);
    const targetTop   = target.getBoundingClientRect().top
                        + window.scrollY
                        - navOffset
                        - extraOffset;

    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  });
}());


/* ── 7. Scroll reveal ───────────────────────────────────────
   One IntersectionObserver handles both class systems:
     .scroll-reveal     → .is-visible   (legacy system)
     .animate-on-scroll → .animated     (newer system)

   Unified so all existing and new markup works identically.
   One-shot: unobserve after first trigger for performance.
   ---------------------------------------------------------- */
(function initScrollReveal() {
  const elements = document.querySelectorAll(
    '.scroll-reveal, .animate-on-scroll'
  );
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;

        if (el.classList.contains('scroll-reveal'))     el.classList.add('is-visible');
        if (el.classList.contains('animate-on-scroll')) el.classList.add('animated');

        observer.unobserve(el); /* fire once only */
      });
    },
    {
      /* 10 % of element visible; -64px bottom margin means
         animation starts just before the element fully enters */
      threshold:  0.10,
      rootMargin: '0px 0px -64px 0px',
    }
  );

  elements.forEach((el) => observer.observe(el));
}());


/* ── 8. Active nav link ─────────────────────────────────────
   Uses IntersectionObserver on each target <section> — not
   a scroll listener — so it only fires on intersection
   changes rather than on every scrolled pixel.

   Tracks a Set of currently-visible section IDs.
   On each change it finds the visible section whose top edge
   is closest to the top of the viewport and marks that
   section's nav link with .nav-link--active.
   ---------------------------------------------------------- */
(function initActiveNav() {
  const navLinks = Array.from(
    document.querySelectorAll('.nav-links .nav-link[href^="#"]')
  );
  if (!navLinks.length) return;

  /* Map: sectionId → <a> element */
  const linkMap = new Map();
  navLinks.forEach((link) => {
    const id = link.getAttribute('href').slice(1);
    if (id) linkMap.set(id, link);
  });

  const visible = new Set(); /* sections currently intersecting */

  function setActive() {
    if (!visible.size) {
      navLinks.forEach((l) => l.classList.remove('nav-link--active'));
      return;
    }

    /* Find the visible section with its top edge closest to 0 */
    let bestId   = null;
    let bestDist = Infinity;

    visible.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const dist = Math.abs(el.getBoundingClientRect().top);
      if (dist < bestDist) { bestDist = dist; bestId = id; }
    });

    navLinks.forEach((link) => {
      const id = link.getAttribute('href').slice(1);
      link.classList.toggle('nav-link--active', id === bestId);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        entry.isIntersecting ? visible.add(id) : visible.delete(id);
      });
      setActive();
    },
    { threshold: 0.20 }
  );

  /* Only observe sections that have a matching nav link */
  linkMap.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}());