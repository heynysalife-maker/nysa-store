/**
 * =============================================================================
 *  NYSA LIFE — READ-ONLY PRODUCT API (Google Apps Script Web App)
 * =============================================================================
 *  Google Sheet  →  this script  →  JSON  →  GitHub Pages website
 *
 *  • READ ONLY: there is no doPost and no write code. The website can never
 *    change your sheet. Only you (the owner) can edit it.
 *  • No API keys or credentials are ever sent to the browser.
 *  • Results are cached with CacheService (default 5 minutes). Editing the
 *    sheet clears the cache automatically (see onEdit below).
 *
 *  Endpoints (GET):
 *    ?action=products                     all active products
 *    ?action=featured                     featured = TRUE
 *    ?action=trending                     trending = TRUE
 *    ?action=category&value=Fashion       by category (case-insensitive)
 *    ?action=search&value=dress           text search
 *    ?action=look&value=date-night        products in a look
 *    ?action=product&id=dress001          one product
 *    ?action=looks                        optional Looks sheet rows
 *    ?action=all                          products + looks (used by the site)
 *    ?action=health                       quick status check
 *  Add &callback=fnName for JSONP (automatic fallback used by the site).
 * =============================================================================
 */

/* ------------------------------- SETTINGS -------------------------------- */
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";   // from the sheet URL: /spreadsheets/d/<THIS PART>/edit
const SHEET_NAME = "Products";
const LOOKS_SHEET_NAME = "Looks";               // optional second tab
const CACHE_SECONDS = 300;                      // 60–21600. 300 = 5 minutes
const CACHE_KEY = "catalog_v2";
const MAX_SEARCH_RESULTS = 200;

/* Header aliases — so "Go-To URL", "Affiliate Link", "MRP" etc. still work. */
const HEADER_ALIASES = {
  id: "id", sku: "id", productid: "id",
  name: "name", title: "name", productname: "name",
  category: "category",
  subcategory: "subcategory", subcat: "subcategory",
  description: "description", desc: "description",
  price: "price", saleprice: "price", sellingprice: "price",
  originalprice: "originalPrice", mrp: "originalPrice", compareatprice: "originalPrice", listprice: "originalPrice",
  image: "image", imageurl: "image", img: "image", photo: "image",
  retailer: "retailer", store: "retailer", brand: "retailer", shop: "retailer",
  gotolink: "goToLink", gotourl: "goToLink", affiliatelink: "goToLink", affiliateurl: "goToLink", link: "goToLink", url: "goToLink", buylink: "goToLink",
  tags: "tags",
  featured: "featured",
  trending: "trending",
  active: "active", live: "active", published: "active",
  lookid: "lookId", look: "lookId", lookids: "lookId",
  sortorder: "sortOrder", sort: "sortOrder", order: "sortOrder",
  // Looks sheet
  caption: "caption"
};

/* =============================== ENTRY POINT ============================== */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || "products").toLowerCase().trim();
  const value = String(p.value || "").trim();
  const callback = p.callback;

  try {
    let out;
    switch (action) {
      case "products": out = list(getProducts()); break;
      case "featured": out = list(getFeatured()); break;
      case "trending": out = list(getTrending()); break;
      case "category":
        if (!value) return jsonResponse(fail("Missing ?value= for category"), callback);
        out = list(getByCategory(value)); break;
      case "search": out = list(getBySearch(value)); break;
      case "look":
        if (!value) return jsonResponse(fail("Missing ?value= for look"), callback);
        out = list(getByLook(value)); break;
      case "product": {
        const id = String(p.id || value || "").trim();
        if (!id) return jsonResponse(fail("Missing ?id="), callback);
        const product = getById(id);
        out = product ? { success: true, product: product } : fail("Product not found: " + id);
        break;
      }
      case "looks": out = { success: true, looks: getCatalog().looks }; break;
      case "all": {
        const c = getCatalog();
        out = { success: true, count: c.products.length, products: c.products, looks: c.looks, updatedAt: c.updatedAt };
        break;
      }
      case "health": {
        const c = getCatalog();
        out = { success: true, status: "ok", products: c.products.length, updatedAt: c.updatedAt };
        break;
      }
      default:
        out = fail("Unknown action: " + action + ". Try products, featured, trending, category, search, look, product, all.");
    }
    return jsonResponse(out, callback);
  } catch (err) {
    console.error(err);
    return jsonResponse(fail(publicError(err)), callback);
  }
}

/* ================================ QUERIES ================================ */
function getProducts() { return getCatalog().products; }
function getFeatured() { return getProducts().filter(function (p) { return p.featured; }); }
function getTrending() { return getProducts().filter(function (p) { return p.trending; }); }

function getByCategory(category) {
  const want = slugify(category);
  return getProducts().filter(function (p) { return slugify(p.category) === want; });
}

