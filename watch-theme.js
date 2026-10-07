// Vanilla JavaScript remembers one theme across the journal pages.
(() => {
  const key = "watch-journal-theme";
  const root = document.documentElement;
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  let saved = null;
  // Storage may be blocked; switching themes should still work.
  try { saved = localStorage.getItem(key); } catch (error) { /* Use the system default. */ }
  let chosen = saved === "dark" || saved === "light";

  // Update the CSS palette and the accessible button state together.
  function apply(theme) {
    root.dataset.theme = theme;
    const button = document.querySelector(".theme-toggle");
    if (button) {
      button.textContent = theme === "dark" ? "Light mode" : "Dark mode";
      button.setAttribute("aria-pressed", String(theme === "dark"));
      button.hidden = false;
    }
  }
  apply(chosen ? saved : system.matches ? "dark" : "light");

  // The script runs early in the head, so wait for the header button.
  document.addEventListener("DOMContentLoaded", () => {
    apply(root.dataset.theme);
    const button = document.querySelector(".theme-toggle");
    if (!button) return;
    button.addEventListener("click", () => {
      const theme = root.dataset.theme === "dark" ? "light" : "dark";
      chosen = true;
      apply(theme);
      try { localStorage.setItem(key, theme); } catch (error) { /* Keep this page theme. */ }
    });
  });

  // Follow system changes until the visitor makes an explicit selection.
  system.addEventListener("change", (event) => {
    if (!chosen) apply(event.matches ? "dark" : "light");
  });
})();
