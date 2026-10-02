/* ==========================================================================
   MOTION — IntersectionObserver + requestAnimationFrame + transforms only.
   Everything is disabled or softened under prefers-reduced-motion.
   ========================================================================== */
(function () {
  const M = (window.Muse = window.Muse || {});
  const rmq = window.matchMedia("(prefers-reduced-motion: reduce)");
  M.reducedMotion = () => rmq.matches;
  const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- scroll reveals ---------- */
  let io;
  function observeReveals(root) {
    const els = (root || document).querySelectorAll("[data-reveal]:not(.is-in)");
    if (M.reducedMotion() || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("is-in")); return; }
    io = io || new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- 2.5D hero ---------- */
  function initHero() {
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;
    const layers = [...hero.querySelectorAll("[data-depth]")];
    const scene = hero.querySelector("[data-scene]");
    requestAnimationFrame(() => hero.classList.add("is-ready"));

    // particles (decorative)
    const pf = hero.querySelector("[data-particles]");
    if (pf && !pf.children.length) {
      const n = window.innerWidth < 700 ? 10 : 18;
      let html = "";
      for (let i = 0; i < n; i++) {
        const s = (Math.random() * 4 + 2).toFixed(1);
        html += '<i style="left:' + (Math.random() * 100).toFixed(1) + "%;top:" + (Math.random() * 100).toFixed(1) + "%;width:" + s + "px;height:" + s +
          "px;animation-delay:-" + (Math.random() * 12).toFixed(1) + "s;animation-duration:" + (10 + Math.random() * 10).toFixed(1) + 's"></i>';
      }
      pf.innerHTML = html;
    }
    if (M.reducedMotion()) return;

    let tx = 0, ty = 0, cx = 0, cy = 0, sy = 0, running = false, visible = true;
    const strength = finePointer() ? 1 : 0.35; // very subtle on touch devices

    function frame() {
      cx = lerp(cx, tx, 0.075);
      cy = lerp(cy, ty, 0.075);
      for (const l of layers) {
        const d = parseFloat(l.dataset.depth) * strength;
        l.style.transform = "translate3d(" + (cx * d * 28).toFixed(2) + "px," + (cy * d * 22 - sy * d * 0.18).toFixed(2) + "px,0)";
      }
      if (scene) scene.style.transform = "rotateY(" + (cx * 5 * strength).toFixed(2) + "deg) rotateX(" + (-cy * 4 * strength).toFixed(2) + "deg)";
      if (visible && (Math.abs(cx - tx) > 0.001 || Math.abs(cy - ty) > 0.001)) requestAnimationFrame(frame);
      else running = false;
    }
    const kick = () => { if (!running && visible) { running = true; requestAnimationFrame(frame); } };

    if (finePointer()) {
      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
        kick();
      }, { passive: true });
      hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; kick(); });
    } else {
      // gentle idle drift on touch — no gyroscope permission prompts
      let t0 = performance.now();
      (function drift(now) {
        if (visible) { const t = (now - t0) / 1000; tx = Math.sin(t * 0.35) * 0.18; ty = Math.cos(t * 0.28) * 0.12; kick(); }
        requestAnimationFrame(drift);
      })(t0);
    }
    window.addEventListener("scroll", () => { sy = Math.min(window.scrollY, 900); kick(); }, { passive: true });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(hero);
  }

  /* ---------- product card 3D tilt (desktop only) ---------- */
  M.animations = {
    bindTilt(root) {
      if (M.reducedMotion() || !finePointer() || !root || root.dataset.tiltBound) return;
      root.dataset.tiltBound = "1";
      let card = null, raf = 0, px = 0, py = 0;
      root.addEventListener("pointermove", (e) => {
        const c = e.target.closest("[data-tilt]");
        if (c !== card) { if (card) reset(card); card = c; }
        if (!card) return;
        const r = card.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width - 0.5;
        py = (e.clientY - r.top) / r.height - 0.5;
        if (!raf) raf = requestAnimationFrame(() => {
          raf = 0;
          if (!card) return;
          card.style.setProperty("--rx", (-py * 6).toFixed(2) + "deg");
          card.style.setProperty("--ry", (px * 7).toFixed(2) + "deg");
          card.style.setProperty("--gx", ((px + 0.5) * 100).toFixed(1) + "%");
          card.style.setProperty("--gy", ((py + 0.5) * 100).toFixed(1) + "%");
        });
      }, { passive: true });
      root.addEventListener("pointerleave", () => { if (card) reset(card); card = null; });
      function reset(c) { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); }
    },
    observeReveals
  };

  /* ---------- carousels: drag (mouse), swipe (touch), arrows, keyboard ---------- */
  M.initCarousel = function (wrap) {
    if (!wrap || wrap.dataset.carousel === "on") return;
    wrap.dataset.carousel = "on";
    const track = wrap.querySelector("[data-track]");
    const prev = wrap.querySelector("[data-prev]"), next = wrap.querySelector("[data-next]");
    const step = () => { const c = track.querySelector(".card"); return c ? (c.offsetWidth + 20) * (window.innerWidth > 900 ? 2 : 1) : track.clientWidth * 0.8; };
    const go = (dir) => track.scrollBy({ left: dir * step(), behavior: M.reducedMotion() ? "auto" : "smooth" });
    prev && prev.addEventListener("click", () => go(-1));
    next && next.addEventListener("click", () => go(1));
    const updateArrows = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
      const bar = wrap.querySelector("[data-progress]");
      if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.max(0.08, (track.scrollLeft + track.clientWidth) / track.scrollWidth) : 1).toFixed(3) + ")";
    };
    track.addEventListener("scroll", () => requestAnimationFrame(updateArrows), { passive: true });
    new ResizeObserver(updateArrows).observe(track);

    // mouse drag (touch uses native momentum scrolling + scroll-snap)
    let down = false, startX = 0, startLeft = 0, moved = 0;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = 0; startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) { track.classList.add("is-dragging"); track.scrollLeft = startLeft - dx; }
    });
    window.addEventListener("pointerup", () => { if (!down) return; down = false; track.classList.remove("is-dragging"); });
    track.addEventListener("click", (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    track.addEventListener("dragstart", (e) => e.preventDefault());
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });
    updateArrows();
  };

  /* ---------- header: shrink + hide on scroll down ---------- */
  function initHeader() {
    const h = document.querySelector(".site-header");
    if (!h) return;
    let last = 0, ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        h.classList.toggle("is-scrolled", y > 24);
        h.classList.toggle("is-hidden", y > 420 && y > last + 4 && !document.documentElement.classList.contains("has-modal"));
        if (y < last - 4) h.classList.remove("is-hidden");
        last = y; ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- magnetic-lite button press ripple position ---------- */
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".btn");
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty("--px", e.clientX - r.left + "px");
    b.style.setProperty("--py", e.clientY - r.top + "px");
  }, { passive: true });

  document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initHero();
    observeReveals();
  });
  rmq.addEventListener && rmq.addEventListener("change", () => location.reload());
})();
