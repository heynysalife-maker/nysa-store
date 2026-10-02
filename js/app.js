/* ==========================================================================
   APP — wires everything together for every page.
   ========================================================================== */
(function () {
  const M = (window.Muse = window.Muse || {});
  const page = document.body.dataset.page || "home";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  let catalog = { products: [], looks: [], source: "loading" };
  let index = new Map();
  let looks = [];
  M.byId = (id) => index.get(id);

  /* ---------- brand + config ---------- */
  function applyBrand() {
    const brand = CONFIG.BRAND_NAME || "Nysa Life";
    const creator = CONFIG.CREATOR_NAME || brand;
    $$("[data-brand]").forEach((el) => (el.textContent = brand));
    $$("[data-creator]").forEach((el) => (el.textContent = creator));
    if (brand !== "Nysa Life") document.title = document.title.replace(/Nysa Life/g, brand);
    $$('meta[property="og:site_name"]').forEach((m) => m.setAttribute("content", brand));
    $$("[data-social]").forEach((a) => {
      const url = CONFIG[a.dataset.social.toUpperCase() + "_URL"];
      if (url && /^https?:\/\//.test(url)) a.href = url; else a.closest("li") ? (a.closest("li").hidden = true) : (a.hidden = true);
    });
    $$("[data-hero-img]").forEach((img) => { if (CONFIG.HERO_IMAGE) img.src = CONFIG.HERO_IMAGE; });
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
    let can = $('link[rel="canonical"]');
    if (!can) { can = document.createElement("link"); can.rel = "canonical"; document.head.appendChild(can); }
    const keep = page === "shop" || page === "look" ? ["category", "look"] : [];
    const qs = new URLSearchParams(location.search), clean = new URLSearchParams();
    keep.forEach((k) => qs.get(k) && clean.set(k, qs.get(k)));
    can.href = location.origin + location.pathname + (clean.toString() ? "?" + clean : "");
  }

  /* ---------- status line (demo / stale / offline) ---------- */
  function setStatus(source) {
    const el = $("[data-status]");
    if (!el) return;
    const msg = {
      demo: 'Demo preview — these sample finds are placeholders. Add your Apps Script URL in <code>js/config.js</code> to go live.',
      stale: "Showing recently loaded finds.",
      empty: 'Finds are taking a moment to load. <button type="button" data-retry>Try again</button>'
    }[source];
    el.innerHTML = msg || "";
    el.hidden = !msg;
    el.dataset.kind = source;
  }

  /* ---------- toast ---------- */
  let toastTimer;
  M.toast = function (text, action) {
    const t = $("#toast");
    if (!t) return;
    t.innerHTML = "<span>" + M.esc(text) + "</span>" + (action ? '<a href="' + action.href + '">' + M.esc(action.label) + "</a>" : "");
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-on"), 2600);
  };

  /* ---------- global delegated events ---------- */
  document.addEventListener("click", (e) => {
    const qv = e.target.closest("[data-quickview]");
    if (qv) { e.preventDefault(); M.openQuickView(qv.dataset.quickview, qv); return; }
    const w = e.target.closest("[data-wish]");
    if (w) { e.preventDefault(); M.wishlist.toggle(w.dataset.wish, w); return; }
    const s = e.target.closest("[data-shop]");
    if (s) { const p = M.byId(s.dataset.shop); M.track("retailer_click", { item_id: s.dataset.shop, item_name: p && p.name, retailer: p && p.retailer, value: p && p.price, currency: "INR" }); }
    const sl = e.target.closest("[data-shop-look]");
    if (sl) M.track("shop_look", { look_id: sl.dataset.shopLook });
    const c = e.target.closest("[data-cat]");
    if (c && c.tagName === "A") M.track("category_click", { category: c.dataset.cat });
    if (e.target.closest("[data-retry]")) { M.clearCatalogCache(); location.reload(); }
    if (e.target.closest("[data-close-modal]")) M.closeQuickView();
    if (e.target.closest("[data-open-search]")) { e.preventDefault(); openSearch(); }
    if (e.target.closest("[data-close-search]")) closeSearch();
  });

  const qvDlg = $("#quickview");
  if (qvDlg) {
    qvDlg.addEventListener("cancel", (e) => { e.preventDefault(); M.closeQuickView(); });
    qvDlg.addEventListener("click", (e) => { if (e.target === qvDlg) M.closeQuickView(); }); // backdrop
  }

  /* ---------- search overlay ---------- */
  const sDlg = $("#search");
  let searchTrackTimer;
  function openSearch() {
    if (!sDlg) return;
    sDlg.showModal();
    sDlg.classList.add("is-open");
    document.documentElement.classList.add("has-modal");
    const input = $("#search-input");
    setTimeout(() => input && input.focus(), 30);
    renderSearch(input ? input.value : "");
  }
  function closeSearch() {
    if (!sDlg || !sDlg.open) return;
    sDlg.classList.remove("is-open");
    setTimeout(() => { sDlg.close(); document.documentElement.classList.remove("has-modal"); }, M.reducedMotion() ? 0 : 220);
  }
  function renderSearch(q) {
    const out = $("#search-results"), count = $("#search-count"), all = $("#search-all");
    if (!out) return;
    const query = (q || "").trim();
    if (!query) {
      count.textContent = "";
      all.hidden = true;
      out.innerHTML = '<p class="search__hint">Try <button type="button" data-suggest="dress">dress</button> <button type="button" data-suggest="under 999">under 999</button> <button type="button" data-suggest="date night">date night</button> <button type="button" data-suggest="myntra">myntra</button> <button type="button" data-suggest="beauty">beauty</button></p>';
      return;
    }
    const res = M.search(catalog.products, query);
    count.textContent = M.countLabel(res.length);
    all.hidden = !res.length;
    all.href = "shop.html?q=" + encodeURIComponent(query);
    all.textContent = "See all " + M.countLabel(res.length);
    out.innerHTML = res.length
      ? '<ul class="search__list">' + res.slice(0, 8).map((p) =>
          '<li><button type="button" class="search__item" data-quickview="' + M.esc(p.id) + '"><span class="search__thumb media">' + M.imgTag(p, { alt: "", w: 120, h: 150 }) +
          '</span><span class="search__name">' + M.esc(p.name) + '<small>' + M.esc(p.category) + (p.retailer ? " · " + M.esc(p.retailer) : "") + "</small></span><span class=\"search__price\">" + M.money(p.price) + "</span></button></li>").join("") + "</ul>"
      : '<p class="search__empty">No finds for “' + M.esc(query) + '” yet. Try a category like <button type="button" data-suggest="fashion">fashion</button> or a budget like <button type="button" data-suggest="under 499">under 499</button>.</p>';
    clearTimeout(searchTrackTimer);
    searchTrackTimer = setTimeout(() => M.track("search", { search_term: query, results: res.length }), 700);
  }
  if (sDlg) {
    const input = $("#search-input");
    input.addEventListener("input", () => renderSearch(input.value));
    sDlg.addEventListener("cancel", (e) => { e.preventDefault(); closeSearch(); });
    sDlg.addEventListener("click", (e) => {
      if (e.target === sDlg) closeSearch();
      const sg = e.target.closest("[data-suggest]");
      if (sg) { input.value = sg.dataset.suggest; renderSearch(input.value); input.focus(); }
      if (e.target.closest("[data-quickview]")) closeSearch();
    });
    $("#search-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (input.value.trim()) location.href = "shop.html?q=" + encodeURIComponent(input.value.trim());
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName) && !document.querySelector("dialog[open]")) { e.preventDefault(); openSearch(); }
  });

  /* ---------- HOME ---------- */
  let budget = 999;
  function renderHome() {
    const P = catalog.products;
    // hero featured find
    const hf = $("[data-hero-find]");
    const top = P.find((p) => p.featured) || P[0];
    if (hf && top) {
      hf.innerHTML = '<span class="hero-find__label">Featured find</span><button type="button" class="hero-find__btn" data-quickview="' + M.esc(top.id) + '">' +
        '<span class="hero-find__img media">' + M.imgTag(top, { alt: "", w: 120, h: 150, eager: true }) + '</span><span class="hero-find__txt"><span class="hero-find__name">' +
        M.esc(top.name) + '</span><span class="hero-find__price">' + M.money(top.price) + (top.retailer ? ' · <span translate="no">' + M.esc(top.retailer) + "</span>" : "") + "</span></span></button>";
      hf.hidden = false;
    }
    M.renderShopHerLook($("#shop-her-look"), looks);

    const trending = P.filter((p) => p.trending);
    const tSec = $("#trending");
    tSec.hidden = !trending.length;
    M.renderGrid($("#trending [data-track]"), trending, { variant: "rail" });
    M.initCarousel($("#trending [data-carousel]"));

    M.renderMoods($("#moods [data-moods]"), looks);
    renderBudget();

    const featured = P.filter((p) => p.featured).slice(0, 5);
    $("#featured").hidden = !featured.length;
    const fg = $("#featured [data-grid]");
    M.renderGrid(fg, featured, { variant: "editorial" });

    M.renderFeed($("#feed [data-feed]"), looks);
    renderCategoryIndex($("#categories [data-cat-index]"));
  }
  function renderBudget() {
    const sec = $("#budget");
    if (!sec) return;
    const list = catalog.products.filter((p) => p.price != null && p.price <= budget).sort((a, b) => a.price - b.price);
    $$("[data-budget]", sec).forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.budget === budget)));
    $("[data-budget-count]", sec).textContent = M.countLabel(list.length) + " under " + M.money(budget);
    const more = $("[data-budget-more]", sec);
    more.href = "shop.html?max=" + budget;
    more.hidden = list.length <= 8;
    M.renderGrid($("[data-grid]", sec), list.slice(0, 8), {
      empty: '<div class="empty"><p>Nothing under ' + M.money(budget) + ' right now.</p><button class="btn btn--ghost" type="button" data-budget="' + M.BUDGETS[Math.min(M.BUDGETS.indexOf(budget) + 1, M.BUDGETS.length - 1)] + '">Try the next budget up</button></div>'
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-budget]");
    if (!b || page !== "home") return;
    budget = +b.dataset.budget;
    M.track("budget_filter", { max_price: budget, location: "home" });
    renderBudget();
  });

  function categoryList() {
    const extra = [...new Set(catalog.products.map((p) => p.category).filter(Boolean))].filter((c) => M.CATEGORIES.map(M.slug).indexOf(M.slug(c)) < 0);
    return M.CATEGORIES.concat(extra).map((name) => {
      const slug = M.slug(name);
      const items = catalog.products.filter((p) => p.categorySlug === slug);
      return { name, slug, items };
    });
  }
  function renderCategoryIndex(el) {
    if (!el) return;
    el.innerHTML = categoryList().map((c, i) => {
      const p = c.items[0];
      return '<li style="--i:' + i + '"><a class="cat-row" href="shop.html?category=' + c.slug + '" data-cat="' + c.slug + '">' +
        '<span class="cat-row__name">' + M.esc(c.name) + '</span><span class="cat-row__count">' + (c.items.length ? M.countLabel(c.items.length) : "Soon") + "</span>" +
        '<span class="cat-row__peek media" aria-hidden="true">' + M.imgTag(p || { categorySlug: c.slug, name: c.name }, { alt: "", w: 240, h: 300 }) + "</span>" +
        '<span class="cat-row__arrow" aria-hidden="true">' + M.icon.arrow + "</span></a></li>";
    }).join("");
  }

  /* ---------- SHOP ---------- */
  const shopState = { category: "", q: "", max: 0, sort: "curated", view: "" };
  function readShopURL() {
    const qs = new URLSearchParams(location.search);
    shopState.category = M.slug(qs.get("category") || "");
    shopState.q = qs.get("q") || "";
    shopState.max = parseInt(qs.get("max") || "0", 10) || 0;
    shopState.sort = qs.get("sort") || "curated";
    shopState.view = qs.get("view") || "";
    shopState.look = M.slug(qs.get("look") || "");
  }
  function writeShopURL() {
    const qs = new URLSearchParams();
    if (shopState.view) qs.set("view", shopState.view);
    if (shopState.category) qs.set("category", shopState.category);
    if (shopState.look) qs.set("look", shopState.look);
    if (shopState.q) qs.set("q", shopState.q);
    if (shopState.max) qs.set("max", shopState.max);
    if (shopState.sort && shopState.sort !== "curated") qs.set("sort", shopState.sort);
    history.replaceState(null, "", location.pathname + (qs.toString() ? "?" + qs : ""));
  }
  function initShopControls() {
    const cats = $("[data-shop-cats]");
    const render = () => {
      cats.innerHTML = '<button type="button" class="chip" data-shop-cat="" aria-pressed="' + (!shopState.category && !shopState.view) + '">All</button>' +
        categoryList().map((c) => '<button type="button" class="chip" data-shop-cat="' + c.slug + '" aria-pressed="' + (shopState.category === c.slug) + '">' + M.esc(c.name) + (c.items.length ? "<small>" + c.items.length + "</small>" : "") + "</button>").join("") +
        '<button type="button" class="chip chip--saved" data-shop-cat="saved" aria-pressed="' + (shopState.view === "saved") + '">♡ Saved</button>';
    };
    M.renderShopCats = render;
    cats.addEventListener("click", (e) => {
      const b = e.target.closest("[data-shop-cat]");
      if (!b) return;
      const v = b.dataset.shopCat;
      shopState.view = v === "saved" ? "saved" : "";
      shopState.category = v === "saved" ? "" : v;
      shopState.look = "";
      if (v && v !== "saved") M.track("category_click", { category: v, location: "shop" });
      renderShop();
    });
    $("[data-shop-budget]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-max]");
      if (!b) return;
      const v = +b.dataset.max;
      shopState.max = shopState.max === v ? 0 : v;
      if (shopState.max) M.track("budget_filter", { max_price: v, location: "shop" });
      renderShop();
    });
    const sort = $("#shop-sort");
    sort.value = shopState.sort;
    sort.addEventListener("change", () => { shopState.sort = sort.value; renderShop(); });
    const input = $("#shop-q");
    input.value = shopState.q;
    let t;
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => { shopState.q = input.value.trim(); renderShop(); if (shopState.q) M.track("search", { search_term: shopState.q, location: "shop" }); }, 160);
    });
    $("#shop-q-form").addEventListener("submit", (e) => { e.preventDefault(); input.blur(); });
    $("[data-clear-filters]").addEventListener("click", () => {
      Object.assign(shopState, { category: "", q: "", max: 0, sort: "curated", view: "", look: "" });
      input.value = ""; sort.value = "curated"; renderShop();
    });
  }
  function renderShop() {
    let list = catalog.products;
    let title = "All finds", sub = "Fashion, beauty & lifestyle finds, updated straight from the edit.";
    if (shopState.view === "saved") {
      const saved = M.wishlist.list();
      list = saved.map((id) => index.get(id)).filter(Boolean);
      title = "Saved finds"; sub = "Saved on this device only — no account needed.";
    } else if (shopState.category) {
      list = list.filter((p) => p.categorySlug === shopState.category);
      const c = categoryList().find((x) => x.slug === shopState.category);
      title = c ? c.name : M.titleCase(shopState.category);
      sub = "Every " + title.toLowerCase() + " find in one place.";
    }
    if (shopState.look) { list = list.filter((p) => p.lookIds.indexOf(shopState.look) > -1); title = M.lookTitle(shopState.look); }
    if (shopState.max) list = list.filter((p) => p.price != null && p.price <= shopState.max);
    if (shopState.q) list = M.search(list, shopState.q);
    list = M.sortProducts(list, shopState.sort);

    $("[data-shop-title]").textContent = title;
    $("[data-shop-sub]").textContent = sub;
    document.title = title + " | " + CONFIG.BRAND_NAME;
    $("[data-shop-count]").textContent = M.countLabel(list.length) + (shopState.q ? " for “" + shopState.q + "”" : "") + (shopState.max ? " under " + M.money(shopState.max) : "");
    $$("[data-max]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.max === shopState.max)));
    const any = shopState.category || shopState.q || shopState.max || shopState.view || shopState.look;
    $("[data-clear-filters]").hidden = !any;
    M.renderShopCats();

    const empty = shopState.view === "saved"
      ? '<div class="empty"><p class="empty__title">Nothing saved yet.</p><p>Tap the heart on any find to keep it here.</p><a class="btn btn--primary" href="shop.html">Explore finds</a></div>'
      : '<div class="empty"><p class="empty__title">No finds match that yet.</p><p>Try a wider budget or a different word.</p><button class="btn btn--ghost" type="button" data-clear-filters-inline>Clear filters</button></div>';
    M.renderGrid($("#shop-grid"), list, { empty, eagerFirst: true });
    writeShopURL();
    injectItemList(list);
  }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-clear-filters-inline]")) $("[data-clear-filters]").click(); });
  document.addEventListener("wishlist:change", () => { if (page === "shop" && shopState.view === "saved") renderShop(); });

  function injectItemList(list) {
    let s = $("#ld-itemlist");
    if (!s) { s = document.createElement("script"); s.type = "application/ld+json"; s.id = "ld-itemlist"; document.head.appendChild(s); }
    s.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "ItemList",
      itemListElement: list.slice(0, 30).map((p, i) => ({
        "@type": "ListItem", position: i + 1,
        item: Object.assign({ "@type": "Product", name: p.name, category: p.category, description: p.description || undefined, image: p.image || undefined },
          p.price != null && p.goToLink ? { offers: { "@type": "Offer", price: p.price, priceCurrency: "INR", url: p.goToLink, seller: { "@type": "Organization", name: p.retailer || "Retailer" } } } : {})
      }))
    });
  }

  /* ---------- render cycle ---------- */
  function onCatalog(c) {
    catalog = c;
    index = new Map(c.products.map((p) => [p.id, p]));
    looks = M.buildLooks(c);
    setStatus(c.source);
    if (c.source === "empty") return; // keep skeletons + retry message
    if ((c.source === "live" || c.source === "demo") && c.products.length) M.wishlist.prune(new Set(index.keys()));
    document.body.classList.add("is-loaded");
    if (page === "home") renderHome();
    if (page === "shop") renderShop();
    if (page === "look") M.renderLookPage(looks);
    M.wishlist.updateCount();
    requestAnimationFrame(() => M.animations.observeReveals());
  }

  /* ---------- nav active states ---------- */
  function markNav() {
    const qs = new URLSearchParams(location.search);
    const cat = M.slug(qs.get("category") || "");
    const key = page === "shop" ? (qs.get("view") === "saved" ? "saved" : cat || "shop") : page;
    $$("[data-nav]").forEach((a) => {
      const on = a.dataset.nav.split(" ").indexOf(key) > -1;
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    const bar = $(".tabbar");
    if (bar) {
      const on = bar.querySelector('[aria-current="page"]');
      const ink = bar.querySelector(".tabbar__ink");
      if (on && ink) { bar.style.setProperty("--ink-x", on.offsetLeft + on.offsetWidth / 2 + "px"); ink.hidden = false; }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyBrand();
    markNav();
    if (page === "shop") { readShopURL(); initShopControls(); M.renderShopCats(); }
    if (page === "home" || page === "shop" || page === "look") M.loadCatalog(onCatalog);
    else M.loadCatalog((c) => { catalog = c; index = new Map(c.products.map((p) => [p.id, p])); });
  });
  window.addEventListener("load", markNav);
})();
