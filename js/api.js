/* ==========================================================================
   API — talks to the Google Apps Script Web App (read-only).
   Strategy: show cached catalogue instantly → fetch fresh → swap smoothly.
   ========================================================================== */
(function () {
  const M = (window.Muse = window.Muse || {});
  const CACHE_KEY = "muse:catalog:v2";

  const isConfigured = () =>
    /^https:\/\/script\.google(usercontent)?\.com\/.+/.test(String(CONFIG.API_URL || "")) &&
    !/YOUR_/.test(CONFIG.API_URL);
  M.isConfigured = isConfigured;

  /* ---------- helpers ---------- */
  const toBool = (v) => v === true || /^(true|yes|y|1|✓|x)$/i.test(String(v == null ? "" : v).trim());
  const toNum = (v) => {
    if (typeof v === "number") return isFinite(v) ? v : null;
    const n = parseFloat(String(v == null ? "" : v).replace(/[^\d.]/g, ""));
    return isFinite(n) ? n : null;
  };
  const toList = (v) =>
    (Array.isArray(v) ? v : String(v == null ? "" : v).split(","))
      .map((s) => String(s).trim())
      .filter(Boolean);
  const safeUrl = (u) => {
    const s = String(u || "").trim();
    return /^https?:\/\//i.test(s) ? s : "";
  };
  const safeImg = (u) => {
    const s = String(u || "").trim();
    if (/^https?:\/\//i.test(s) || /^data:image\//i.test(s)) return s;
    if (/^[\w\-./]+\.(webp|avif|jpe?g|png|gif|svg)$/i.test(s)) return s; // repo-hosted file
    return "";
  };
  M.slug = (s) =>
    String(s || "")
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  function normalizeProduct(p, i) {
    const price = toNum(p.price);
    const original = toNum(p.originalPrice);
    const lookIds = toList(p.lookIds || p.lookId).map(M.slug);
    return {
      id: String(p.id || "item-" + i),
      name: String(p.name || "").trim(),
      category: String(p.category || "").trim(),
      categorySlug: M.slug(p.category),
      subcategory: String(p.subcategory || "").trim(),
      description: String(p.description || "").trim(),
      price: price,
      originalPrice: original && price && original > price ? original : null,
      image: safeImg(p.image),
      retailer: String(p.retailer || "").trim(),
      goToLink: safeUrl(p.goToLink),
      tags: toList(p.tags),
      featured: toBool(p.featured),
      trending: toBool(p.trending),
      active: p.active === undefined ? true : toBool(p.active),
      lookIds: lookIds,
      lookId: lookIds[0] || "",
      sortOrder: toNum(p.sortOrder)
    };
  }

  function normalizeCatalog(data) {
    const products = (data.products || [])
      .map(normalizeProduct)
      .filter((p) => p.active && p.name)
      .sort((a, b) => (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9));
    const looks = (data.looks || []).map((l) => ({
      id: M.slug(l.lookId || l.id),
      title: String(l.title || "").trim(),
      caption: String(l.caption || "").trim(),
      image: safeImg(l.image),
      sortOrder: toNum(l.sortOrder)
    })).filter((l) => l.id);
    return { products, looks, updatedAt: data.updatedAt || null };
  }
  M.normalizeCatalog = normalizeCatalog;

  /* ---------- local cache ---------- */
  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw);
      return c && Array.isArray(c.products) ? c : null;
    } catch (e) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(Object.assign({ savedAt: Date.now() }, data))); }
    catch (e) { /* storage full or disabled — site still works */ }
  }

  /* ---------- network ---------- */
  async function fetchJSON(url, timeout) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      // Simple GET with no custom headers → no CORS preflight (Apps Script can't answer one).
      const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally { clearTimeout(t); }
  }
  function jsonp(url, timeout) {
    return new Promise((resolve, reject) => {
      const cb = "__museCb" + Date.now() + Math.floor(Math.random() * 1e4);
      const s = document.createElement("script");
      const timer = setTimeout(() => { cleanup(); reject(new Error("JSONP timeout")); }, timeout);
      function cleanup() { clearTimeout(timer); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      window[cb] = (d) => { cleanup(); resolve(d); };
      s.onerror = () => { cleanup(); reject(new Error("JSONP failed")); };
      s.src = url + (url.indexOf("?") > -1 ? "&" : "?") + "callback=" + cb;
      document.head.appendChild(s);
    });
  }
  async function fetchLive() {
    const url = CONFIG.API_URL + (CONFIG.API_URL.indexOf("?") > -1 ? "&" : "?") + "action=all";
    let data;
    try { data = await fetchJSON(url, 12000); }
    catch (e) { data = await jsonp(url, 12000); } // fallback for strict networks / extensions
    if (!data || data.success !== true) throw new Error((data && data.error) || "Unexpected API response");
    return normalizeCatalog(data);
  }

  /**
   * Load catalogue. `onUpdate(catalog)` may fire twice: cached first, fresh second.
   * catalog.source: "cache" | "live" | "stale" | "demo" | "empty"
   */
  M.loadCatalog = function (onUpdate) {
    if (!isConfigured()) {
      onUpdate(Object.assign(normalizeCatalog(M.DEMO), { source: "demo" }));
      return;
    }
    const cached = readCache();
    let lastSig = null;
    if (cached) {
      lastSig = JSON.stringify(cached.products) + JSON.stringify(cached.looks);
      onUpdate(Object.assign({}, cached, { source: "cache" }));
    }
    const maxAge = (CONFIG.CACHE_MINUTES || 10) * 60000;
    const fresh = cached && Date.now() - (cached.savedAt || 0) < 30000; // just fetched on another page
    if (fresh && maxAge > 0) return;

    fetchLive()
      .then((data) => {
        writeCache(data);
        const sig = JSON.stringify(data.products) + JSON.stringify(data.looks);
        if (sig !== lastSig) onUpdate(Object.assign({}, data, { source: "live" }));
        else document.dispatchEvent(new CustomEvent("catalog:fresh"));
      })
      .catch((err) => {
        console.warn("[Muse] Live catalogue unavailable:", err.message);
        if (cached) onUpdate(Object.assign({}, cached, { source: "stale" }));
        else onUpdate({ products: [], looks: [], source: "empty" });
      });
  };
  M.clearCatalogCache = () => { try { localStorage.removeItem(CACHE_KEY); } catch (e) {} };

  /* ==========================================================================
     DEMO DATA — used ONLY while CONFIG.API_URL is not set.
     The UI shows a visible "Demo preview" label whenever this is on screen.
     ========================================================================== */
  const d = (id, name, category, subcategory, description, price, originalPrice, retailer, goToLink, tags, featured, trending, lookId, sortOrder) =>
    ({ id, name, category, subcategory, description, price, originalPrice, image: "", retailer, goToLink, tags, featured, trending, active: true, lookId, sortOrder });
  const MY = "https://www.myntra.com/", AJ = "https://www.ajio.com/", NY = "https://www.nykaa.com/", AM = "https://www.amazon.in/", TC = "https://www.tatacliq.com/";
  M.DEMO = {
    products: [
      d("demo-dress", "Champagne Satin Slip Dress", "Fashion", "Dresses", "Bias-cut satin that moves with you. Pair with block heels and gold jhumkas for dinner plans.", 2499, 3499, "Myntra", MY, "date-night,party,dress", true, true, "date-night,party", 1),
      d("demo-coord", "Ivory Linen Co-ord Set", "Fashion", "Co-ords", "Breathable linen shirt and wide-leg trousers — one outfit, three ways to wear it.", 1899, 2799, "AJIO", AJ, "brunch,linen,summer", false, true, "brunch,weekend", 2),
      d("demo-kurta", "Blush Chikankari Kurta", "Fashion", "Ethnic", "Hand-embroidered Lucknowi chikankari on soft mul cotton.", 1299, 1999, "Myntra", MY, "ethnic,festive,kurta", true, false, "festive,coffee-date", 3),
      d("demo-saree", "Organza Saree with Zari Border", "Fashion", "Sarees", "Sheer organza in a soft champagne tone with a fine zari edge.", 3999, 5499, "Tata CLiQ", TC, "wedding,saree,festive", true, false, "wedding,festive", 4),
      d("demo-blazer", "Oat Relaxed Blazer", "Fashion", "Blazers", "A soft-shouldered blazer that works over dresses and denim alike.", 2299, 3299, "AJIO", AJ, "office,workwear", false, false, "office", 5),
      d("demo-lip", "Rose Nude Matte Lipstick", "Beauty", "Lips", "A your-lips-but-better rose nude with a comfortable matte finish.", 449, 599, "Nykaa", NY, "lipstick,makeup,date night", false, true, "date-night,party", 6),
      d("demo-tint", "Dewy Skin Tint SPF 30", "Beauty", "Face", "Sheer coverage and a fresh glow for humid days.", 799, 999, "Nykaa", NY, "skincare,glow,spf", false, false, "coffee-date,brunch", 7),
      d("demo-perfume", "Jasmine & Amber Eau de Parfum", "Beauty", "Fragrance", "Warm amber softened with night-blooming jasmine.", 1499, 2199, "Nykaa", NY, "fragrance,perfume,gift", true, false, "date-night", 8),
      d("demo-jhumka", "Gold-tone Pearl Jhumkas", "Jewelry", "Earrings", "Lightweight jhumkas with freshwater-look pearl drops.", 499, 899, "Amazon", AM, "earrings,festive,jhumka", false, true, "date-night,festive", 9),
      d("demo-chain", "Layered Chain Necklace", "Jewelry", "Necklaces", "Two delicate chains that sit perfectly with a V-neck.", 699, 1199, "Myntra", MY, "necklace,gold,everyday", false, false, "brunch,office", 10),
      d("demo-bag", "Quilted Mini Shoulder Bag", "Bags", "Shoulder Bags", "Quilted faux leather with a slim gold chain strap.", 1499, 2499, "Myntra", MY, "bag,party,date night", true, true, "date-night,party", 11),
      d("demo-tote", "Structured Tan Work Tote", "Bags", "Totes", "Fits a 14-inch laptop, a water bottle and your whole day.", 1999, 2999, "AJIO", AJ, "office,tote,travel", false, false, "office,travel", 12),
      d("demo-heels", "Nude Block Heels", "Shoes", "Heels", "A walkable 6 cm block heel in a skin-tone nude.", 1999, 2799, "Myntra", MY, "heels,date night,office", false, true, "date-night,office", 13),
      d("demo-jutti", "Embroidered Juttis", "Shoes", "Ethnic", "Cushioned juttis with tonal thread embroidery.", 899, 1299, "Amazon", AM, "ethnic,wedding,festive", false, false, "festive,wedding", 14),
      d("demo-sneaker", "Clean White Sneakers", "Shoes", "Sneakers", "Minimal leather-look sneakers for airport days and weekends.", 2499, 3299, "AJIO", AJ, "sneakers,travel,casual", false, false, "travel,weekend", 15),
      d("demo-journal", "Linen Cover Journal", "Lifestyle", "Stationery", "Dot-grid pages and a linen cover. Link intentionally left blank to show the disabled state.", 399, 599, "Amazon", "", "journal,desk,gift", false, false, "coffee-date", 16),
      d("demo-tumbler", "Stainless Steel Tumbler", "Lifestyle", "Drinkware", "Keeps chai hot through the longest meeting.", 699, 999, "Amazon", AM, "travel,office,chai", false, false, "travel,office", 17),
      d("demo-candle", "Sandalwood Soy Candle", "Home", "Candles", "Mysore sandalwood notes in a reusable glass jar.", 549, 799, "Amazon", AM, "home,candle,gift", false, false, "weekend", 18),
      d("demo-claws", "Pearl Hair Claw Clips (Set of 3)", "Affordable Finds", "Hair", "The easiest way to look put-together in ten seconds.", 249, 399, "Amazon", AM, "hair,under 499,pearl", false, true, "brunch,coffee-date", 19),
      d("demo-scrunchie", "Satin Scrunchie Set", "Affordable Finds", "Hair", "Gentle on hair, pretty on the wrist.", 199, 349, "Myntra", MY, "hair,satin,under 499", false, false, "weekend", 20)
    ],
    looks: []
  };
})();
