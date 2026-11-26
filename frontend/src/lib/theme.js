// Theme preference
const KEY = "tenant-theme";

// Saved or system theme
export function readTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

// Save theme
export function saveTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // No storage: this visit only
  }
}
