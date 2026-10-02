/* ==========================================================================
   ANALYTICS — optional GA4. Nothing loads unless CONFIG.GA_MEASUREMENT_ID is set.
   Events: product_click, retailer_click, shop_look, category_click,
           search, budget_filter, wishlist_add
   ========================================================================== */
(function () {
  const M = (window.Muse = window.Muse || {});
  const id = (typeof CONFIG !== "undefined" && CONFIG.GA_MEASUREMENT_ID) || "";
  const enabled = /^G-[A-Z0-9]+$/i.test(id);

  if (enabled) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", id, { anonymize_ip: true });
    const load = () => {
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
      document.head.appendChild(s);
    };
    // Defer so analytics never competes with the hero for bandwidth.
    ("requestIdleCallback" in window) ? requestIdleCallback(load, { timeout: 3000 }) : setTimeout(load, 1500);
  }

  M.track = function (name, params) {
    try {
      if (enabled && window.gtag) window.gtag("event", name, params || {});
      if (location.hostname === "localhost" || location.hostname === "127.0.0.1") console.debug("[track]", name, params || {});
    } catch (e) { /* never break the page for analytics */ }
  };
})();
