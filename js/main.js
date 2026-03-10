/* ============================================================
   Alex Rivera — Portfolio
   js/main.js

   Contents:
   1. Cursor glow  — follows mouse with lerp smoothing
   2. Navbar       — adds .scrolled class on scroll
   3. Mobile nav   — toggle open/close hamburger menu
   ============================================================ */


/* ── 1. Cursor Glow ─────────────────────────────────────────
   Uses requestAnimationFrame + linear interpolation (lerp)
   so the glow drifts lazily rather than snapping to the cursor.
   Only runs on fine-pointer (mouse) devices.
   ---------------------------------------------------------- */
(function initCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;

  /* Only activate for mouse users */
  if (!window.matchMedia('(pointer: fine)').matches) return;

  let mouseX = window.innerWidth  / 2;
  let mouseY = window.innerHeight / 2;
  let glowX  = mouseX;
  let glowY  = mouseY;

  /* Track real cursor position */
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  /* Fade in after first mousemove so it doesn't flash at 0,0 */
  document.addEventListener('mousemove', () => {
    glow.style.opacity = '1';
  }, { once: true });

  /* Hide while cursor is outside the window */
  document.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { glow.style.opacity = '1'; });

  /* Lerp factor — lower = lazier trail */
  const LERP = 0.095;

  function tick() {
    glowX += (mouseX - glowX) * LERP;
    glowY += (mouseY - glowY) * LERP;

    /* translate3d keeps this on the GPU */
    glow.style.transform = `translate3d(calc(${glowX}px - 50%), calc(${glowY}px - 50%), 0)`;

    requestAnimationFrame(tick);
  }
  tick();
}());


/* ── 2. Navbar scroll state ─────────────────────────────────
   Adds .scrolled to <header> once the page scrolls past 60px,
   which triggers the glassmorphism styles in CSS.
   ---------------------------------------------------------- */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const THRESHOLD = 60;

  function onScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > THRESHOLD);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); /* run once on load in case page is pre-scrolled */
}());


/* ── 3. Mobile nav toggle ───────────────────────────────────
   Toggles .open on both the nav-links panel and the hamburger
   button. Also locks body scroll while the menu is open and
   closes the menu when any nav link is clicked.
   ---------------------------------------------------------- */
(function initMobileNav() {
  const toggle   = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (!toggle || !navLinks) return;

  function openMenu() {
    navLinks.classList.add('open');
    toggle.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    navLinks.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });

  /* Close when a nav link is tapped */
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  /* Close on outside tap */
  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !toggle.contains(e.target)) {
      closeMenu();
    }
  });

  /* Close if resized back to desktop */
  window.addEventListener('resize', () => {
    if (window.innerWidth > 700) closeMenu();
  });
}());