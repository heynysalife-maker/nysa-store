/* ==========================================================================
   WISHLIST — saved on this device only (localStorage). No account, no server.
   ========================================================================== */
(function () {
  const M = (window.Muse = window.Muse || {});
  const KEY = "muse:wishlist:v1";
  let ids = [];
  try { ids = JSON.parse(localStorage.getItem(KEY) || "[]"); if (!Array.isArray(ids)) ids = []; } catch (e) { ids = []; }

  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {} };

  function sync(id) {
    const saved = ids.indexOf(id) > -1;
    document.querySelectorAll('[data-wish="' + CSS.escape(id) + '"]').forEach((b) => {
      b.setAttribute("aria-pressed", String(saved));
      const name = (M.byId && M.byId(id) && M.byId(id).name) || "item";
      b.setAttribute("aria-label", (saved ? "Remove " : "Save ") + name + (saved ? " from" : " to") + " saved finds");
    });
    updateCount();
  }
  function updateCount() {
    document.querySelectorAll("[data-wish-count]").forEach((el) => {
      el.textContent = ids.length ? String(ids.length) : "";
      el.hidden = !ids.length;
    });
  }

  M.wishlist = {
    has: (id) => ids.indexOf(id) > -1,
    list: () => ids.slice(),
    count: () => ids.length,
    toggle(id, btn) {
      const i = ids.indexOf(id);
      if (i > -1) ids.splice(i, 1);
      else {
        ids.unshift(id);
        const p = M.byId && M.byId(id);
        M.track && M.track("wishlist_add", { item_id: id, item_name: p && p.name });
        if (btn && !M.reducedMotion()) { btn.classList.remove("is-pop"); void btn.offsetWidth; btn.classList.add("is-pop"); }
      }
      persist();
      sync(id);
      M.toast && M.toast(i > -1 ? "Removed from saved" : "Saved — find it under Saved", i > -1 ? null : { href: "shop.html?view=saved", label: "View" });
      document.dispatchEvent(new CustomEvent("wishlist:change", { detail: { id } }));
    },
    // drop ids for products that no longer exist in the sheet
    prune(validIds) {
      const before = ids.length;
      ids = ids.filter((id) => validIds.has(id));
      if (ids.length !== before) persist();
      updateCount();
    },
    updateCount
  };
  document.addEventListener("DOMContentLoaded", updateCount);
})();
