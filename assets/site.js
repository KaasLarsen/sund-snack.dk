/* assets/site.js
   Sund-snack.dk – site UI scripts (clean + partial-safe)
   - Header: search overlay + saved drawer + badge (works with header loaded via fetch partial)
   - Mobile nav drawer (burger)
   - Index: filters drawer + search/filter on same page
*/

(() => {
  // =============================
  // Helpers
  // =============================
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const norm = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, " ");

  // =============================
  // SAVED (localStorage)
  // =============================
  const STORAGE_KEY = "ss_saved_v1";

  function readSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function writeSaved(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function isSaved(url) {
    const u = String(url || "").trim();
    return readSaved().some((x) => x && String(x.url || "").trim() === u);
  }

  function addSaved(item) {
    const url = String(item?.url || "").trim();
    if (!url) return;

    const list = readSaved();
    if (list.some((x) => x && String(x.url || "").trim() === url)) return;

    list.unshift({
      title: String(item?.title || "Opskrift").trim(),
      url,
      image: String(item?.image || "").trim(),
    });

    writeSaved(list.slice(0, 200));
  }

  function removeSaved(url) {
    const u = String(url || "").trim();
    writeSaved(readSaved().filter((x) => x && String(x.url || "").trim() !== u));
  }

  function updateSavedBadge() {
    const badge = document.getElementById("savedBadge");
    if (!badge) return;
    const n = readSaved().length;
    badge.textContent = String(n);
    badge.hidden = n === 0;
  }

  function renderSavedDrawer() {
    const listEl = document.getElementById("savedList");
    const emptyEl = document.getElementById("savedEmpty");
    if (!listEl || !emptyEl) return;

    const list = readSaved();
    if (!list.length) {
      listEl.innerHTML = "";
      emptyEl.hidden = false;
      updateSavedBadge();
      return;
    }

    emptyEl.hidden = true;
    listEl.innerHTML = list
      .map(
        (item) => `
        <div class="saved-item">
          <div class="saved-thumb" style="background-image:url('${item.image || ""}')"></div>
          <a class="saved-link" href="${item.url}">${item.title || "Opskrift"}</a>
          <button class="saved-remove" type="button" data-remove="${item.url}" aria-label="Fjern">✕</button>
        </div>
      `
      )
      .join("");

    updateSavedBadge();
  }

  function openSavedDrawer() {
    const drawer = document.getElementById("savedDrawer");
    const backdrop = document.getElementById("savedBackdrop");
    if (!drawer || !backdrop) return;

    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;

    document.documentElement.classList.add("no-scroll");
    renderSavedDrawer();
  }

  function closeSavedDrawer() {
    const drawer = document.getElementById("savedDrawer");
    const backdrop = document.getElementById("savedBackdrop");
    if (!drawer || !backdrop) return;

    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("no-scroll");

    window.setTimeout(() => {
      backdrop.hidden = true;
    }, 150);
  }

  function syncSaveButtonsOnPage() {
    const btns = qsa("[data-save-recipe]");
    if (!btns.length) return;

    btns.forEach((btn) => {
      const url = btn.getAttribute("data-url") || location.pathname;
      const active = isSaved(url);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.classList.toggle("is-saved", active);
    });
  }

  // =============================
  // HEADER SEARCH OVERLAY
  // =============================
  function openHeaderSearch() {
    const wrap = document.getElementById("headerSearch");
    const input = document.getElementById("globalSearchInput");
    if (!wrap || !input) return;

    wrap.classList.add("is-open");
    wrap.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("no-scroll");

    window.setTimeout(() => input.focus(), 40);
  }

  function closeHeaderSearch() {
    const wrap = document.getElementById("headerSearch");
    if (!wrap) return;

    wrap.classList.remove("is-open");
    wrap.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("no-scroll");
  }

  // =============================
  // MOBILE NAV DRAWER (burger)
  // NOTE: header is injected later, so use delegation
  // =============================
  function openMobileNav() {
    const drawer = document.getElementById("mobileNavDrawer");
    const backdrop = document.getElementById("mobileNavBackdrop");
    const btn = document.querySelector(".burger-btn");
    if (!drawer || !backdrop || !btn) return;

    drawer.classList.add("is-open");
    backdrop.hidden = false;
    backdrop.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    btn.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("no-scroll");
  }

  function closeMobileNav() {
    const drawer = document.getElementById("mobileNavDrawer");
    const backdrop = document.getElementById("mobileNavBackdrop");
    const btn = document.querySelector(".burger-btn");
    if (!drawer || !backdrop || !btn) return;

    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("no-scroll");
    window.setTimeout(() => {
      backdrop.hidden = true;
    }, 180);
  }

  // =============================
  // INDEX FILTERS + SEARCH
  // (only if elements exist)
  // =============================
  function initIndexFiltersAndSearch() {
    const openBtn = qs("#openFilters");
    const filtersDrawer = qs("#filtersDrawer");
    if (!openBtn || !filtersDrawer) return;

    const input = qs("#q");
    const grid = qs("#recipesGrid");
    const emptyState = qs("#emptyState");
    const resultsTitle = qs("#resultsTitle");
    const resultsHint = qs("#resultsHint");

    const catsEl = qs("#filtersCats");
    const tagsEl = qs("#filtersTags");
    const applyBtn = qs("#applyFilters");
    const resetBtn = qs("#resetFilters");
    const closeEls = qsa("[data-close]", filtersDrawer);

    let ALL = [];
    let selectedCats = new Set();
    let selectedTags = new Set();

    function recipeToText(r) {
      return norm(
        [r.title, r.description, (r.categories || []).join(" "), (r.tags || []).join(" ")].join(" ")
      );
    }

    function matchesFilters(r) {
      if (selectedCats.size) {
        const rc = new Set(r.categories || []);
        let ok = false;
        selectedCats.forEach((c) => {
          if (rc.has(c)) ok = true;
        });
        if (!ok) return false;
      }
      if (selectedTags.size) {
        const rt = new Set(r.tags || []);
        let ok = false;
        selectedTags.forEach((t) => {
          if (rt.has(t)) ok = true;
        });
        if (!ok) return false;
      }
      return true;
    }

    function renderCards(list) {
      if (!grid) return;
      grid.innerHTML = list
        .map((r) => {
          const cats = (r.categories || []).slice(0, 3);
          const meta = [r.minutes ? `${r.minutes} min` : "", r.level ? r.level : ""]
            .filter(Boolean)
            .join(" • ");

          return `
            <article class="card">
              <a class="card-link" href="${r.url || "#"}">
                <div class="thumb" style="background-image:url('${r.image || ""}')"></div>
                <div class="card-body">
                  ${meta ? `<p class="card-meta">${meta}</p>` : `<p class="card-meta muted"> </p>`}
                  <h3 class="card-title">${r.title || "Opskrift"}</h3>
                  <p class="card-desc">${r.description || ""}</p>
                  <div class="card-tags">
                    ${cats.map((c) => `<span class="tag">${c}</span>`).join("")}
                  </div>
                  <div class="card-cta">Se opskrift →</div>
                </div>
              </a>
            </article>
          `;
        })
        .join("");
    }

    function updateUI(query, filtered) {
      if (resultsTitle && resultsHint) {
        if (!query) {
          resultsTitle.textContent = "Opskrifter";
          resultsHint.textContent = "Søg i feltet ovenfor for at filtrere.";
        } else {
          resultsTitle.textContent = `Søgeresultater for “${query}”`;
          resultsHint.textContent = "Resultater opdateres live, mens du skriver.";
        }
      }

      if (emptyState && grid) {
        emptyState.hidden = filtered.length !== 0;
        grid.hidden = filtered.length === 0;
      }
    }

    function filterAndRender(query) {
      const q = norm(query || "");
      let filtered = !q ? ALL : ALL.filter((r) => recipeToText(r).includes(q));
      filtered = filtered.filter(matchesFilters);
      renderCards(filtered);
      updateUI(query, filtered);
    }

    function buildList(el, values, setRef) {
      if (!el) return;
      el.innerHTML = "";

      values.forEach((label) => {
        const id = "f_" + label.replace(/\W+/g, "_").toLowerCase();

        const row = document.createElement("label");
        row.className = "filters-item";
        row.setAttribute("for", id);

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = id;
        cb.checked = setRef.has(label);

        cb.addEventListener("change", () => {
          if (cb.checked) setRef.add(label);
          else setRef.delete(label);
        });

        const text = document.createElement("span");
        text.textContent = label;

        row.appendChild(cb);
        row.appendChild(text);
        el.appendChild(row);
      });
    }

    function rebuildFilters() {
      const cats = new Set();
      const tags = new Set();

      ALL.forEach((r) => {
        (r.categories || []).forEach((c) => cats.add(c));
        (r.tags || []).forEach((t) => tags.add(t));
      });

      buildList(catsEl, Array.from(cats).sort(), selectedCats);
      buildList(tagsEl, Array.from(tags).sort(), selectedTags);
    }

    async function loadRecipes() {
      try {
        const res = await fetch("/assets/opskrifter.json", { cache: "no-store" });
        const data = await res.json();
        ALL = Array.isArray(data) ? data : data.recipes || [];
        if (!Array.isArray(ALL)) ALL = [];
      } catch {
        ALL = [];
      }
    }

    function openFilters() {
      filtersDrawer.setAttribute("aria-hidden", "false");
      document.documentElement.classList.add("no-scroll");
    }
    function closeFilters() {
      filtersDrawer.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("no-scroll");
    }

    // Bind
    openBtn.addEventListener("click", openFilters);
    closeEls.forEach((el) => el.addEventListener("click", closeFilters));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && filtersDrawer.getAttribute("aria-hidden") === "false") closeFilters();
    });

    applyBtn &&
      applyBtn.addEventListener("click", () => {
        closeFilters();
        filterAndRender(input ? input.value : "");
      });

    resetBtn &&
      resetBtn.addEventListener("click", () => {
        selectedCats = new Set();
        selectedTags = new Set();
        rebuildFilters();
        filterAndRender(input ? input.value : "");
      });

    input && input.addEventListener("input", () => filterAndRender(input.value));

    // Init
    (async () => {
      await loadRecipes();
      rebuildFilters();
      filterAndRender(input ? input.value : "");
    })();
  }

  // =============================
  // HEADER EVENT DELEGATION (works with partials)
  // =============================
  document.addEventListener("click", (e) => {
    // Search overlay
    if (e.target.closest("#openHeaderSearch")) return openHeaderSearch();
    if (e.target.closest("#closeHeaderSearch")) return closeHeaderSearch();

    // Saved drawer
    if (e.target.closest("#openSaved")) return openSavedDrawer();
    if (e.target.closest("#closeSaved") || e.target.closest("#savedBackdrop")) return closeSavedDrawer();

    // Mobile nav
    if (e.target.closest(".burger-btn")) {
      const d = document.getElementById("mobileNavDrawer");
      const isOpen = d && d.classList.contains("is-open");
      return isOpen ? closeMobileNav() : openMobileNav();
    }
    if (e.target.closest("#mobileNavBackdrop") || e.target.closest(".drawer-close")) return closeMobileNav();

    // Remove saved item
    const rem = e.target.closest("[data-remove]");
    if (rem) {
      removeSaved(rem.getAttribute("data-remove"));
      renderSavedDrawer();
      syncSaveButtonsOnPage();
      return;
    }

    // Save button on recipe pages
    const saveBtn = e.target.closest("[data-save-recipe]");
    if (saveBtn) {
      const item = {
        title: saveBtn.getAttribute("data-title") || document.title,
        url: saveBtn.getAttribute("data-url") || location.pathname,
        image: saveBtn.getAttribute("data-image") || "",
      };

      if (isSaved(item.url)) removeSaved(item.url);
      else addSaved(item);

      updateSavedBadge();
      syncSaveButtonsOnPage();
      return;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeHeaderSearch();
      closeSavedDrawer();
      closeMobileNav();
    }

    // Enter in header search
    const headerInput = document.getElementById("globalSearchInput");
    if (e.key === "Enter" && headerInput && document.activeElement === headerInput) {
      const q = (headerInput.value || "").trim();
      if (!q) return;
      window.location.href = "/search.html?q=" + encodeURIComponent(q);
    }
  });

  // Init once (works even before partials; badge will update after)
  initIndexFiltersAndSearch();
  updateSavedBadge();
  syncSaveButtonsOnPage();
  setTimeout(updateSavedBadge, 400);
  setTimeout(updateSavedBadge, 1200);
})();
