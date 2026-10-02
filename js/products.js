/* ==========================================================================
   PRODUCTS — cards, grids, skeletons, search, budget, quick view.
   ========================================================================== */
(function () {
  const M = (window.Muse = window.Muse || {});

  /* ---------- formatting ---------- */
  const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  M.money = (n) => (n == null ? "" : inr.format(n));
  M.esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  M.discount = (p) => (p.originalPrice && p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0);
  M.titleCase = (slug) => String(slug || "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  /* ---------- premium placeholder art (no broken-image icons, ever) ---------- */
  const GLYPHS = {
    fashion: '<path d="M88 40l12 14 12-14 14 8-6 24-8-2 10 70H78l10-70-8 2-6-24z"/>',
    beauty: '<rect x="90" y="84" width="20" height="62" rx="3"/><path d="M92 84V58l16-14v40"/><path d="M86 146h28"/>',
    jewelry: '<circle cx="100" cy="66" r="10"/><path d="M100 76v10M86 86h28l-6 22H92zM92 108l8 30 8-30"/><circle cx="100" cy="142" r="4"/>',
    bags: '<path d="M70 82h60l8 64H62z"/><path d="M84 82c0-26 32-26 32 0"/><path d="M92 104h16"/>',
    shoes: '<path d="M60 128c24 0 34-10 46-30l10 6c-4 14 6 22 24 24 10 2 12 8 12 14H60z"/><path d="M128 142v14"/>',
    lifestyle: '<path d="M78 58h44v84H78z"/><path d="M88 58v84M96 78h18M96 90h18"/>',
    home: '<path d="M86 88h28v56H86z"/><path d="M100 88V74"/><path d="M100 62c6 6 6 12 0 14-6-2-6-8 0-14z"/>',
    "affordable-finds": '<path d="M70 70l42-8 32 32-42 42-32-32z"/><circle cx="92" cy="84" r="6"/>',
    default: '<path d="M100 48l10 30h32l-26 18 10 30-26-18-26 18 10-30-26-18h32z"/>'
  };
  const TINTS = {
    fashion: ["#F4E6DA", "#E9CFC2"], beauty: ["#F6E3E0", "#E7C3BE"], jewelry: ["#F5EBDD", "#E2CDA6"],
    bags: ["#EFE3D6", "#D9C2A8"], shoes: ["#F3E7E1", "#DFC6BC"], lifestyle: ["#EEE9DF", "#D8CFBE"],
    home: ["#F1E8DC", "#DCCBB2"], "affordable-finds": ["#F7ECE4", "#EBD2C6"], default: ["#F5ECE2", "#E6D3BF"]
  };
  const phCache = {};
  M.placeholder = function (p) {
    const key = (p && p.categorySlug) || "default";
    if (phCache[key]) return phCache[key];
    const g = GLYPHS[key] || GLYPHS.default;
    const t = TINTS[key] || TINTS.default;
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + t[0] + '"/><stop offset="1" stop-color="' + t[1] + '"/></linearGradient>' +
      '<radialGradient id="r" cx=".5" cy=".38" r=".55"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="200" height="250" fill="url(#g)"/><rect width="200" height="250" fill="url(#r)"/>' +
      '<g transform="translate(0 20)" fill="none" stroke="#8A6A55" stroke-opacity=".55" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">' + g + "</g></svg>";
    return (phCache[key] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  };

  // Global safety net: any <img data-fallback> that errors gets the placeholder.
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.hasAttribute("data-fallback")) return;
    if (img.dataset.failed) return;
    img.dataset.failed = "1";
    img.removeAttribute("srcset");
    img.src = img.dataset.fallback || M.placeholder({ categorySlug: img.dataset.cat });
    img.closest(".media")?.classList.add("is-placeholder");
  }, true);

  M.imgTag = function (p, opts) {
    opts = opts || {};
    const src = p.image || M.placeholder(p);
    const ph = !p.image;
    return '<img src="' + M.esc(src) + '" alt="' + M.esc(opts.alt != null ? opts.alt : p.name) + '" width="' + (opts.w || 800) + '" height="' + (opts.h || 1000) +
      '" loading="' + (opts.eager ? "eager" : "lazy") + '" decoding="async" referrerpolicy="no-referrer" data-fallback data-cat="' + M.esc(p.categorySlug) + '"' +
      (opts.eager ? ' fetchpriority="high"' : "") + (ph ? ' data-ph="1"' : "") + ">";
  };

  /* ---------- icons ---------- */
  M.icon = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s-7.5-4.6-9.3-9.2C1.4 7.7 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.2 4.3 6.6-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  /* ---------- CTA (never a fake checkout) ---------- */
  M.shopLink = function (p, cls, label) {
    const text = label || "Shop now";
    if (!p.goToLink) {
      return '<span class="' + cls + ' is-disabled" aria-disabled="true" title="Link coming soon">Link coming soon</span>';
    }
    return '<a class="' + cls + '" href="' + M.esc(p.goToLink) + '" target="_blank" rel="nofollow sponsored noopener" data-shop="' + M.esc(p.id) +
      '"><span>' + text + "</span>" + (p.retailer ? '<small translate="no">on ' + M.esc(p.retailer) + "</small>" : "") + M.icon.arrow + "</a>";
  };

  M.priceHTML = function (p) {
    const off = M.discount(p);
    return '<p class="price"><span class="price__now">' + M.money(p.price) + "</span>" +
      (p.originalPrice ? '<s class="price__was">' + M.money(p.originalPrice) + "</s>" : "") +
      (off >= 5 ? '<span class="price__off">' + off + "% off</span>" : "") + "</p>";
  };

  M.wishBtn = function (p) {
    const saved = M.wishlist && M.wishlist.has(p.id);
    return '<button class="wish" type="button" data-wish="' + M.esc(p.id) + '" aria-pressed="' + saved + '" aria-label="' + (saved ? "Remove " : "Save ") + M.esc(p.name) + (saved ? " from" : " to") + ' saved finds">' + M.icon.heart + "</button>";
  };

  /* ---------- card ---------- */
  M.cardHTML = function (p, opts) {
    opts = opts || {};
    const badge = p.trending ? "Trending" : p.featured ? "Editor’s pick" : "";
    return '<article class="card' + (opts.variant ? " card--" + opts.variant : "") + '" data-id="' + M.esc(p.id) + '" data-tilt>' +
      '<div class="card__media media">' +
      '<button class="card__open" type="button" data-quickview="' + M.esc(p.id) + '" tabindex="-1" aria-hidden="true">' + M.imgTag(p, { alt: "", eager: opts.eager }) + "</button>" +
      (badge ? '<span class="card__badge">' + badge + "</span>" : "") + M.wishBtn(p) + "</div>" +
      '<div class="card__body">' +
      '<p class="card__meta"><span>' + M.esc(p.subcategory || p.category) + "</span>" + (p.retailer ? '<span translate="no">' + M.esc(p.retailer) + "</span>" : "") + "</p>" +
      '<h3 class="card__title"><button type="button" data-quickview="' + M.esc(p.id) + '">' + M.esc(p.name) + "</button></h3>" +
      M.priceHTML(p) + M.shopLink(p, "card__cta") + "</div></article>";
  };

  M.skeletonHTML = (n, variant) =>
    Array.from({ length: n }, () =>
      '<div class="card card--skeleton' + (variant ? " card--" + variant : "") + '" aria-hidden="true"><div class="card__media sk"></div><div class="card__body"><span class="sk sk--line"></span><span class="sk sk--line sk--w70"></span><span class="sk sk--line sk--w40"></span></div></div>'
    ).join("");

  /** Render a grid with a soft cross-fade + stagger (no layout jump). */
  M.renderGrid = function (el, products, opts) {
    if (!el) return;
    opts = opts || {};
    const html = products.length
      ? products.map((p, i) => M.cardHTML(p, { variant: opts.variant, eager: opts.eagerFirst && i < 2 })).join("")
      : opts.empty || "";
    const swap = () => {
      el.innerHTML = html;
      el.setAttribute("aria-busy", "false");
      el.querySelectorAll(".card").forEach((c, i) => c.style.setProperty("--i", Math.min(i, 12)));
      el.classList.remove("is-leaving");
      el.classList.add("is-entering");
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("is-entering")));
      M.animations && M.animations.bindTilt(el);
    };
    if (el.dataset.rendered && !M.reducedMotion()) {
      el.classList.add("is-leaving");
      setTimeout(swap, 200);
    } else swap();
    el.dataset.rendered = "1";
  };

  /* ---------- search ---------- */
  const norm = (s) => String(s || "").toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  M.parseQuery = function (q) {
    let text = norm(q), max = null, min = null;
    text = text.replace(/(?:under|below|less than|upto|up to|<)\s*₹?\s*(\d[\d,]*)k?/g, (m, n) => { max = parseInt(n.replace(/,/g, ""), 10) * (/k$/.test(m) ? 1000 : 1); return " "; });
    text = text.replace(/(?:over|above|more than|>)\s*₹?\s*(\d[\d,]*)/g, (m, n) => { min = parseInt(n.replace(/,/g, ""), 10); return " "; });
    return { terms: text.split(" ").filter((t) => t.length > 1 || /\d/.test(t)), max, min };
  };
  M.search = function (products, q) {
    const { terms, max, min } = M.parseQuery(q);
    return products
      .map((p) => {
        if (max != null && (p.price == null || p.price > max)) return null;
        if (min != null && (p.price == null || p.price < min)) return null;
        if (!terms.length) return { p, s: 1 };
        const fields = [
          [norm(p.name), 5], [norm(p.category), 3], [norm(p.subcategory), 3], [norm(p.tags.join(" ")), 3],
          [norm(p.retailer), 2], [norm(p.lookIds.join(" ")), 2], [norm(p.description), 1]
        ];
        let s = 0;
        for (const t of terms) {
          let hit = 0;
          for (const [f, w] of fields) if (f.indexOf(t) > -1) hit = Math.max(hit, w);
          if (!hit) return null; // every term must match somewhere
          s += hit;
        }
        return { p, s };
      })
      .filter(Boolean)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p);
  };

  M.CATEGORIES = ["Fashion", "Beauty", "Jewelry", "Bags", "Shoes", "Lifestyle", "Home", "Affordable Finds"];
  M.BUDGETS = [499, 999, 1499, 2499, 4999];

  M.sortProducts = function (list, mode) {
    const a = list.slice();
    if (mode === "price-asc") a.sort((x, y) => (x.price ?? 1e9) - (y.price ?? 1e9));
    else if (mode === "price-desc") a.sort((x, y) => (y.price ?? -1) - (x.price ?? -1));
    else if (mode === "discount") a.sort((x, y) => M.discount(y) - M.discount(x));
    return a;
  };

  M.countLabel = (n) => n + (n === 1 ? " find" : " finds");

  /* ---------- quick view (dialog; bottom sheet on mobile via CSS) ---------- */
  M.openQuickView = function (id, trigger) {
    const p = M.byId(id);
    const dlg = document.getElementById("quickview");
    if (!p || !dlg) return;
    const looks = p.lookIds.map((l) => '<a class="chip chip--sm" href="look.html?look=' + encodeURIComponent(l) + '">' + M.esc(M.lookTitle ? M.lookTitle(l) : M.titleCase(l)) + "</a>").join("");
    dlg.querySelector(".qv__content").innerHTML =
      '<div class="qv__media media">' + M.imgTag(p, { eager: true }) + "</div>" +
      '<div class="qv__body">' +
      '<p class="qv__meta">' + M.esc([p.category, p.subcategory].filter(Boolean).join(" · ")) + "</p>" +
      '<h2 class="qv__title" id="qv-title">' + M.esc(p.name) + "</h2>" +
      M.priceHTML(p) +
      (p.description ? '<p class="qv__desc">' + M.esc(p.description) + "</p>" : "") +
      (p.tags.length ? '<ul class="qv__tags" aria-label="Tags">' + p.tags.map((t) => '<li><a href="shop.html?q=' + encodeURIComponent(t) + '">' + M.esc(t) + "</a></li>").join("") + "</ul>" : "") +
      (looks ? '<div class="qv__looks"><span>Styled in</span>' + looks + "</div>" : "") +
      '<div class="qv__actions">' + M.shopLink(p, "btn btn--primary btn--block", "Shop now") + M.wishBtn(p) + "</div>" +
      '<p class="qv__note">' + (p.retailer ? "You’ll finish your purchase securely on <strong translate=\"no\">" + M.esc(p.retailer) + "</strong>. " : "") +
      'Prices can change at the retailer. <a href="disclosure.html">Affiliate disclosure</a></p>' +
      "</div>";
    M.lastTrigger = trigger || document.activeElement;
    dlg.showModal();
    dlg.classList.add("is-open");
    document.documentElement.classList.add("has-modal");
    M.track && M.track("product_click", { item_id: p.id, item_name: p.name, item_category: p.category, retailer: p.retailer, price: p.price });
  };
  M.closeQuickView = function () {
    const dlg = document.getElementById("quickview");
    if (!dlg || !dlg.open) return;
    dlg.classList.remove("is-open");
    const done = () => { dlg.close(); document.documentElement.classList.remove("has-modal"); M.lastTrigger && M.lastTrigger.focus && M.lastTrigger.focus({ preventScroll: true }); };
    M.reducedMotion() ? done() : setTimeout(done, 260);
  };
})();
