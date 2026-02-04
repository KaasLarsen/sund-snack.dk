(() => {
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