function getByLook(lookId) {
  const want = slugify(lookId);
  return getProducts().filter(function (p) { return p.lookIds.indexOf(want) > -1; });
}

function getById(id) {
  const want = String(id).trim().toLowerCase();
  const found = getProducts().filter(function (p) { return String(p.id).toLowerCase() === want; });
  return found.length ? found[0] : null;
}

/** Every word must match somewhere. Supports "under 1000" / "below ₹999". */
function getBySearch(query) {
  let q = String(query || "").toLowerCase();
  let max = null;
  q = q.replace(/(?:under|below|less than|upto|up to)\s*₹?\s*(\d[\d,]*)/g, function (m, n) { max = Number(n.replace(/,/g, "")); return " "; });
  const terms = q.replace(/[-_]+/g, " ").split(/\s+/).filter(function (t) { return t.length > 1 || /\d/.test(t); });
  return getProducts().filter(function (p) {
    if (max !== null && (p.price === null || p.price > max)) return false;
    if (!terms.length) return true;
    const hay = [p.name, p.category, p.subcategory, p.tags.join(" "), p.retailer, p.description, p.lookIds.join(" ")]
      .join(" ").toLowerCase().replace(/[-_]+/g, " ");
    return terms.every(function (t) { return hay.indexOf(t) > -1; });
  }).slice(0, MAX_SEARCH_RESULTS);
}

/* ============================ CATALOG + CACHE ============================ */
function getCatalog() {
  const cached = cacheGet(CACHE_KEY);
  if (cached) return cached;
  const catalog = {
    products: readProducts(),
    looks: readLooks(),
    updatedAt: new Date().toISOString()
  };
  cachePut(CACHE_KEY, catalog);
  return catalog;
}

function openSpreadsheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf("YOUR_") === 0) {
    // Script is bound to the sheet (Extensions → Apps Script) — use it directly.
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
    throw new Error("Set SPREADSHEET_ID at the top of Code.gs");
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function readProducts() {
  const sheet = openSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet tab "' + SHEET_NAME + '" not found');
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return [];
  const formulas = range.getFormulas();
  const index = buildHeaderIndex(values[0]);
  if (index.name === undefined) throw new Error('Header "name" is missing in row 1');

  const seen = {};
  const products = [];
  for (let r = 1; r < values.length; r++) {
    const product = normalizeRow(values[r], formulas[r], index, r + 1);
    if (!product) continue;
    if (seen[product.id]) product.id = product.id + "-" + (r + 1); // keep ids unique
    seen[product.id] = true;
    products.push(product);
  }
  products.sort(function (a, b) {
    const x = a.sortOrder === null ? 1e9 : a.sortOrder;
    const y = b.sortOrder === null ? 1e9 : b.sortOrder;
    return x - y || a._row - b._row;
  });
  products.forEach(function (p) { delete p._row; });
  return products;
}

/**
 * Turns one sheet row into a clean product object.
 * Returns null for inactive or empty rows (only active = TRUE is published).
 */
function normalizeRow(row, formulaRow, index, rowNumber) {
  const get = function (key) { return index[key] === undefined ? "" : row[index[key]]; };
  const name = String(get("name") || "").trim();
  if (!name) return null;
  if (!toBool(get("active"))) return null;

  let imageRaw = get("image");
  // METHOD 3: =IMAGE("https://...") formula → pull out the URL
  if (index.image !== undefined && formulaRow) {
    const f = String(formulaRow[index.image] || "");
    const m = f.match(/^=\s*IMAGE\s*\(\s*"([^"]+)"/i);
    if (m) imageRaw = m[1];
  }
  // In-cell images (Insert → Image → In cell) expose a content URL when available
  if (imageRaw && typeof imageRaw === "object" && typeof imageRaw.getContentUrl === "function") {
    try { imageRaw = imageRaw.getContentUrl() || ""; } catch (err) { imageRaw = ""; }
  }

  const price = toNumber(get("price"));
  const originalPrice = toNumber(get("originalPrice"));
  const lookIds = splitList(get("lookId")).map(slugify).filter(String);

  return {
    id: String(get("id") || "").trim() || "row-" + rowNumber,
    name: name,
    category: String(get("category") || "").trim(),
    subcategory: String(get("subcategory") || "").trim(),
    description: String(get("description") || "").trim(),
    price: price,
    originalPrice: originalPrice !== null && price !== null && originalPrice > price ? originalPrice : null,
    image: convertImageUrl(imageRaw),
    retailer: String(get("retailer") || "").trim(),
    goToLink: safeLink(get("goToLink")),
    tags: splitList(get("tags")),
    featured: toBool(get("featured")),
    trending: toBool(get("trending")),
    active: true,
    lookId: lookIds.join(","),
    lookIds: lookIds,
    sortOrder: toNumber(get("sortOrder")),
    _row: rowNumber
  };
}

/** Optional "Looks" tab: lookId | title | caption | image | active | sortOrder */
function readLooks() {
  const sheet = openSpreadsheet().getSheetByName(LOOKS_SHEET_NAME);
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return [];
  const formulas = range.getFormulas();
  const index = buildHeaderIndex(values[0]);
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const get = function (k) { return index[k] === undefined ? "" : row[index[k]]; };
    const id = slugify(get("lookId"));
    if (!id) continue;
    if (index.active !== undefined && String(get("active")).trim() !== "" && !toBool(get("active"))) continue;
    let img = get("image");
    if (index.image !== undefined) {
      const m = String(formulas[r][index.image] || "").match(/^=\s*IMAGE\s*\(\s*"([^"]+)"/i);
      if (m) img = m[1];
    }
    out.push({
      lookId: id,
      title: String(get("name") || get("title") || "").trim(),
      caption: String(get("caption") || get("description") || "").trim(),
      image: convertImageUrl(img),
      sortOrder: toNumber(get("sortOrder"))
    });
  }
  return out;
}

