/* ==========================================================================
   SITE CONFIGURATION — the only file you need to edit.
   ========================================================================== */
const CONFIG = {
  // Your Google Apps Script Web App URL — it must END IN /exec, e.g.
  //   "https://script.google.com/macros/s/AKfycbxkqYVd3Uxo41apzFQJNSYpisysnE0TKBXhQqBuuCM6NjvxxWgnkR4fOV5t_asEf-Ao/exec"
  // Find it in Apps Script → Deploy → Manage deployments → Web app URL.
  // (A "script.googleusercontent.com/macros/echo?user_content_key=..." link will NOT work:
  //  it's a temporary redirect that expires.) Until this is set, labelled demo products show.
  API_URL: "https://script.google.com/macros/s/AKfycbxkqYVd3Uxo41apzFQJNSYpisysnE0TKBXhQqBuuCM6NjvxxWgnkR4fOV5t_asEf-Ao/exec",

  BRAND_NAME: "Hey! Nysa's Life",

  INSTAGRAM_URL: "https://www.instagram.com/hey.nysalife/",
  YOUTUBE_URL: "https://www.youtube.com/@Hey.NysaLife",
  PINTEREST_URL: "",                             // blank = Pinterest link hidden

  /* ---------- Optional (safe to ignore) ---------- */
  CREATOR_NAME: "Nysa",                          // the influencer's first name
  HERO_IMAGE: "assets/hero/hero-girl.webp",      // swap to change the hero photo
  HERO_IS_CUTOUT: false,                         // true = transparent background PNG/WebP; false = normal photo (framed in an arch)
  HERO_FOCUS: "74% 32%",                         // which part of the photo stays in frame (x% y%) — her face
  GA_MEASUREMENT_ID: "",                         // e.g. "G-XXXXXXX" — blank disables analytics
  CACHE_MINUTES: 10                              // how long the browser trusts saved products
};
