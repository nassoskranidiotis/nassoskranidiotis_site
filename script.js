/* ─── Basics ────────────────────────────────────────────────────────────────── */
const currentYear = new Date().getFullYear();
document.getElementById('age-years').textContent = currentYear - 1970;
document.getElementById('copyright-year').textContent = currentYear;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─── Scroll: progress bar, navbar state, back-to-top ───────────────────────── */
const backToTopBtn = document.getElementById('backToTop');
const navbar = document.querySelector('.custom-navbar');
const root = document.documentElement;

function onScroll() {
  const y = window.scrollY;
  const max = root.scrollHeight - window.innerHeight;
  root.style.setProperty('--scroll', max > 0 ? (y / max).toFixed(4) : 0);
  navbar.classList.toggle('scrolled', y > 40);
  backToTopBtn.classList.toggle('visible', y > 300);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
});

/* ─── Close the mobile menu after picking a link ────────────────────────────── */
const navCollapse = document.getElementById('navbarNav');
navCollapse.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (navCollapse.classList.contains('show')) {
      bootstrap.Collapse.getInstance(navCollapse)?.hide();
    }
  });
});

/* ─── Count-up stats ────────────────────────────────────────────────────────── */
const counters = document.querySelectorAll('[data-count]');
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = Number(el.dataset.count);
    countObserver.unobserve(el);
    if (reduceMotion) { el.textContent = target; return; }
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}, { threshold: 0.6 });
counters.forEach(c => countObserver.observe(c));

/* ─── Cursor spotlight on cards ─────────────────────────────────────────────── */
if (window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.credential-item, .project-card, .featured-project-card, .sa-card')
    .forEach(card => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
}

/* ─── Staggered publication reveal ──────────────────────────────────────────── */
document.querySelectorAll('.publications-list li').forEach((li, i) => {
  li.style.setProperty('--i', i);
});

/* ─── Hero: eclipsing binary simulation ─────────────────────────────────────── */
(function eclipsingBinary() {
  const canvas = document.getElementById('binary-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = document.getElementById('home');

  const STAR_A = { r: 26, lum: 1.0, color: [190, 215, 255] };   // hot, blue-white
  const STAR_B = { r: 17, lum: 0.42, color: [242, 178, 99] };   // cooler, amber
  const INCL = 0.16;         // near edge-on: minor/major axis ratio
  const PERIOD = 9000;       // ms per orbit
  const CURVE_POINTS = 360;

  let w = 0, h = 0, dpr = 1, a = 0, cx = 0, cy = 0;
  const curve = [];
  let running = false, raf = 0, last = 0, theta = 0, prefill = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    a = Math.min(w * 0.26, 240);
    cx = w / 2;
    cy = h * 0.34;
  }

  // Area of overlap between two circles (projected eclipse geometry)
  function overlapArea(d, r1, r2) {
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
    const r1s = r1 * r1, r2s = r2 * r2;
    const alpha = Math.acos((d * d + r1s - r2s) / (2 * d * r1));
    const beta  = Math.acos((d * d + r2s - r1s) / (2 * d * r2));
    return r1s * alpha + r2s * beta - 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  }

  function drawStar(x, y, s, glowScale) {
    const [r, g, b] = s.color;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, s.r * glowScale);
    glow.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, s.r * glowScale, 0, Math.PI * 2); ctx.fill();

    const body = ctx.createRadialGradient(x - s.r * 0.3, y - s.r * 0.3, s.r * 0.1, x, y, s.r);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.5, `rgb(${r},${g},${b})`);
    body.addColorStop(1, `rgba(${r * 0.6},${g * 0.6},${b * 0.6},0.9)`);
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
  }

  function frame(now) {
    if (!last) last = now;
    const dt = Math.min(now - last, 50);
    last = now;
    if (!reduceMotion) theta += (dt / PERIOD) * Math.PI * 2;

    ctx.clearRect(0, 0, w, h);

    // Barycentric orbit: heavier A moves on the smaller ellipse
    const massRatio = 0.6;                 // m_B / m_A
    const aA = a * massRatio / (1 + massRatio);
    const aB = a / (1 + massRatio);
    const ax = cx + aA * Math.cos(theta),        ay = cy + aA * INCL * Math.sin(theta);
    const bx = cx - aB * Math.cos(theta),        by = cy - aB * INCL * Math.sin(theta);

    // Faint orbit paths
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath(); ctx.ellipse(cx, cy, aA, aA * INCL, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, aB, aB * INCL, 0, 0, Math.PI * 2); ctx.stroke();

    // Brightness: front star hides part of the back star
    const d = Math.hypot(ax - bx, ay - by);
    const ov = overlapArea(d, STAR_A.r, STAR_B.r);
    const areaA = Math.PI * STAR_A.r ** 2, areaB = Math.PI * STAR_B.r ** 2;
    const bFront = Math.sin(theta) > 0;    // positive sin → B is closer to viewer
    const hiddenLum = bFront ? STAR_A.lum * (ov / areaA) : STAR_B.lum * (ov / areaB);
    const total = STAR_A.lum + STAR_B.lum;
    const brightness = (total - hiddenLum) / total;

    if (!reduceMotion || prefill) {
      curve.push(brightness);
      if (curve.length > CURVE_POINTS) curve.shift();
    }

    // Draw stars back-to-front
    if (bFront) { drawStar(ax, ay, STAR_A, 3.2); drawStar(bx, by, STAR_B, 3.2); }
    else        { drawStar(bx, by, STAR_B, 3.2); drawStar(ax, ay, STAR_A, 3.2); }

    // Light curve strip along the bottom
    const stripH = Math.min(h * 0.12, 90);
    const baseY = h - 40;
    const x0 = 0, x1 = w;
    ctx.beginPath();
    for (let i = 0; i < curve.length; i++) {
      const x = x0 + (i / (CURVE_POINTS - 1)) * (x1 - x0);
      const y = baseY - (curve[i] - 0.55) / 0.45 * stripH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, 'rgba(79,156,249,0)');
    grad.addColorStop(0.5, 'rgba(79,156,249,0.35)');
    grad.addColorStop(1, 'rgba(79,156,249,0.9)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Current-sample marker
    if (curve.length) {
      const lx = x0 + ((curve.length - 1) / (CURVE_POINTS - 1)) * (x1 - x0);
      const ly = baseY - (curve[curve.length - 1] - 0.55) / 0.45 * stripH;
      ctx.fillStyle = '#4f9cf9';
      ctx.beginPath(); ctx.arc(lx, ly, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    if (running && !reduceMotion) raf = requestAnimationFrame(frame);
  }

  function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop()  { running = false; cancelAnimationFrame(raf); }

  resize();
  window.addEventListener('resize', () => { resize(); if (reduceMotion) frame(performance.now()); });

  if (reduceMotion) {
    // Static frame, pre-filled curve
    prefill = true;
    for (let i = 0; i < CURVE_POINTS; i++) { theta = (i / CURVE_POINTS) * Math.PI * 2; frame(performance.now()); }
    prefill = false;
    theta = Math.PI * 0.25;
    frame(performance.now());
  } else {
    new IntersectionObserver(([e]) => e.isIntersecting ? start() : stop(), { threshold: 0.05 }).observe(hero);
  }
})();

/* ─── AOS ───────────────────────────────────────────────────────────────────── */
AOS.init({
  duration: 900,
  offset: 100,
  once: true,
  easing: 'ease-out-cubic',
  disable: reduceMotion
});
