import { getIconUrl } from "./icons.js";
import { state } from "./state.js";
import { attachImageFallback, escapeHtml, initials } from "./render-shared.js";

function renderRow(container, ids, type, onRemove, totalSlots = 5) {
  container.innerHTML = "";

  for (let index = 0; index < totalSlots; index += 1) {
    const heroId = ids[index];
    const hero = heroId ? state.heroById[heroId] : null;
    const slot = document.createElement("div");

    if (!hero) {
      slot.className = "d-slot";
      slot.innerHTML = '<div class="d-plus">+</div>';
      container.appendChild(slot);
      continue;
    }

    const iconUrl = getIconUrl(hero.id);
    slot.className = `d-slot ${type}-slot slot-pop`;
    slot.innerHTML = `
      ${
        iconUrl
          ? `<img class="d-slot-img" referrerpolicy="no-referrer" src="${escapeHtml(iconUrl)}" alt="${escapeHtml(hero.name)}">`
          : `<div class="d-slot-initials">${escapeHtml(initials(hero.name))}</div>`
      }
      <div class="d-slot-overlay"><div class="d-slot-name">${escapeHtml(hero.name)}</div></div>
      <div class="d-badge ${type}">${type === "pick" ? "PICK" : type === "ban" ? "BAN" : "ALLY"}</div>
      <button class="d-remove" type="button" aria-label="Remove">×</button>
    `;

    const image = slot.querySelector(".d-slot-img");
    attachImageFallback(image, () => {
      image.style.display = "none";
      image.insertAdjacentHTML(
        "afterend",
        `<div class="d-slot-initials">${escapeHtml(initials(hero.name))}</div>`,
      );
    });

    slot.querySelector(".d-remove").onclick = () => onRemove(heroId);
    container.appendChild(slot);
  }
}

export function renderDraft(els, callbacks) {
  els.allyCount.textContent = `${state.allyPicks.length}/4`;
  els.pickCount.textContent = `${state.enemyPicks.length}/5`;
  els.banCount.textContent = `${state.enemyBans.length}/10`;

  els.allyCount.classList.remove("count-bounce");
  void els.allyCount.offsetWidth;
  els.allyCount.classList.add("count-bounce");

  els.pickCount.classList.remove("count-bounce");
  void els.pickCount.offsetWidth;
  els.pickCount.classList.add("count-bounce");

  els.banCount.classList.remove("count-bounce");
  void els.banCount.offsetWidth;
  els.banCount.classList.add("count-bounce");

  els.alliesSection.classList.toggle("open", state.allyPicks.length > 0);
  els.bansSection.classList.toggle("open", state.enemyBans.length > 0);
  els.picksSection.classList.toggle("open", state.enemyPicks.length > 0);
  els.alliesSection.classList.toggle("empty", state.allyPicks.length === 0);
  els.bansSection.classList.toggle("empty", state.enemyBans.length === 0);
  els.picksSection.classList.toggle("empty", state.enemyPicks.length === 0);
  els.alliesHeader.setAttribute("aria-expanded", String(state.allyPicks.length > 0));
  els.bansHeader.setAttribute("aria-expanded", String(state.enemyBans.length > 0));
  els.picksHeader.setAttribute("aria-expanded", String(state.enemyPicks.length > 0));

  renderRow(els.allyRow, state.allyPicks, "ally", (id) => {
    state.allyPicks = state.allyPicks.filter((value) => value !== id);
    callbacks.renderDraft();
    callbacks.renderRecs();
    callbacks.renderGrid();
  }, 4);

  renderRow(els.pickRow, state.enemyPicks, "pick", (id) => {
    state.enemyPicks = state.enemyPicks.filter((value) => value !== id);
    callbacks.renderDraft();
    callbacks.renderRecs();
    callbacks.renderGrid();
  });

  renderRow(els.banRow, state.enemyBans, "ban", (id) => {
    state.enemyBans = state.enemyBans.filter((value) => value !== id);
    callbacks.renderDraft();
    callbacks.renderRecs();
    callbacks.renderGrid();
  }, 10);
}
