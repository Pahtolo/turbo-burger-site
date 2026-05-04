// ─────────────────────────────────────────────────────────────────
//  main.js
//  Scroll choreography, theme transition, magnetic cursor, reveals.
//  Talks to arm-scene.js to drive the 3D scenes.
// ─────────────────────────────────────────────────────────────────

import { createHeroScene, createTurntableScene } from './arm-scene.js';

// Honor reduced motion — degrade gracefully.
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─────────────────────────────────────────────────────────────────
//  Smooth scroll progress utility
//  We use rAF + getBoundingClientRect rather than IntersectionObserver
//  because IO doesn't give continuous progress, and we need 1:1 scroll.
// ─────────────────────────────────────────────────────────────────
const tickers = [];
function addTicker(fn) { tickers.push(fn); }

function loop() {
  for (const fn of tickers) fn();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ─────────────────────────────────────────────────────────────────
//  Scroll-spy for top nav (kept from original)
// ─────────────────────────────────────────────────────────────────
(function navScrollSpy() {
  const links = document.querySelectorAll('nav.links a');
  const sectionIds = ['#overview', '#system', '#cycle', '#demo', '#team'];
  const sections = sectionIds.map(id => document.querySelector(id)).filter(Boolean);
  const linkFor = href => document.querySelector(`nav.links a[href="${href}"]`);
  const setActive = href => {
    links.forEach(a => a.classList.remove('active'));
    const el = linkFor(href);
    if (el) el.classList.add('active');
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive('#' + e.target.id);
      });
    }, { rootMargin: '-50% 0px -45% 0px', threshold: 0 });
    sections.forEach(s => io.observe(s));
  }
})();

// ─────────────────────────────────────────────────────────────────
//  Split-text setup: any [data-split] gets per-line wrappers so each
//  line can slide up from below behind its own clip mask.
//  MUST run before the reveal observer so .split elements exist.
// ─────────────────────────────────────────────────────────────────
(function splitText() {
  document.querySelectorAll('[data-split]').forEach(el => {
    const html = el.innerHTML.trim();
    const parts = html.split(/<br\s*\/?>(?:\s*)/i);
    el.classList.add('split');
    el.innerHTML = parts.map((p, i) =>
      `<span class="line l${i+1}"><span class="inner">${p}</span></span>`
    ).join('');
  });
})();

// ─────────────────────────────────────────────────────────────────
//  Reveal-on-scroll for any .reveal / .split / [data-reveal] element.
//  IMPORTANT: anything already in viewport on first paint must
//  reveal on next frame — IntersectionObserver does fire for these,
//  but only after layout, so we also do a forced sweep on load.
// ─────────────────────────────────────────────────────────────────
(function reveals() {
  const els = document.querySelectorAll('.reveal, .split, [data-reveal]');
  if (!('IntersectionObserver' in window)) {
    els.forEach(e => { e.classList.add('in'); });
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
  els.forEach(e => io.observe(e));

  // Belt-and-suspenders: for elements visible at first paint, force-reveal
  // them after one frame so the title doesn't get stuck if the IO is slow.
  requestAnimationFrame(() => {
    els.forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        e.classList.add('in');
        io.unobserve(e);
      }
    });
  });
})();

// ─────────────────────────────────────────────────────────────────
//  Magnetic / blended cursor (skipped on touch + reduced motion)
// ─────────────────────────────────────────────────────────────────
(function cursor() {
  if (REDUCED) return;
  if (matchMedia('(hover: none)').matches || matchMedia('(pointer: coarse)').matches) return;

  const dot = document.createElement('div'); dot.className = 'cursor-dot';
  const ring = document.createElement('div'); ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let dx = mx, dy = my, rx = mx, ry = my;
  let ready = false;

  window.addEventListener('mousemove', e => {
    if (!ready) {
      ready = true;
      document.body.classList.add('cursor-ready');
    }
    mx = e.clientX; my = e.clientY;
  }, { passive: true });

  // Magnetic targets
  const magnetic = document.querySelectorAll('a, button, .btn, .nav-cta, .ov-cell, .tile, .member');
  magnetic.forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });

  addTicker(() => {
    dx += (mx - dx) * 0.6;   // dot is snappier
    dy += (my - dy) * 0.6;
    rx += (mx - rx) * 0.18;  // ring trails
    ry += (my - ry) * 0.18;
    dot.style.transform = `translate3d(${dx - 3}px, ${dy - 3}px, 0)`;
    ring.style.transform = `translate3d(${rx - 18}px, ${ry - 18}px, 0)`;
  });
})();

