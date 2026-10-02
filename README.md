# Nysa Life — Your Style Muse (India)

A premium, India-only affiliate shopping website for Nysa, a fashion, beauty & lifestyle influencer.
**Google Sheets is the admin panel.** Add a row → the product appears on the site. No HTML, CSS or JavaScript edits.

```
Google Sheet ─► Google Apps Script Web App (read-only JSON) ─► GitHub Pages site ─► SHOP NOW ─► Retailer
```

- 100% free: GitHub Pages + Google Sheets + Apps Script.
- Read-only API: no `doPost`, no write code, no API keys or credentials in the browser.
- Fast: Apps Script `CacheService` + browser `localStorage` (stale-while-revalidate).
- If `API_URL` is not set yet, the site runs in **demo mode** with clearly labelled sample products. As soon as a real API URL is set, only live Google Sheet data is ever shown.

---

## Contents

- [File structure](#file-structure)
- [C. Google Sheet column structure](#c-google-sheet-column-structure)
- [D. Example product rows](#d-example-product-rows)
- [F. Google Apps Script deployment](#f-google-apps-script-deployment)
- [E. GitHub Pages deployment](#e-github-pages-deployment)
- [G. How to upload product images](#g-how-to-upload-product-images)
- [H. How to add affiliate links](#h-how-to-add-affiliate-links)
- [I. How to add a new product](#i-how-to-add-a-new-product)
- [J. How to create a new Shop The Look](#j-how-to-create-a-new-shop-the-look)
- [K. How to change the hero photo](#k-how-to-change-the-hero-photo)
- [L. How to change the brand name](#l-how-to-change-the-brand-name)
- [M. How to connect a custom domain](#m-how-to-connect-a-custom-domain)
- [N. Troubleshooting](#n-troubleshooting)
- [Analytics (optional)](#analytics-optional)
- [API reference](#api-reference)

---

## File structure

```
/
├── index.html            Home (hero, looks, trending, moods, budget, picks, feed, categories)
├── shop.html             All products + ?category= ?q= ?max= ?sort= ?look= ?view=saved
├── look.html             All looks, or one look with ?id=date-night
├── about.html            About Nysa
├── disclosure.html       Affiliate disclosure
├── css/  style.css · animations.css · responsive.css
├── js/   config.js (edit this) · api.js · products.js · looks.js · wishlist.js
│         animations.js · analytics.js · app.js
├── assets/
│   ├── hero/hero-girl.webp            ←Nysa's hero photo
│   ├── hero/hero-girl-placeholder.svg (shown until you add one)
│   ├── products/  looks/  icons/
├── google-apps-script/
│   ├── Code.gs                        the API
│   ├── products-template.csv          import into the Products tab
│   └── looks-template.csv             optional Looks tab
└── README.md
```

---

## C. Google Sheet column structure

Tab name: **`Products`** (row 1 = headers, exactly as below; order doesn't matter, and the script also accepts common aliases like `MRP`, `Affiliate Link`, `Go-To URL`).

| Col | Header | Required | What to put |
|---|---|---|---|
| A | `id` | Recommended | A unique short code, e.g. `dress001`. Used for product links and the wishlist. If blank, one is generated from the row number — but then wishlists can break if rows move, so fill it in. |
| B | `name` | **Yes** | Product name shown on the card. Rows with no name are skipped. |
| C | `category` | **Yes** | One of `Fashion`, `Beauty`, `Jewelry`, `Bags`, `Shoes`, `Lifestyle`, `Home`, `Affordable Finds`. New names also work — they appear as extra categories automatically. |
| D | `subcategory` | No | e.g. `Dresses`, `Earrings`, `Lips`. Shown as a small label and searchable. |
| E | `description` | No | One or two sentences. Shown in Quick View. Only say Nysa uses it if she really does. |
| F | `price` | **Yes** | Selling price in rupees, numbers only: `2499` (₹ and commas are stripped if you add them). |
| G | `originalPrice` | No | MRP. If higher than `price`, it's shown struck through with a % off. |
| H | `image` | **Yes** | Image URL, Google Drive link, `=IMAGE("…")` formula, or a repo path like `assets/products/dress.webp`. See [G](#g-how-to-upload-product-images). |
| I | `retailer` | Recommended | `Myntra`, `AJIO`, `Nykaa`, `Amazon`, `Flipkart`, `Tata CLiQ`… Shown on the card and the button. |
| J | `goToLink` | **Yes** | Your affiliate / destination URL. Must start with `https://`. If blank, the button shows as disabled ("Link coming soon"). |
| K | `tags` | No | Comma-separated: `date-night,party,satin`. Searchable and powers "Discover by mood". |
| L | `featured` | No | `TRUE` → appears in **Editor's Picks**. |
| M | `trending` | No | `TRUE` → appears in **Trending Now**. |
| N | `active` | **Yes** | `TRUE` = live on the site. `FALSE` or blank = hidden. Use this instead of deleting rows. |
| O | `lookId` | No | Which look(s) the product belongs to: `date-night`, or several: `date-night,party`. See [J](#j-how-to-create-a-new-shop-the-look). |
| P | `sortOrder` | No | Smaller numbers appear first (1, 2, 3…). Blank = after numbered items. |

**Tip:** Use checkboxes for `featured`, `trending`, `active` (Insert → Checkbox). `TRUE`, `yes`, `y`, `1` and `✓` all count as true.

**Easiest setup:** after pasting `Code.gs` (step F), reload the sheet and use the menu **🛍️ Store → Set up Products sheet**. It creates the tab, headers, checkboxes and formatting for you. **🛍️ Store → Check sheet for problems** reports missing names, bad prices, non-https links and duplicate IDs.

### Optional `Looks` tab

Only needed if you want a custom title, caption or photo per look.

| lookId | title | caption | image | active | sortOrder |
|---|---|---|---|---|---|
| date-night | Date Night | Satin, a little shine… | assets/looks/date-night.webp | TRUE | 1 |

Without this tab, the 9 built-in looks use their own titles and captions, and the hero image.

---

## D. Example product rows

| id | name | category | subcategory | description | price | originalPrice | image | retailer | goToLink | tags | featured | trending | active | lookId | sortOrder |
|---|---|---|---|---|--:|--:|---|---|---|---|---|---|---|---|--:|
| dress001 | Elegant Satin Dress | Fashion | Dresses | Elegant evening dress for date night | 2499 | 3499 | https://example.com/dress.webp | Myntra | https://YOUR-AFFILIATE-LINK | date-night,party,dress | TRUE | TRUE | TRUE | date-night | 1 |
| bag001 | Mini Quilted Shoulder Bag | Bags | Shoulder Bags | Structured mini bag, gold chain | 1499 | 2299 | https://drive.google.com/file/d/FILE_ID/view | AJIO | https://YOUR-AFFILIATE-LINK | date-night,party | FALSE | TRUE | TRUE | date-night | 2 |
| earring001 | Pearl Drop Earrings | Jewelry | Earrings | Lightweight pearl drops | 499 | 799 | assets/products/pearl-drops.webp | Amazon | https://YOUR-AFFILIATE-LINK | pearl,under 499 | TRUE | FALSE | TRUE | date-night,brunch | 3 |
| heels001 | Block Heel Sandals | Shoes | Heels | Comfortable 2-inch block heels | 1999 | 2999 | https://example.com/heels.webp | Myntra | https://YOUR-AFFILIATE-LINK | heels,party | FALSE | FALSE | TRUE | date-night | 4 |

With these four rows, the **Date Night** look shows Dress ₹2,499 · Bag ₹1,499 · Earrings ₹499 · Heels ₹1,999 automatically.

Ready to import: `google-apps-script/products-template.csv` (File → Import → Upload → *Replace current sheet*).

---

## F. Google Apps Script deployment

Do this **before** deploying the website, so you have an API URL to paste in.

1. **Create a Google Sheet** at [sheets.new](https://sheets.new). Name it e.g. *Nysa Life Store*.
2. **Create the `Products` tab**: rename *Sheet1* to `Products` (exact spelling, capital P).
3. **Add the headers** in row 1: `id, name, category, subcategory, description, price, originalPrice, image, retailer, goToLink, tags, featured, trending, active, lookId, sortOrder` — or import `products-template.csv`.
4. **Add products** (one per row) — see [I](#i-how-to-add-a-new-product).
5. Open **Extensions → Apps Script**.
6. Delete the sample code and **paste the whole of `google-apps-script/Code.gs`**. Click 💾 Save. Name the project e.g. *Store API*.
7. **Spreadsheet ID**: because you opened Apps Script *from the sheet*, you can leave `SPREADSHEET_ID = "YOUR_SPREADSHEET_ID"` — the script will use the sheet it's attached to. If you created the script separately at script.google.com, replace it with the ID from your sheet URL:
   `https://docs.google.com/spreadsheets/d/`**`1AbC…xyz`**`/edit` → `const SPREADSHEET_ID = "1AbC…xyz";`
8. Click **Deploy → New deployment**.
9. Click the ⚙️ gear next to *Select type* → choose **Web app**.
10. **Execute as: Me** (your account — the owner).
11. **Who has access: Anyone** (this is what lets the website read it; the API is read-only, so visitors can only *see* active products, never edit).
12. Click **Deploy** → **Authorize access** → pick your account → *Advanced* → *Go to Store API (unsafe)* → **Allow**. (Google shows "unsafe" for every personal script that hasn't been through Google's review — it's your own code.) Copy the **Web app URL** — it ends in `/exec`.
13. Open **`js/config.js`** and paste it:

   ```js
   const CONFIG = {
     API_URL: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
     BRAND_NAME: "Nysa Life",
     INSTAGRAM_URL: "https://instagram.com/yourhandle",
     YOUTUBE_URL: "https://youtube.com/@yourhandle",
     PINTEREST_URL: "https://pinterest.com/yourhandle",
     …
   };
   ```

**Test it:** open `YOUR_URL?action=health` in a browser — you should see `{"success":true, …}`. Then `YOUR_URL?action=products`.

**Reload the sheet** after deploying — you'll now see a **🛍️ Store** menu.

> ⚠️ **Changed `Code.gs` later?** Saving is not enough. Go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. This keeps the same URL. (Choosing *New deployment* instead creates a *new* URL you'd have to paste into `config.js` again.)
>
> You do **not** need to redeploy when you edit *products* — only when you edit the *code*.

### How fast do sheet changes appear?

- Editing the sheet by hand clears the API cache immediately (`onEdit`). Otherwise the API cache lasts **5 minutes** (`CACHE_SECONDS`).
- The browser shows its saved copy instantly, then fetches fresh data in the background on every visit and swaps it in smoothly. Visitors see changes on their **next page load**.
- In a hurry? **🛍️ Store → Refresh website now**.

---

## E. GitHub Pages deployment

1. Create a free account at [github.com](https://github.com) → **New repository** → name it e.g. `nysa-life` → **Public** → Create.
2. **Add file → Upload files** → drag in **everything inside** this folder (so `index.html` is at the top level of the repo, not inside a sub-folder) → **Commit changes**.
3. Repository **Settings → Pages** → *Source: Deploy from a branch* → Branch **`main`** / folder **`/ (root)`** → **Save**.
4. Wait 1–2 minutes. Your site is live at `https://YOUR-USERNAME.github.io/nysa-life/`.

To update later: open the file on GitHub → ✏️ edit → *Commit changes* (or upload the new file). GitHub Pages redeploys in about a minute. Hard-refresh (Ctrl/Cmd+Shift+R) to see CSS/JS changes.

Canonical URLs are set from the real page address automatically, so `config.js` is the only file you need to edit.

**Testing locally** (optional): `python3 -m http.server 8000` inside the folder → open `http://localhost:8000`. (Opening `index.html` by double-click also works.)

---

## G. How to upload product images

### Recommended: Google Drive folder (free, easy)

1. In Google Drive create a folder named **`Store Products`**.
2. Right-click the folder → **Share** → *General access* → **Anyone with the link** → role **Viewer** → Done. Every image you put in this folder inherits this setting.
3. Upload product images (JPG/PNG/WebP, ideally **square or 4:5 portrait, ~1000–1200 px wide, under 300 KB**).
4. Right-click an image → **Share → Copy link**. You get something like
   `https://drive.google.com/file/d/1a2B3c…/view?usp=sharing`
5. Paste that link into the **`image`** column. Done — the Apps Script converts it automatically to a fast thumbnail URL:
   `https://drive.google.com/thumbnail?id=1a2B3c…&sz=w1200`

Supported Drive link formats: `/file/d/ID/view`, `open?id=ID`, `uc?id=ID`, `thumbnail?id=ID`.

> Never set the folder to *Restricted* — visitors aren't logged in to your Google account, so they'd see the placeholder instead.

### Other ways (all supported)

- **Direct image URL** from any public host/CDN (`https://…/product.webp`). Retailer product-image URLs often block hot-linking or expire — prefer your own copy.
- **`=IMAGE("https://…")` formula** — the script reads the URL out of the formula, so the image shows in the sheet *and* on the site.
- **Repo images** — upload to `assets/products/` on GitHub and write `assets/products/my-dress.webp` in the `image` column. Fastest option; convert to WebP at [squoosh.app](https://squoosh.app).

If any image fails to load, the site shows an elegant category placeholder — never a broken-image icon.

---

## H. How to add affiliate links

1. Join the programs you want (e.g. Amazon Associates India, EarnKaro/Cuelinks/INRDeals for Myntra, AJIO, Nykaa, Flipkart and others; some retailers run their own programs).
2. Generate your tracking link for the **exact product** in that network's dashboard or link-builder.
3. Paste the full `https://…` link into **`goToLink`**.

The site opens it in a new tab with `target="_blank" rel="nofollow sponsored noopener"` — directly to the retailer, no fake checkout, and the button says which retailer the visitor is going to. Only `http(s)` links are accepted; anything else is treated as blank and the button is disabled.

Keep the disclosure page up and linked (it's in the footer and on the homepage) — Indian ASCI guidelines and most affiliate programs require clear disclosure.

---

## I. How to add a new product

1. Open the Google Sheet.
2. Add a new row.
3. Type a unique **id** (e.g. `top014`) and the product **name**.
4. Choose the **category**.
5. Type the **price** (and optionally **originalPrice**).
6. Paste the **image** URL / Drive link.
7. Type the **retailer** and paste the affiliate **goToLink**.
8. Tick **active** (`TRUE`). Optionally tick **featured** / **trending**, add **tags** and a **lookId**.
9. That's it — Sheets saves automatically.

Refresh the website (it may take a moment; see *How fast do sheet changes appear?*). **No code editing.**

To hide a product: untick `active`. To reorder: change `sortOrder`.

---

## J. How to create a new Shop The Look

**Using a built-in look** — put the look's id in each product's **`lookId`** column:

`coffee-date` · `date-night` · `office` · `travel` · `brunch` · `party` · `wedding` · `festive` · `weekend`

All products with `lookId = date-night` appear together under **Date Night** on the homepage, at `look.html?id=date-night`, and at `shop.html?look=date-night`, with an auto-calculated "complete the look" total. A product can be in several looks: `date-night,party`. Change the rows → the look changes. Looks with no products are hidden automatically.

**Creating a brand-new look** (e.g. *Monsoon*):

1. Type `monsoon` (lowercase, dashes instead of spaces) in the `lookId` of the products. That alone creates the look — its title becomes "Monsoon".
2. *(Optional)* For a proper title, caption and its own photo of Nysa, add a tab called **`Looks`** with headers `lookId, title, caption, image, active, sortOrder` and a row:
   `monsoon | Monsoon Edit | Quick-dry fabrics and a bright umbrella. | <image link> | TRUE | 10`
   (Template: `google-apps-script/looks-template.csv`.) You can also use this tab to give built-in looks their own images.

Look images are best as **4:5 or 9:16 portraits** of the AI creator wearing the look (they're also used in *From Her Feed*).

---

## K. How to change the hero photo

1. Prepare your image: **portrait, ~1000 × 1500 px, WebP, under ~250 KB**. A **transparent background** (cut-out PNG/WebP) looks best — she then floats in front of the arch and glow.
2. Name it **`hero-girl.webp`** and upload it to **`assets/hero/`** (replace the existing file).
3. In `js/config.js`:
   - `HERO_IS_CUTOUT: true` → for transparent cut-outs.
   - `HERO_IS_CUTOUT: false` → for a normal photo with a background; it's framed elegantly inside the arch instead.
   - Using a different file name or a URL? Set `HERO_IMAGE: "assets/hero/your-file.webp"`.
4. Change her name with `CREATOR_NAME: "Nysa"`.

Until `hero-girl.webp` exists, a stylised illustrated placeholder is shown so the layout never breaks.

**Tips:** use a photo you own or have permission to use; warm, soft-light portraits match the ivory/champagne palette. If the face is off-centre, adjust `HERO_FOCUS` (e.g. `"74% 32%"` = 74% from the left, 32% from the top).

---

## L. How to change the brand name

In `js/config.js` set `BRAND_NAME: "Your Brand"`. The logo, footer, page titles' brand suffix and structured data update everywhere automatically.

Optional polish (only if you want the new name in search-engine previews before JavaScript runs): search-and-replace `Nysa Life` in the five `.html` files, and `Nysa` → your creator's name. Colours live at the top of `css/style.css` (`:root` tokens) if you ever want to adjust them.

---

## M. How to connect a custom domain

1. Buy a domain (e.g. from GoDaddy, Namecheap, Hostinger, Cloudflare).
2. GitHub repo → **Settings → Pages → Custom domain** → type `www.yourbrand.in` → Save. (GitHub creates a `CNAME` file in the repo for you.)
3. At your domain registrar's DNS settings add:
   - **CNAME** record: host `www` → `YOUR-USERNAME.github.io`
   - For the bare domain (`yourbrand.in`), **A** records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
4. Wait for DNS (minutes to a few hours), then tick **Enforce HTTPS** in Settings → Pages.

Nothing else changes — the Apps Script URL keeps working with any domain.

---

## N. Troubleshooting

**CORS / "blocked by CORS policy" in the console**
Apps Script web apps redirect to `googleusercontent.com`, which some browsers/extensions block. The site automatically falls back to **JSONP** (`&callback=`), so this normally fixes itself. If it doesn't: make sure the URL ends in **`/exec`** (not `/dev`), access is **Anyone**, and you're not using an ad-blocker that blocks `script.google.com`.

**Google Apps Script permissions / "Authorization required" / a Google sign-in page instead of JSON**
- Deployment must be **Execute as: Me** and **Who has access: Anyone** (not "Anyone with Google account"). Fix via *Deploy → Manage deployments → Edit*.
- Re-run authorisation: in the Apps Script editor select `setupSheet` or `refreshNow` → ▶ Run → Allow.
- If you're signed in to several Google accounts, test the URL in an incognito window.
- Workspace (company/college) accounts may block public web apps — use a personal Gmail account.

**Invalid image / placeholder shows instead of the photo**
- Drive: the file/folder must be *Anyone with the link → Viewer*. Paste the file's share link, not a folder link.
- Direct URL: open it in a private window — if it doesn't show the picture alone, it won't work. Some retailers block hot-linking; download and re-host on Drive or in `assets/products/`.
- Repo path: check spelling and capitalisation (`Dress.webp` ≠ `dress.webp` on GitHub Pages).
- HEIC photos from iPhones don't display in browsers — convert to JPG/WebP.

**Missing product (row doesn't appear)**
- `active` must be `TRUE`, and `name` must not be empty.
- The tab must be called exactly `Products` and headers must be in **row 1**.
- Wrong category spelling creates a new category rather than joining e.g. *Fashion*.
- Wait for the cache or use **🛍️ Store → Refresh website now**, then reload the page. Run **🛍️ Store → Check sheet for problems**.
- Changes made by formulas/imports don't trigger `onEdit` — use *Refresh website now*.

**API unavailable**
- The site keeps working: returning visitors see their saved products with the note *"Showing recently loaded finds."*; first-time visitors see skeleton loaders with a *Try again* button (never fake products on a live site).
- Check `YOUR_URL?action=health`. Common causes: wrong URL in `config.js` (typo, missing `/exec`), the deployment was archived, `SPREADSHEET_ID` wrong, or Google's daily quotas (very generous for this use; the cache keeps reads low).
- If `config.js` still says `YOUR_GOOGLE_APPS_SCRIPT_URL`, the site shows labelled **demo** products on purpose.

**Broken affiliate link**
- Blank or non-`http(s)` `goToLink` → button is disabled ("Link coming soon"). Paste the full link including `https://`.
- Link opens the wrong page or 404: the product may be out of stock or the affiliate link expired — regenerate it in your affiliate dashboard. Check periodically; untick `active` for sold-out items.
- Some link shorteners are blocked by browsers — use the network's full link.

**I changed CSS/JS but the site looks the same** — hard-refresh (Ctrl/Cmd+Shift+R); GitHub Pages can take ~1 minute.

---

## Analytics (optional)

Set `GA_MEASUREMENT_ID: "G-XXXXXXX"` in `config.js` (create a GA4 property at analytics.google.com). Leave it blank and no analytics code loads at all. Tracked events:

`product_click` · `shop_look` · `category_click` · `search` · `budget_filter` · `wishlist_add` · `retailer_click`

If you enable analytics, mention it on your disclosure/privacy page.

---

## API reference

All `GET`, read-only, returning JSON `{ "success": true, "count": n, "products": [...] }`.

| Request | Returns |
|---|---|
| `?action=products` | all active products |
| `?action=featured` | `featured = TRUE` |
| `?action=trending` | `trending = TRUE` |
| `?action=category&value=Fashion` | products in a category (case-insensitive) |
| `?action=search&value=dress` | text search (name, category, subcategory, tags, retailer, description; understands "under 1000") |
| `?action=look&value=date-night` | products in a look |
| `?action=product&id=dress001` | one product (`product` key) |
| `?action=looks` | rows of the optional Looks tab |
| `?action=all` | products + looks in one call (what the website uses) |
| `?action=health` | status check |

Add `&callback=myFn` for JSONP. Errors return `{ "success": false, "error": "…" }` without exposing internal details.

---

## Design notes

- **Palette:** warm ivory `#fbf6ef`, cream `#f4ebdf`, champagne `#d9bf98`, gold `#b08d57`, blush `#f1d7cf`, rose `#b97a70`, espresso `#2a1d18`, cocoa `#5b463b`.
- **Type:** Bodoni Moda (editorial serif headings) + Jost (UI sans).
- **Motion:** IntersectionObserver reveals, rAF-driven 2.5D hero parallax (mouse on desktop, gentle drift on touch), floating accessories, card tilt, animated tab indicators. All large motion is disabled under `prefers-reduced-motion`.
- **Accessibility:** semantic landmarks, labelled icon buttons, visible focus rings, keyboard-navigable carousel/dialogs, `Esc` to close, `/` to search, safe-area aware bottom nav.
- No framework, no build step, no Three.js — just static files.
