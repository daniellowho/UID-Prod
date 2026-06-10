/**
 * Minimal EventHub micro-interactions
 * Scroll reveal, cursor glow, button press, navbar polish
 */

(function () {
  'use strict';

  /* ── Minimal light-first theme ── */
  (function applyDefaultTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  })();

  /* ── Scroll reveal ── */
  function initScrollReveal() {
    const revealTargets = document.querySelectorAll(
      '.event-card, .stat-card, .analytics-card, .registration-item, ' +
      '.admin-event-item, .profile-card, .request-item, .user-item, ' +
      '.review-card, .feedback-form-card, .auth-box, .detail-info-item'
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
    document.querySelectorAll('.event-card, .stat-card, .analytics-card, .review-card, .card').forEach((card) => {
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
  }
})();
