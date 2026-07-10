/**
 * Animations Module
 * Handles scroll reveal animations, animated counters, and particle background.
 */
const Animations = (() => {
  'use strict';

  // ── Scroll Reveal ──────────────────────────────────────────────────────
  // Adds 'active' class to .reveal elements when they enter the viewport.
  function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal:not(.active)');
    if (!revealElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealElements.forEach((el) => observer.observe(el));
  }

  // ── Animated Counters ──────────────────────────────────────────────────
  // Counts from 0 → data-target over ~2 s with easeOutExpo easing.
  // Formats numbers using Indian locale (en-IN).
  function animateCounters(container) {
    const selector = '[data-target]';
    const counters = container
      ? container.querySelectorAll(selector)
      : document.querySelectorAll('.stat-number[data-target]');

    counters.forEach((counter) => {
      // Skip if already animated
      if (counter.dataset.animated === 'true') return;

      const target = parseInt(counter.dataset.target, 10);
      if (isNaN(target) || target <= 0) {
        counter.textContent = '0';
        return;
      }

      const duration = 2000;
      const start = performance.now();

      // easeOutExpo: fast start, slow finish
      const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(easeOutExpo(progress) * target);
        counter.textContent = value.toLocaleString('en-IN');

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          counter.textContent = target.toLocaleString('en-IN');
          counter.dataset.animated = 'true';
        }
      }

      requestAnimationFrame(update);
    });
  }

  // ── Counter Observer ───────────────────────────────────────────────────
  // Triggers counter animation when the stats section scrolls into view.
  function initCounterObserver() {
    const statsSection = document.getElementById('statsSection');
    if (!statsSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounters(statsSection);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(statsSection);
  }

  // ── Particle Canvas ────────────────────────────────────────────────────
  // Floating dots with proximity-based connections rendered on #particleCanvas.
  function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId = null;
    let isRunning = true;

    const PARTICLE_COUNT = 80;
    const CONNECTION_DISTANCE = 120;

    // ── Helpers ──
    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    }

    function createParticle() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      };
    }

    function initParticleArray() {
      resize();
      particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
    }

    function animate() {
      if (!isRunning) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Clamp to canvas bounds
        p.x = Math.max(0, Math.min(canvas.width, p.x));
        p.y = Math.max(0, Math.min(canvas.height, p.y));

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(37, 99, 235, ${p.opacity})`;
        ctx.fill();

        // Draw connections to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    }

    // ── Lifecycle ──
    const resizeHandler = () => resize();
    window.addEventListener('resize', resizeHandler);

    initParticleArray();
    animate();

    // Return cleanup function
    return () => {
      isRunning = false;
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeHandler);
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────
  return {
    initScrollReveal,
    animateCounters,
    initCounterObserver,
    initParticles,
  };
})();
