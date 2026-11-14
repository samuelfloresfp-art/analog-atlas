// Generic split modal shell (image left / text right) with focus trap and Esc.

import { S } from "../strings.js";
import { esc, hueFrom } from "../util.js";

let lastFocus = null;

export function closeModal() {
  const root = document.getElementById("modal-root");
  if (!root || !root.innerHTML) return;
  root.innerHTML = "";
  document.removeEventListener("keydown", onKey);
  lastFocus?.focus?.();
}

function onKey(e) {
  if (e.key === "Escape") closeModal();
  if (e.key !== "Tab") return;
  const box = document.querySelector(".modal");
  if (!box) return;
  const f = box.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex="0"]');
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    last.focus();
    e.preventDefault();
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus();
    e.preventDefault();
  }
}

export function imageHtml(name, idForColor, imageUrl) {
  if (imageUrl) return `<img src="${esc(imageUrl)}" alt="${esc(name)}" />`;
  const h = hueFrom(idForColor);
  return `<div class="img-placeholder" style="--h1:${h};--h2:${(h + 60) % 360}">
    <span class="ph-name">${esc(name)}</span>
    <span class="ph-note">${esc(S.imagePlaceholder)}</span>
  </div>`;
}

/** Opens the modal. `bind(root)` can attach extra handlers. */
export function openModal({ imgHtml, bodyHtml, accent = "#7aa2ff", stateClass = "", bind }) {
  const root = document.getElementById("modal-root");
  lastFocus = document.activeElement;
  root.innerHTML = `<div class="modal-backdrop" data-close>
    <div class="modal ${stateClass}" role="dialog" aria-modal="true" aria-labelledby="modal-title" style="--accent:${accent}">
      <div class="modal-img">${imgHtml}</div>
      <div class="modal-body">
        <button type="button" class="modal-close" aria-label="${esc(S.close)}" data-close>&times;</button>
        ${bodyHtml}
      </div>
    </div>
  </div>`;
  root.querySelectorAll("[data-close]").forEach((el) =>
    el.addEventListener("click", (e) => {
      if (e.target === el) closeModal();
    })
  );
  root.querySelectorAll("a[href^='#']").forEach((a) => a.addEventListener("click", () => closeModal()));
  document.addEventListener("keydown", onKey);
  bind?.(root);
  root.querySelector(".modal-close").focus();
}