/* ============================ IMAGE HANDLING ============================= */
/**
 * Accepts:
 *  1. Direct URLs          https://cdn.example.com/p.webp
 *  2. Google Drive links   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *                          https://drive.google.com/open?id=FILE_ID
 *                          https://drive.google.com/uc?id=FILE_ID&export=view
 *  3. Repo files           assets/products/dress.webp
 * Drive links become an embeddable thumbnail URL. The file must be shared
 * as "Anyone with the link → Viewer".
 */
function convertImageUrl(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  const id = extractDriveId(s);
  if (id) return "https://drive.google.com/thumbnail?id=" + id + "&sz=w1200";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w\-./]+\.(webp|avif|jpe?g|png|gif|svg)$/i.test(s)) return s;
  return "";
}

function extractDriveId(url) {
  if (!/drive\.google\.com|docs\.google\.com|googleusercontent\.com\/d\//i.test(url)) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})/
  ];
  for (let i = 0; i < patterns.length; i++) {
    const m = url.match(patterns[i]);
    if (m) return m[1];
  }
  return null;
}

/* ================================ HELPERS ================================ */
function jsonResponse(obj, callback) {
  const body = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][\w$]{0,63}$/.test(callback)) {
    return ContentService.createTextOutput(callback + "(" + body + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function list(items) { return { success: true, count: items.length, products: items }; }
function fail(message) { return { success: false, error: message, products: [] }; }

function publicError(err) {
  const msg = String((err && err.message) || err);
  // Don't leak internal details; keep the useful hint.
  if (/not found|missing|Set SPREADSHEET_ID/i.test(msg)) return msg;
  if (/permission|access/i.test(msg)) return "The script cannot open the spreadsheet. Check SPREADSHEET_ID and re-authorise.";
  return "Products are temporarily unavailable.";
}

function buildHeaderIndex(headerRow) {
  const index = {};
  headerRow.forEach(function (h, i) {
    const key = String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const field = HEADER_ALIASES[key];
    if (field && index[field] === undefined) index[field] = i;
    if (key === "title" && index.name === undefined) index.name = i;
  });
  return index;
}

function toBool(v) {
  if (v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  return /^(true|yes|y|1|✓|✔|x)$/i.test(String(v).trim());
}

function toNumber(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  const n = parseFloat(String(v || "").replace(/[^\d.]/g, ""));
  return isFinite(n) ? n : null;
}

function splitList(v) {
  return String(v || "").split(/[,|;]/).map(function (s) { return s.trim(); }).filter(String);
}

function slugify(v) {
  return String(v || "").toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function safeLink(v) {
  const s = String(v || "").trim();
  return /^https?:\/\/[^\s]+$/i.test(s) ? s : "";
}

/* ------------------ chunked cache (CacheService ≈100 KB/value) ------------------ */
const CHUNK = 24000; // characters; safe for multi-byte text like ₹

function cachePut(key, obj) {
  try {
    const cache = CacheService.getScriptCache();
    const str = JSON.stringify(obj);
    const n = Math.ceil(str.length / CHUNK);
    const map = {};
    for (let i = 0; i < n; i++) map[key + "_" + i] = str.substr(i * CHUNK, CHUNK);
    map[key + "_n"] = String(n);
    cache.putAll(map, CACHE_SECONDS);
  } catch (err) { console.warn("Cache write skipped: " + err); }
}

function cacheGet(key) {
  try {
    const cache = CacheService.getScriptCache();
    const n = parseInt(cache.get(key + "_n"), 10);
    if (!n) return null;
    const keys = [];
    for (let i = 0; i < n; i++) keys.push(key + "_" + i);
    const parts = cache.getAll(keys);
    let str = "";
    for (let i = 0; i < n; i++) {
      if (parts[keys[i]] == null) return null;
      str += parts[keys[i]];
    }
    return JSON.parse(str);
  } catch (err) { return null; }
}

function clearCache() {
  const keys = [CACHE_KEY + "_n"];
  for (let i = 0; i < 200; i++) keys.push(CACHE_KEY + "_" + i);
  CacheService.getScriptCache().removeAll(keys);
}

/* ======================= OWNER TOOLS (inside the Sheet) =================== */
/** Simple trigger: any edit refreshes the website cache immediately. */
function onEdit(e) {
  try { clearCache(); } catch (err) { /* ignore */ }
}

/** Adds a "Store" menu to the spreadsheet. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🛍️ Store")
    .addItem("Set up Products sheet", "setupSheet")
    .addItem("Check sheet for problems", "validateSheet")
    .addItem("Refresh website now", "refreshNow")
    .addToUi();
}

function refreshNow() {
  clearCache();
  const c = getCatalog();
  SpreadsheetApp.getUi().alert("Website data refreshed. " + c.products.length + " active products are live.");
}

/** Creates the Products tab with headers, checkboxes and one example row. */
function setupSheet() {
  const ss = openSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  const headers = ["id", "name", "category", "subcategory", "description", "price", "originalPrice", "image", "retailer", "goToLink", "tags", "featured", "trending", "active", "lookId", "sortOrder"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#F4EBDF");
  sheet.setFrozenRows(1);
  if (sheet.getLastRow() < 2) {
    sheet.getRange(2, 1, 1, headers.length).setValues([[
      "dress001", "Elegant Satin Dress", "Fashion", "Dresses", "Elegant evening dress for date night",
      2499, 3499, "https://example.com/dress.webp", "Myntra", "https://YOUR-AFFILIATE-LINK",
      "date-night,party,dress", true, true, true, "date-night", 1
    ]]);
  }
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, 12, rows, 3).insertCheckboxes(); // featured, trending, active
  const cats = ["Fashion", "Beauty", "Jewelry", "Bags", "Shoes", "Lifestyle", "Home", "Affordable Finds"];
  sheet.getRange(2, 3, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(cats, true).setAllowInvalid(true).build());
  sheet.getRange(2, 6, rows, 2).setNumberFormat("₹#,##0");
  sheet.autoResizeColumns(1, headers.length);

  if (!ss.getSheetByName(LOOKS_SHEET_NAME)) {
    const looks = ss.insertSheet(LOOKS_SHEET_NAME);
    looks.getRange(1, 1, 1, 6).setValues([["lookId", "title", "caption", "image", "active", "sortOrder"]]).setFontWeight("bold").setBackground("#F4EBDF");
    looks.getRange(2, 1, 1, 6).setValues([["date-night", "Date Night", "Satin, a little shine, and heels you can actually walk in.", "", true, 1]]);
    looks.setFrozenRows(1);
  }
  clearCache();
  SpreadsheetApp.getUi().alert("Products sheet is ready. Add one product per row and tick “active”.");
}

/** Lists rows that won't show correctly on the website. */
function validateSheet() {
  const sheet = openSpreadsheet().getSheetByName(SHEET_NAME);
  const range = sheet.getDataRange();
  const values = range.getValues();
  const formulas = range.getFormulas();
  const index = buildHeaderIndex(values[0]);
  const problems = [];
  const ids = {};
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const get = function (k) { return index[k] === undefined ? "" : row[index[k]]; };
    if (!String(get("name")).trim()) continue;
    const n = r + 1;
    const id = String(get("id")).trim();
    if (!id) problems.push("Row " + n + ": missing id");
    else if (ids[id]) problems.push("Row " + n + ": duplicate id “" + id + "” (also row " + ids[id] + ")");
    else ids[id] = n;
    if (!toBool(get("active"))) problems.push("Row " + n + ": active is not TRUE — hidden from the site");
    if (toNumber(get("price")) === null) problems.push("Row " + n + ": price is empty or not a number");
    if (!safeLink(get("goToLink"))) problems.push("Row " + n + ": goToLink must start with https:// — Shop Now will be disabled");
    let img = get("image");
    const fm = index.image === undefined ? null : String(formulas[r][index.image] || "").match(/^=\s*IMAGE\s*\(\s*"([^"]+)"/i);
    if (fm) img = fm[1];
    if (img && typeof img === "object") continue; // in-cell image
    if (String(img).trim() && !convertImageUrl(img)) problems.push("Row " + n + ": image isn’t a usable URL");
    if (!String(img).trim()) problems.push("Row " + n + ": no image — a placeholder will show");
  }
  SpreadsheetApp.getUi().alert(problems.length ? "Found " + problems.length + " item(s):\n\n" + problems.slice(0, 40).join("\n") : "All good — no problems found.");
}
