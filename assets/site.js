/* assets/site.js
   Sund-snack.dk – site UI scripts
   - Mobile nav drawer (burger)
   - Filters drawer (Filtre +) + search/filter on same page (index)
*/

(() => {
  // =============================
  // Mobile Nav Drawer (burger)
  // =============================
  const btn = document.querySelector(".burger-btn");
  const drawer = document.getElementById("mobileNavDrawer");
  const backdrop = document.getElementById("mobileNavBackdrop");
  const closeBtn = document.querySelector(".drawer-close");

  if (!btn || !drawer || !backdrop) return;

  function openDrawer(){
    drawer.classList.add("is-open");
    backdrop.hidden = false;
    backdrop.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    btn.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("no-scroll");
  }

  function closeDrawer(){
    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("no-scroll");
    // vent lidt med at hide backdrop så animation føles smooth
    window.setTimeout(() => { backdrop.hidden = true; }, 180);
  }

  btn.addEventListener("click", () => {
    const isOpen = drawer.classList.contains("is-open");
    isOpen ? closeDrawer() : openDrawer();
  });

  backdrop.addEventListener("click", closeDrawer);
  closeBtn && closeBtn.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
  });

  // Luk når man klikker et link i drawer
  drawer.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) closeDrawer();
  });
})();

(() => {
  // =============================
  // Filters Drawer + Search (index)
  // =============================
  const qs = (s, r=document) => r.querySelector(s);

  const openBtn = qs("#openFilters");
  const filtersDrawer = qs("#filtersDrawer");

  // Hvis siden ikke har filtre (fx andre sider end index), så stop her.
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
  const closeEls = filtersDrawer.querySelectorAll("[data-close]");

  let ALL = [];
  let selectedCats = new Set();
  let selectedTags = new Set();

  const norm = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, " ");

  function openDrawer(){
    filtersDrawer.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("no-scroll");
  }

  function closeDrawer(){
    filtersDrawer.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("no-scroll");
  }

  openBtn.addEventListener("click", openDrawer);
  closeEls.forEach(el => el.addEventListener("click", closeDrawer));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && filtersDrawer.getAttribute("aria-hidden") === "false") {
      closeDrawer();
    }
  });

  function recipeToText(r){
    return norm([
      r.title,
      r.description,
      (r.categories || []).join(" "),
      (r.tags || []).join(" ")
    ].join(" "));
  }

  function matchesFilters(r){
    if (selectedCats.size){
      const rc = new Set(r.categories || []);
      let ok = false;
      selectedCats.forEach(c => { if (rc.has(c)) ok = true; });
      if (!ok) return false;
    }
    if (selectedTags.size){
      const rt = new Set(r.tags || []);
      let ok = false;
      selectedTags.forEach(t => { if (rt.has(t)) ok = true; });
      if (!ok) return false;
    }
    return true;
  }

  function renderCards(list){
    if (!grid) return;
    grid.innerHTML = list.map(r => {
      const cats = (r.categories || []).slice(0, 3);
      const meta = [
        r.minutes ? `${r.minutes} min` : "",
        r.level ? r.level : ""
      ].filter(Boolean).join(" • ");

      return `
        <article class="card">
          <a class="card-link" href="${r.url || "#"}">
            <div class="thumb" style="background-image:url('${r.image || ""}')"></div>
            <div class="card-body">
              ${meta ? `<p class="card-meta">${meta}</p>` : `<p class="card-meta muted"> </p>`}
              <h3 class="card-title">${r.title || "Opskrift"}</h3>
              <p class="card-desc">${r.description || ""}</p>
              <div class="card-tags">
                ${cats.map(c => `<span class="tag">${c}</span>`).join("")}
              </div>
              <div class="card-cta">Se opskrift →</div>
            </div>
          </a>
        </article>
      `;
    }).join("");
  }

  function updateUI(query, filtered){
    if (resultsTitle && resultsHint){
      if (!query){
        resultsTitle.textContent = "Opskrifter";
        resultsHint.textContent = "Søg i feltet ovenfor for at filtrere.";
      } else {
        resultsTitle.textContent = `Søgeresultater for “${query}”`;
        resultsHint.textContent = "Resultater opdateres live, mens du skriver.";
      }
    }

    if (emptyState && grid){
      emptyState.hidden = filtered.length !== 0;
      grid.hidden = filtered.length === 0;
    }
  }

  function filterAndRender(query){
    const q = norm(query || "");
    let filtered = !q ? ALL : ALL.filter(r => recipeToText(r).includes(q));
    filtered = filtered.filter(matchesFilters);
    renderCards(filtered);
    updateUI(query, filtered);
  }

  function buildList(el, values, setRef){
    if (!el) return;
    el.innerHTML = "";

    values.forEach(label => {
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

  function rebuildFilters(){
    const cats = new Set();
    const tags = new Set();

    ALL.forEach(r => {
      (r.categories || []).forEach(c => cats.add(c));
      (r.tags || []).forEach(t => tags.add(t));
    });

    buildList(catsEl, Array.from(cats).sort(), selectedCats);
    buildList(tagsEl, Array.from(tags).sort(), selectedTags);
  }

  async function loadRecipes(){
    try{
      const res = await fetch("/assets/opskrifter.json", { cache: "no-store" });
      const data = await res.json();
      ALL = Array.isArray(data) ? data : (data.recipes || []);
      if (!Array.isArray(ALL)) ALL = [];
    } catch {
      ALL = [];
    }
  }

  // Buttons
  applyBtn && applyBtn.addEventListener("click", () => {
    closeDrawer();
    filterAndRender(input ? input.value : "");
  });

  resetBtn && resetBtn.addEventListener("click", () => {
    selectedCats = new Set();
    selectedTags = new Set();
    rebuildFilters();
    filterAndRender(input ? input.value : "");
  });

  // Live search
  input && input.addEventListener("input", () => filterAndRender(input.value));

  // Init
  (async () => {
    await loadRecipes();
    rebuildFilters();
    filterAndRender(input ? input.value : "");
  })();
})();
(() => {
  // =============================
  // Header Search Overlay
  // =============================
  const openBtn = document.getElementById("openHeaderSearch");
  const wrap = document.getElementById("headerSearch");
  const input = document.getElementById("globalSearchInput");
  const closeBtn = document.getElementById("closeHeaderSearch");

  if (!openBtn || !wrap || !input) return;

  function open(){
    wrap.classList.add("is-open");
    wrap.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("no-scroll"); // valgfrit, kan fjernes
    window.setTimeout(() => input.focus(), 30);
  }

  function close(){
    wrap.classList.remove("is-open");
    wrap.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("no-scroll");
  }

  openBtn.addEventListener("click", () => {
    const isOpen = wrap.classList.contains("is-open");
    isOpen ? close() : open();
  });

  closeBtn && closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && wrap.classList.contains("is-open")) close();
  });

  // "Virker" søgning: send brugeren til forsiden med query,
  // så index kan vise resultater på samme side (som I allerede har).
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = (input.value || "").trim();
    if (!q) return;

    // Send til forsiden med q=...
    window.location.href = "/?q=" + encodeURIComponent(q);
  });
})();
(() => {
  // =============================
  // Saved recipes (localStorage) + drawer
  // =============================
  const STORAGE_KEY = "ss_saved_v1";

  const openBtn = document.getElementById("openSaved");
  const drawer = document.getElementById("savedDrawer");
  const backdrop = document.getElementById("savedBackdrop");
  const closeBtn = document.getElementById("closeSaved");
  const listEl = document.getElementById("savedList");
  const emptyEl = document.getElementById("savedEmpty");

  // På sider uden header-partial loaded endnu kan det være null → bare stop.
  if (!openBtn || !drawer || !backdrop || !listEl || !emptyEl) return;

  const norm = (s) => String(s || "").trim();

  function readSaved(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function writeSaved(arr){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  function isSaved(url){
    const u = norm(url);
    return readSaved().some(x => x && norm(x.url) === u);
  }

  function addSaved(item){
    const u = norm(item && item.url);
    if (!u) return;

    const list = readSaved();
    if (list.some(x => x && norm(x.url) === u)) return;

    // keep it tidy
    const cleaned = {
      title: norm(item.title) || "Opskrift",
      url: u,
      image: norm(item.image) || ""
    };

    list.unshift(cleaned);
    writeSaved(list.slice(0, 200)); // cap
  }

  function removeSaved(url){
    const u = norm(url);
    const list = readSaved().filter(x => x && norm(x.url) !== u);
    writeSaved(list);
  }

  function openDrawer(){
    drawer.classList.add("is-open");
    backdrop.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("no-scroll");
    render();
  }

  function closeDrawer(){
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("no-scroll");
    window.setTimeout(() => { backdrop.hidden = true; }, 150);
  }

  function render(){
    const list = readSaved();

    if (!list.length){
      listEl.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;

    listEl.innerHTML = list.map(item => `
      <div class="saved-item">
        <div class="saved-thumb" style="background-image:url('${item.image || ""}')"></div>
        <a class="saved-link" href="${item.url}">${item.title || "Opskrift"}</a>
        <button class="saved-remove" type="button" data-remove="${item.url}" aria-label="Fjern">✕</button>
      </div>
    `).join("");
  }

  // Open/close
  openBtn.addEventListener("click", openDrawer);
  closeBtn && closeBtn.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
  });

  // Remove
  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    const url = btn.getAttribute("data-remove");
    removeSaved(url);
    render();

    // Sync hearts on page
    document.dispatchEvent(new CustomEvent("ss:saved-updated"));
  });

  // --------------------------------
  // Hook for heart buttons on recipe pages
  // Add a button with: data-save-recipe
  // --------------------------------
  function syncSaveButtons(){
    const btns = Array.from(document.querySelectorAll("[data-save-recipe]"));
    if (!btns.length) return;

    btns.forEach(btn => {
      const url = btn.getAttribute("data-url") || location.pathname;
      const active = isSaved(url);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.classList.toggle("is-saved", active);
    });
  }

  document.addEventListener("ss:saved-updated", syncSaveButtons);

  // Click handler for save buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-save-recipe]");
    if (!btn) return;

    const item = {
      title: btn.getAttribute("data-title") || document.title,
      url: btn.getAttribute("data-url") || location.pathname,
      image: btn.getAttribute("data-image") || ""
    };

    if (isSaved(item.url)) removeSaved(item.url);
    else addSaved(item);

    document.dispatchEvent(new CustomEvent("ss:saved-updated"));
  });

  // Initial sync
  syncSaveButtons();
})();