// ─────────────────────────────────────────────────────────────────
//  Hero 3D scene mount
// ─────────────────────────────────────────────────────────────────
(function heroScene() {
  if (REDUCED) return;
  const mount = document.getElementById('heroStage');
  if (!mount) return;
  // Defer to next frame so layout is settled
  requestAnimationFrame(() => createHeroScene(mount));
})();

// ─────────────────────────────────────────────────────────────────
//  THEME CONTROLLER — keeps the dark act tied to the pinned 3D
//  arm/patty moment, then returns the page to the warm theme as soon
//  as that turntable scene has passed.
// ─────────────────────────────────────────────────────────────────
(function themeController() {
  const tt = document.getElementById('turntable');
  if (!tt) return;

  function update() {
    const r = tt.getBoundingClientRect();
    const center = window.innerHeight * 0.52;
    const dark = r.top < center && r.bottom > center;
    document.body.classList.toggle('dark-active', dark);
    document.documentElement.style.setProperty('--t', dark ? 1 : 0);
  }
  addTicker(update);
})();

// ─────────────────────────────────────────────────────────────────
//  TURNTABLE — the big scroll-pinned 3D moment
//  Drives:
//    - turntable.setProgress(0..1) for rotation and cook color
//    - the warm→dark theme transition (body class + --t)
//    - the pinned-section progress bar in the HUD
// ─────────────────────────────────────────────────────────────────
(function turntable() {
  const section = document.getElementById('turntable');
  if (!section) return;
  const mount = section.querySelector('.stage-3d');
  const bar = section.querySelector('.tt-progress .bar');
  const focusLabel = section.querySelector('[data-focus]');

  let scene = null;
  if (!REDUCED) {
    scene = createTurntableScene(mount);
  } else {
    // Reduced-motion fallback: just leave a static placeholder
    mount.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;
      justify-content:center;color:#f1e9d8;font-family:var(--mono);font-size:11px;letter-spacing:.2em;
      opacity:.5;text-transform:uppercase">// Animation disabled — reduced motion</div>`;
  }

  function update() {
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 = top of section just touching the top of the viewport,
    // 1 = bottom of section about to leave the top of the viewport
    const total = section.offsetHeight - vh;
    const scrolled = -r.top;
    let p = scrolled / total;
    p = Math.max(0, Math.min(1, p));

    if (scene) scene.setProgress(p);
    if (bar) bar.style.width = `${(p * 100).toFixed(2)}%`;

    // Focus indicator — which side is up front.
    const pattyForward = Math.cos(p * Math.PI * 2) > 0;
    if (focusLabel) {
      focusLabel.textContent = pattyForward ? 'FOCUS · PATTY' : 'FOCUS · ARM';
    }
  }

  addTicker(update);
})();

// ─────────────────────────────────────────────────────────────────
//  Tilt-on-hover for cards (subtle — igloo-style depth cue)
// ─────────────────────────────────────────────────────────────────
(function tiltCards() {
  if (REDUCED) return;
  const cards = document.querySelectorAll('.ov-cell, .member, .tile');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - 0.5;
      const py = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform =
        `perspective(800px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 4).toFixed(2)}deg) translateY(-3px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

// ─────────────────────────────────────────────────────────────────
//  Smooth-scroll for in-page anchor clicks
// ─────────────────────────────────────────────────────────────────
(function smoothAnchors() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href === '#' || href.length < 2) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  });
})();
