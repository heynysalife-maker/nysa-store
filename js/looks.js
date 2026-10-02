/* ==========================================================================
   LOOKS — built entirely from the lookId column. No code change per look.
   Optional "Looks" sheet can add a custom title, caption and image.
   ========================================================================== */
(function () {
  const M = (window.Muse = window.Muse || {});

  const PRESETS = {
    "coffee-date": { title: "Coffee Date", caption: "Soft layers, easy gold, and a lip that survives the cappuccino.", tint: "#C9A27E", pos: "50% 18%" },
    "date-night": { title: "Date Night", caption: "Satin, a little shine, and heels you can actually walk in.", tint: "#6E3B42", pos: "50% 22%" },
    office: { title: "Office", caption: "Sharp enough for the 10 a.m. review, easy enough for chai after.", tint: "#6B5A4C", pos: "50% 30%" },
    travel: { title: "Travel", caption: "Airport-comfortable, arrival-ready.", tint: "#7B8A8C", pos: "40% 20%" },
    brunch: { title: "Brunch", caption: "Linen, pearls, and a long Sunday table.", tint: "#D8B98F", pos: "60% 20%" },
    party: { title: "Party", caption: "Something that catches the light when the music starts.", tint: "#3B2A3F", pos: "50% 12%" },
    wedding: { title: "Wedding", caption: "Guest-ready pieces with a little zari and a lot of grace.", tint: "#A5624F", pos: "50% 26%" },
    festive: { title: "Festive", caption: "Diyas, family photos, and kurtas that feel like home.", tint: "#B07A3A", pos: "45% 24%" },
    weekend: { title: "Weekend", caption: "Unplanned, unhurried, still put together.", tint: "#8C7B6B", pos: "55% 16%" }
  };
  const ORDER = Object.keys(PRESETS);
  const PLACEHOLDER_GIRL = "assets/hero/hero-girl-placeholder.svg";

  M.lookTitle = (id) => (M.lookMeta && M.lookMeta[id] && M.lookMeta[id].title) || (PRESETS[id] && PRESETS[id].title) || M.titleCase(id);

  /** Merge presets + Looks sheet + every lookId found in products. */
  M.buildLooks = function (catalog) {
    const byId = {};
    ORDER.forEach((id, i) => (byId[id] = Object.assign({ id, image: "", order: i }, PRESETS[id])));
    (catalog.looks || []).forEach((l) => {
      const base = byId[l.id] || { id: l.id, title: M.titleCase(l.id), caption: "", tint: "#8C7B6B", pos: "50% 20%", order: 100 };
      byId[l.id] = Object.assign(base, { title: l.title || base.title, caption: l.caption || base.caption, image: l.image || base.image, order: l.sortOrder ?? base.order });
    });
    catalog.products.forEach((p) => p.lookIds.forEach((id) => {
      if (!byId[id]) byId[id] = { id, title: M.titleCase(id), caption: "", tint: "#8C7B6B", pos: "50% 20%", image: "", order: 200 };
    }));
    const looks = Object.values(byId).map((l) => Object.assign(l, { products: catalog.products.filter((p) => p.lookIds.indexOf(l.id) > -1) }));
    looks.sort((a, b) => a.order - b.order);
    M.lookMeta = byId;
    return looks;
  };

  const lookImg = (l, opts) => {
    opts = opts || {};
    const src = l.image || CONFIG.HERO_IMAGE || PLACEHOLDER_GIRL;
    return '<img src="' + M.esc(src) + '" alt="' + M.esc(opts.alt || "") + '" width="720" height="1280" loading="' + (opts.eager ? "eager" : "lazy") +
      '" decoding="async" referrerpolicy="no-referrer" data-fallback="' + PLACEHOLDER_GIRL + '" style="object-position:' + (l.image ? "50% 50%" : l.pos) + '">';
  };
  const lookTotal = (l) => l.products.reduce((s, p) => s + (p.price || 0), 0);

  /* ---------- SHOP HER LOOK (homepage) ---------- */
  let activeLook = null;
  M.renderShopHerLook = function (root, looks) {
    if (!root) return;
    const withItems = looks.filter((l) => l.products.length);
    if (!withItems.length) { root.hidden = true; return; }
    root.hidden = false;
    if (!activeLook || !withItems.some((l) => l.id === activeLook)) activeLook = (withItems.find((l) => l.id === "date-night") || withItems[0]).id;

    const tabs = root.querySelector("[data-look-tabs]");
    tabs.innerHTML = withItems.map((l) =>
      '<button class="tab" type="button" role="tab" aria-selected="' + (l.id === activeLook) + '" data-look-tab="' + M.esc(l.id) + '">' + M.esc(l.title) + "</button>").join("") +
      '<span class="tab__ink" aria-hidden="true"></span>';
    paintLook(root, withItems.find((l) => l.id === activeLook), false);
    moveInk(tabs);

    tabs.onclick = (e) => {
      const b = e.target.closest("[data-look-tab]");
      if (!b || b.dataset.lookTab === activeLook) return;
      activeLook = b.dataset.lookTab;
      tabs.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === b)));
      moveInk(tabs);
      b.scrollIntoView({ inline: "center", block: "nearest", behavior: M.reducedMotion() ? "auto" : "smooth" });
      paintLook(root, withItems.find((l) => l.id === activeLook), true);
    };
  };
  function moveInk(tabs) {
    const sel = tabs.querySelector('[aria-selected="true"]'), ink = tabs.querySelector(".tab__ink");
    if (!sel || !ink) return;
    ink.style.width = sel.offsetWidth + "px";
    ink.style.transform = "translateX(" + sel.offsetLeft + "px)";
  }
  window.addEventListener("resize", () => document.querySelectorAll("[data-look-tabs]").forEach(moveInk));

  function paintLook(root, l, animate) {
    const stage = root.querySelector("[data-look-stage]");
    const list = root.querySelector("[data-look-items]");
    const html = () => {
      stage.style.setProperty("--tint", l.tint || "#8C7B6B");
      stage.innerHTML = '<figure class="look-figure media">' + lookImg(l, { alt: (CONFIG.CREATOR_NAME || "The creator") + " styled for " + l.title }) +
        '<figcaption><span class="look-figure__label">The ' + M.esc(l.title) + " edit</span></figcaption></figure>" +
        '<div class="look-pins" aria-hidden="true">' + l.products.slice(0, 3).map((p, i) => '<span class="look-pin media" style="--k:' + i + '">' + M.imgTag(p, { alt: "", w: 200, h: 250 }) + "</span>").join("") + "</div>";
      list.innerHTML =
        '<h3 class="look-title">' + M.esc(l.title) + "</h3>" +
        (l.caption ? '<p class="look-caption">' + M.esc(l.caption) + "</p>" : "") +
        '<ul class="look-list">' + l.products.map((p) =>
          '<li class="look-row"><button class="look-row__thumb media" type="button" data-quickview="' + M.esc(p.id) + '" aria-label="Quick view ' + M.esc(p.name) + '">' + M.imgTag(p, { alt: "", w: 160, h: 200 }) + "</button>" +
          '<div class="look-row__info"><button type="button" class="look-row__name" data-quickview="' + M.esc(p.id) + '">' + M.esc(p.name) + '</button><span class="look-row__retailer" translate="no">' + M.esc(p.retailer) + "</span></div>" +
          '<span class="look-row__price">' + M.money(p.price) + "</span>" + M.shopLink(p, "look-row__cta", "Shop") + "</li>").join("") + "</ul>" +
        '<div class="look-total"><span>Complete look · ' + l.products.length + " pieces</span><strong>" + M.money(lookTotal(l)) + "</strong></div>" +
        '<a class="btn btn--primary" href="look.html?look=' + encodeURIComponent(l.id) + '" data-shop-look="' + M.esc(l.id) + '">Shop her look ' + M.icon.arrow + "</a>";
      root.classList.remove("is-switching");
    };
    if (animate && !M.reducedMotion()) { root.classList.add("is-switching"); setTimeout(html, 220); } else html();
  }

  /* ---------- DISCOVER BY MOOD ---------- */
  M.renderMoods = function (el, looks) {
    if (!el) return;
    el.innerHTML = looks.filter((l) => PRESETS[l.id] || l.products.length).map((l, i) => {
      const n = l.products.length;
      const inner = '<span class="mood__media media">' + lookImg(l) + '</span><span class="mood__veil"></span>' +
        '<span class="mood__text"><span class="mood__title">' + M.esc(l.title) + '</span><span class="mood__count">' + (n ? M.countLabel(n) : "Coming soon") + "</span></span>";
      return n
        ? '<a class="mood" style="--tint:' + l.tint + ";--i:" + i + '" href="look.html?look=' + encodeURIComponent(l.id) + '" data-shop-look="' + M.esc(l.id) + '">' + inner + "</a>"
        : '<div class="mood is-soon" style="--tint:' + l.tint + ";--i:" + i + '" aria-disabled="true">' + inner + "</div>";
    }).join("");
  };

  /* ---------- FROM HER FEED (9:16) ---------- */
  M.renderFeed = function (el, looks) {
    if (!el) return;
    const posts = looks.filter((l) => l.products.length).slice(0, 6);
    if (!posts.length) { el.closest("section").hidden = true; return; }
    el.closest("section").hidden = false;
    el.innerHTML = posts.map((l, i) =>
      '<article class="post" style="--tint:' + l.tint + ";--i:" + i + '">' +
      '<div class="post__media media">' + lookImg(l, { alt: (CONFIG.CREATOR_NAME || "Creator") + " — " + l.title + " look" }) + '<span class="post__veil"></span></div>' +
      '<div class="post__top"><span class="post__avatar" aria-hidden="true"></span><span class="post__handle" translate="no">@' + M.esc(M.slug(CONFIG.CREATOR_NAME || CONFIG.BRAND_NAME).replace(/-/g, ".")) + '</span></div>' +
      '<div class="post__bottom"><p class="post__caption">' + M.esc(l.caption || l.title) + "</p>" +
      '<ul class="post__tags">' + l.products.slice(0, 3).map((p) => '<li><button type="button" data-quickview="' + M.esc(p.id) + '">' + M.esc(p.subcategory || p.category) + " · " + M.money(p.price) + "</button></li>").join("") + "</ul>" +
      '<a class="post__cta" href="look.html?look=' + encodeURIComponent(l.id) + '" data-shop-look="' + M.esc(l.id) + '">Shop this look ' + M.icon.arrow + "</a></div></article>").join("");
  };

  /* ---------- LOOK PAGE ---------- */
  M.renderLookPage = function (looks) {
    const id = M.slug(new URLSearchParams(location.search).get("look") || "");
    const detail = document.getElementById("look-detail");
    const index = document.getElementById("look-index");
    const l = id && looks.find((x) => x.id === id);
    if (l) {
      index.hidden = true; detail.hidden = false;
      document.title = l.title + " Look | " + CONFIG.BRAND_NAME;
      detail.querySelector("[data-look-hero]").innerHTML = '<div class="media">' + lookImg(l, { eager: true, alt: (CONFIG.CREATOR_NAME || "Creator") + " — " + l.title + " look" }) + "</div>";
      detail.style.setProperty("--tint", l.tint);
      detail.querySelector("[data-look-name]").textContent = l.title;
      detail.querySelector("[data-look-caption]").textContent = l.caption || "Pieces picked to work together.";
      detail.querySelector("[data-look-meta]").textContent = l.products.length ? M.countLabel(l.products.length) + " · complete look " + M.money(lookTotal(l)) : "New pieces are on the way.";
      M.renderGrid(detail.querySelector("[data-look-grid]"), l.products, {
        empty: '<div class="empty"><p>No pieces in this look yet.</p><a class="btn btn--ghost" href="shop.html">Browse all finds</a></div>'
      });
      const others = looks.filter((x) => x.id !== l.id && x.products.length);
      M.renderMoods(detail.querySelector("[data-look-others]"), others);
    } else {
      index.hidden = false; detail.hidden = true;
      M.renderMoods(index.querySelector("[data-moods]"), looks);
    }
  };
})();
