/* ==========================================================================
   SITE CONFIGURATION — the only file you need to edit.
   After deploying your Google Apps Script, paste the Web App URL below.
   ========================================================================== */
const CONFIG = {
  // Your Google Apps Script Web App URL (ends in /exec).
  // Leave as-is to preview the site with clearly-labelled demo products.
  API_URL: "YOUR_GOOGLE_APPS_SCRIPT_URL",

  BRAND_NAME: "Nysa Life",

  INSTAGRAM_URL: "YOUR_INSTAGRAM",
  YOUTUBE_URL: "YOUR_YOUTUBE",
  PINTEREST_URL: "YOUR_PINTEREST",

  /* ---------- Optional (safe to ignore) ---------- */
  CREATOR_NAME: "Nysa",                          // the influencer's first name
  HERO_IMAGE: "assets/hero/hero-girl.webp",      // swap to change the hero photo
  HERO_IS_CUTOUT: false,                         // true = transparent background PNG/WebP; false = normal photo (framed in an arch)
  HERO_FOCUS: "74% 32%",                         // which part of the photo stays in frame (x% y%) — her face
  GA_MEASUREMENT_ID: "",                         // e.g. "G-XXXXXXX" — blank disables analytics
  CACHE_MINUTES: 10                              // how long the browser trusts saved products
};
