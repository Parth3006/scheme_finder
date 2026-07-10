/**
 * App Module
 * SPA routing, page transitions, navigation management.
 * Orchestrates all other modules on DOMContentLoaded.
 */
const App = (() => {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────
  let currentPage = 'landing';
  let particleCleanup = null;

  // ── DOM Helpers ────────────────────────────────────────────────────────
  const el = (id) => document.getElementById(id);

  // ── Initialization ─────────────────────────────────────────────────────
  function init() {
    setupNavigation();
    setupMobileMenu();
    setupCTAButtons();

    // Initialize landing page animations
    particleCleanup = Animations.initParticles();
    Animations.initScrollReveal();
    Animations.initCounterObserver();

    // Initialize form
    if (typeof Form !== 'undefined') {
      Form.init();
    }

    // Handle initial hash
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
  }

  // ── Navigation Setup ───────────────────────────────────────────────────
  function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) {
          navigateTo(page);
          closeMobileMenu();
        }
      });
    });
  }

  function setupMobileMenu() {
    const toggle = el('mobileToggle');
    const navLinks = el('navLinks');

    if (toggle && navLinks) {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        navLinks.classList.toggle('open');
      });
    }

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      const toggle = el('mobileToggle');
      const navLinks = el('navLinks');
      if (!toggle || !navLinks) return;

      if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
        closeMobileMenu();
      }
    });
  }

  function closeMobileMenu() {
    el('mobileToggle')?.classList.remove('active');
    el('navLinks')?.classList.remove('open');
  }

  function setupCTAButtons() {
    el('ctaButton')?.addEventListener('click', () => navigateTo('eligibility'));
    el('ctaButton2')?.addEventListener('click', () => navigateTo('eligibility'));
    el('dashboardCta')?.addEventListener('click', () => navigateTo('dashboard'));
  }

  // ── Hash-Based Routing ─────────────────────────────────────────────────
  const VALID_PAGES = ['landing', 'eligibility', 'results', 'dashboard'];

  function handleHashChange() {
    const hash = window.location.hash.slice(1) || 'landing';
    if (VALID_PAGES.includes(hash)) {
      showPage(hash);
    }
  }

  function navigateTo(page) {
    window.location.hash = page;
  }

  // ── Page Transitions ───────────────────────────────────────────────────
  function showPage(page) {
    // Skip if already on this page and it's visible
    if (page === currentPage && document.querySelector('.page.active')) return;

    // Update nav link active states
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.page === page);
    });

    const currentEl = document.querySelector('.page.active');
    const nextEl = el(page);
    if (!nextEl) return;

    // Transition OUT current page
    if (currentEl && currentEl !== nextEl) {
      currentEl.classList.add('leaving');
      currentEl.classList.remove('active');
      setTimeout(() => {
        currentEl.classList.remove('leaving');
        currentEl.style.display = 'none';
      }, 300);
    }

    // Transition IN next page
    nextEl.style.display = 'block';

    // Force a reflow so the entering animation triggers
    void nextEl.offsetHeight;

    nextEl.classList.add('active', 'entering');
    setTimeout(() => nextEl.classList.remove('entering'), 300);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // ── Page-specific hooks ──
    const previousPage = currentPage;
    currentPage = page;

    // Clean up dashboard live updates when leaving
    if (previousPage === 'dashboard' && page !== 'dashboard') {
      if (typeof Dashboard !== 'undefined') Dashboard.cleanup();
    }

    // Initialize dashboard when entering
    if (page === 'dashboard' && typeof Dashboard !== 'undefined') {
      Dashboard.init();
    }

    // Re-observe reveal elements when returning to landing
    if (page === 'landing') {
      Animations.initScrollReveal();
    }

    // Update navbar style based on scroll
    updateNavbarStyle();
  }

  // ── Navbar Scroll Effect ───────────────────────────────────────────────
  function updateNavbarStyle() {
    const navbar = el('navbar');
    if (!navbar) return;

    function onScroll() {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Set initial state
  }

  // ── Public API ─────────────────────────────────────────────────────────
  return { init, navigateTo, showPage };
})();

// ── Bootstrap ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', App.init);
