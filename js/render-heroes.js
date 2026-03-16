import { getIconUrl } from "./icons.js";
import { getHeroRoles, heroHasRole, saveMyPool, state } from "./state.js";
import { attachImageFallback, escapeHtml, initials } from "./render-shared.js";

function clearSearchIfNeeded(els) {
  if (!els.search.value.trim()) {
    return;
  }
  els.search.value = "";
  if (els.searchClear) {
    els.searchClear.classList.remove("visible");
  }
}

function bindHoverClass(button, card, className) {
  button.addEventListener("mouseenter", () => card.classList.add(className));
  button.addEventListener("mouseleave", () => card.classList.remove(className));
  button.addEventListener("focus", () => card.classList.add(className));
  button.addEventListener("blur", () => card.classList.remove(className));
}

export function renderGrid(els, callbacks) {
  const query = els.search.value.trim().toLowerCase();
  let heroes = state.heroes.filter((hero) => {
    if (query && !hero.name.toLowerCase().includes(query) && !hero.id.includes(query)) {
      return false;
    }
    if (state.roleFilter !== "All" && !heroHasRole(hero, state.roleFilter)) {
      return false;
    }
    if (state.onlyMine && !state.myPool.has(hero.id)) {
      return false;
    }
    return true;
  });

  heroes.sort((a, b) => a.name.localeCompare(b.name));
  els.poolCount.textContent = `${heroes.length} heroes`;
  els.heroGrid.innerHTML = "";

  if (!heroes.length) {
    els.heroGrid.innerHTML = '<div class="empty-grid">Nothing found</div>';
    return;
  }

  for (const hero of heroes) {
    const inDraft =
      state.allyPicks.includes(hero.id) ||
      state.enemyPicks.includes(hero.id) ||
      state.enemyBans.includes(hero.id);
    const starred = state.myPool.has(hero.id);
    const iconUrl = getIconUrl(hero.id);
    const alliesFull = state.allyPicks.length >= 4;
    const picksFull = state.enemyPicks.length >= 5;
    const bansFull = state.enemyBans.length >= 10;
    const roleBadges = getHeroRoles(hero)
      .map((role) => `<div class="hero-role-badge rb-${escapeHtml(role)}">${escapeHtml(role)}</div>`)
      .join("");
    const card = document.createElement("div");

    card.className = "hero-card" + (inDraft ? " in-draft" : " card-live");
    card.innerHTML = `
      <div class="hero-card-top">
        <div class="hero-avatar">
          ${
            iconUrl
              ? `<img referrerpolicy="no-referrer" src="${escapeHtml(iconUrl)}" alt="${escapeHtml(hero.name)}">`
              : ""
          }
          <div class="hero-initials" style="${iconUrl ? "display:none" : "display:flex"}">${escapeHtml(initials(hero.name))}</div>
        </div>
        <div class="hero-info">
          <div class="hero-name">${escapeHtml(hero.name)}</div>
        </div>
        <div class="hero-meta">
          <div class="hero-role-list">${roleBadges}</div>
          <button class="star-btn${starred ? " on" : ""}" type="button" title="${starred ? "Remove from My Heroes" : "Add to My Heroes"}" aria-label="${starred ? "Remove from My Heroes" : "Add to My Heroes"}">${starred ? "★" : "☆"}</button>
        </div>
      </div>
      <div class="hero-card-actions">
        <button class="action-btn ally-btn" type="button" ${inDraft || alliesFull ? "disabled" : ""}>Ally</button>
        <button class="action-btn pick-btn" type="button" ${inDraft || picksFull ? "disabled" : ""}>Pick</button>
        <button class="action-btn ban-btn" type="button" ${inDraft || bansFull ? "disabled" : ""}>Ban</button>
      </div>
    `;

    const image = card.querySelector(".hero-avatar img");
    attachImageFallback(image, () => {
      image.style.display = "none";
      const fallback = card.querySelector(".hero-initials");
      if (fallback) {
        fallback.style.display = "flex";
      }
    });

    card.querySelector(".star-btn").addEventListener("click", (event) => {
      event.stopPropagation();
      if (state.myPool.has(hero.id)) {
        state.myPool.delete(hero.id);
      } else {
        state.myPool.add(hero.id);
      }
      saveMyPool(state.myPool);
      callbacks.renderGrid();
      callbacks.renderRecs();
    });

    card.querySelector(".ally-btn").addEventListener("click", () => {
      if (inDraft || alliesFull) return;
      state.allyPicks = [...state.allyPicks, hero.id];
      clearSearchIfNeeded(els);
      callbacks.renderDraft();
      callbacks.renderRecs();
      callbacks.renderGrid();
    });

    card.querySelector(".pick-btn").addEventListener("click", () => {
      if (inDraft || picksFull) return;
      state.enemyPicks = [...state.enemyPicks, hero.id];
      clearSearchIfNeeded(els);
      callbacks.renderDraft();
      callbacks.renderRecs();
      callbacks.renderGrid();
    });

    card.querySelector(".ban-btn").addEventListener("click", () => {
      if (inDraft || bansFull) return;
      state.enemyBans = [...state.enemyBans, hero.id];
      clearSearchIfNeeded(els);
      callbacks.renderDraft();
      callbacks.renderRecs();
      callbacks.renderGrid();
    });

    bindHoverClass(card.querySelector(".ally-btn"), card, "ally-hover");
    bindHoverClass(card.querySelector(".pick-btn"), card, "pick-hover");
    bindHoverClass(card.querySelector(".ban-btn"), card, "ban-hover");
    bindHoverClass(card.querySelector(".star-btn"), card, "mine-hover");

    els.heroGrid.appendChild(card);
  }
}
