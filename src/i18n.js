// Language (pt | en). Chosen on the first visit (welcome screen) and in the top bar.
// Changing it reloads the page so every string and data overlay is rebuilt once.

const KEY = "analogAtlas.lang";

export function getLang() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "pt" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return (navigator.language || "").toLowerCase().startsWith("pt") ? "pt" : "en";
}

export function hasChosenLang() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return true;
  }
}

export function setLang(lang, { reload = true } = {}) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  if (reload) location.reload();
}

export const LANG = getLang();
document.documentElement.lang = LANG === "pt" ? "pt-BR" : "en";
