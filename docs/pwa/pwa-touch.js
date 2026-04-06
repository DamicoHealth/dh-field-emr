// ==========================================
// PWA Touch Optimizations for iPad
// ==========================================
(function() {
  'use strict';

  // Prevent pull-to-refresh
  document.body.style.overscrollBehavior = 'none';

  // Prevent double-tap zoom globally
  document.addEventListener('touchend', function(e) {
    // Only prevent on elements that are interactive
    const target = e.target;
    if (target.tagName === 'BUTTON' || target.tagName === 'A' ||
        target.classList.contains('btn-toggle') ||
        target.classList.contains('nav-btn') ||
        target.classList.contains('panel-tab') ||
        target.classList.contains('complaint-btn') ||
        target.classList.contains('temp-range-btn') ||
        target.classList.contains('weight-range-btn') ||
        target.classList.contains('bp-range-btn') ||
        target.classList.contains('dx-preset-btn') ||
        target.classList.contains('rx-preset-btn') ||
        target.classList.contains('provider-btn') ||
        target.classList.contains('procedure-btn') ||
        target.classList.contains('referral-btn') ||
        target.classList.contains('record-card') ||
        target.classList.contains('patient-header') ||
        target.closest('.record-card') ||
        target.closest('.patient-header')) {
      // Let the click handler fire but prevent zoom
    }
  }, { passive: true });

  // Handle virtual keyboard: scroll focused input into view
  if ('visualViewport' in window) {
    let focusedElement = null;

    document.addEventListener('focusin', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        focusedElement = e.target;
      }
    });

    document.addEventListener('focusout', function() {
      focusedElement = null;
    });

    window.visualViewport.addEventListener('resize', function() {
      if (focusedElement) {
        // Small delay to let the keyboard animation finish
        setTimeout(function() {
          if (focusedElement) {
            focusedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    });
  }

  // iOS text input: prevent zoom on focus by ensuring 16px font size
  // (handled in CSS, but reinforce here)
  document.addEventListener('focusin', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      const computed = getComputedStyle(e.target);
      const fontSize = parseFloat(computed.fontSize);
      if (fontSize < 16) {
        e.target.style.fontSize = '16px';
      }
    }
  });

  // Improve touch feedback: add active class on touch for buttons
  let activeTouch = null;
  document.addEventListener('touchstart', function(e) {
    const btn = e.target.closest('button, .record-card, .patient-header, .encounter-card');
    if (btn) {
      activeTouch = btn;
      btn.classList.add('touch-active');
    }
  }, { passive: true });

  document.addEventListener('touchend', function() {
    if (activeTouch) {
      activeTouch.classList.remove('touch-active');
      activeTouch = null;
    }
  }, { passive: true });

  document.addEventListener('touchcancel', function() {
    if (activeTouch) {
      activeTouch.classList.remove('touch-active');
      activeTouch = null;
    }
  }, { passive: true });

  // Standalone mode detection for PWA
  if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
    document.documentElement.classList.add('pwa-standalone');
    console.log('[pwa-touch] Running in standalone PWA mode');
  }

  // Handle orientation changes
  window.addEventListener('orientationchange', function() {
    // Force a slight delay to let the viewport settle
    setTimeout(function() {
      window.scrollTo(0, 0);
      // Re-render charts if on analytics screen
      if (typeof renderAnalytics === 'function') {
        const analyticsScreen = document.getElementById('screen-analytics');
        if (analyticsScreen && analyticsScreen.classList.contains('active')) {
          renderAnalytics();
        }
      }
    }, 300);
  });

  // Service Worker registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js')
        .then(function(registration) {
          console.log('[pwa] Service Worker registered, scope:', registration.scope);

          // Check for updates periodically (every 30 minutes)
          setInterval(function() {
            registration.update();
          }, 30 * 60 * 1000);

          // Notify user of updates
          registration.addEventListener('updatefound', function() {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', function() {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                if (confirm('A new version of DH Field EMR is available. Reload to update?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch(function(error) {
          console.warn('[pwa] Service Worker registration failed:', error);
        });
    });
  }

  console.log('[pwa-touch] Touch optimizations loaded');
})();
