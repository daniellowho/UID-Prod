/**
 * Apple-inspired micro-interactions
 * Scroll reveal, card glow, button press, theme toggle
 */

(function () {
  'use strict';

  /* ── Default dark theme ── */
  (function applyDefaultTheme() {
    const saved = localStorage.getItem('theme');
    if (!saved) {
      localStorage.setItem('theme', 'dark');
    }
    document.documentElement.setAttribute('data-theme', saved || 'dark');
  })();

  /* ── Scroll reveal ── */
  function initScrollReveal() {
    const revealTargets = document.querySelectorAll(
      '.event-card, .stat-card, .analytics-card, .registration-item, ' +
      '.admin-event-item, .profile-card, .request-item, .user-item'
    );

    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    revealTargets.forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${i * 0.06}s`);
      el.classList.add('will-reveal');
      observer.observe(el);
    });
  }

  /* ── Card glow on hover (cursor-relative) ── */
  function initCardGlow() {
    document.querySelectorAll('.event-card, .stat-card, .analytics-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--glow-x', `${x}%`);
        card.style.setProperty('--glow-y', `${y}%`);
        card.classList.add('glow-active');
      });
      card.addEventListener('mouseleave', () => {
        card.classList.remove('glow-active');
      });
    });
  }

  /* ── Button press haptic-feel ── */
  function initButtonPress() {
    document.querySelectorAll('.btn').forEach((btn) => {
      btn.addEventListener('mousedown', () => {
        btn.style.transform = 'scale(0.96)';
      });
      btn.addEventListener('mouseup', () => {
        btn.style.transform = '';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* ── Navbar scroll effect ── */
  function initNavbar() {
    const navbar = document.getElementById('navbar') || document.querySelector('.navbar');
    if (!navbar) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
          } else {
            navbar.classList.remove('scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /* ── Theme toggle sync across pages ── */
  function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    const sunIcon = toggle.querySelector('.sun-icon');
    const moonIcon = toggle.querySelector('.moon-icon');

    function syncIcons(theme) {
      if (!sunIcon || !moonIcon) return;
      if (theme === 'dark') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      }
    }

    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    syncIcons(current);

    toggle.addEventListener('click', () => {
      const now = document.documentElement.getAttribute('data-theme');
      const next = now === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      syncIcons(next);
    });
  }

  /* ── Init on DOM ready ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    initScrollReveal();
    initCardGlow();
    initButtonPress();
    initNavbar();
    initThemeToggle();
  }
})();
