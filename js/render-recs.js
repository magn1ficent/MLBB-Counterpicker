import { getIconUrl } from "./icons.js";
import { getHeroRoles, ROLE_ORDER, state } from "./state.js";
import { attachImageFallback, escapeHtml, initials } from "./render-shared.js";

let activeTab = ROLE_ORDER[0];

export function setActiveTab(role) {
  activeTab = ROLE_ORDER.includes(role) ? role : ROLE_ORDER[0];
}

function scoreHero(hero) {
  let score = 0;
  const reasons = [];

  for (const enemyId of state.enemyPicks) {
    const value = state.counterMap[hero.id]?.[enemyId] ?? 0;
    score += value;
    if (value) {
      reasons.push({
        label: state.heroById[enemyId]?.name ?? enemyId,
        value,
      });
    }
  }

  for (const allyId of state.allyPicks) {
    const allyHero = state.heroById[allyId];
    if (!allyHero) {
      continue;
    }
    const value = state.synergyMap[hero.id]?.[allyId] ?? 0;
    if (value) {
      score += value;
      reasons.push({
        label: `${allyHero.name} synergy`,
        value,
      });
    }
  }

  reasons.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return { score, reasons };
}

function positiveReasonLabels(item) {
  return item.reasons
    .filter((reason) => reason.value > 0)
    .map((reason) => reason.label);
}

function overlapPenalty(candidate, selected) {
  const candidateLabels = new Set(positiveReasonLabels(candidate));
  let penalty = 0;

  for (const item of selected) {
    const seen = positiveReasonLabels(item);
    const shared = seen.filter((label) => candidateLabels.has(label)).length;
    if (shared >= 2) {
      penalty += 1.5;
    } else if (shared === 1) {
      penalty += 0.75;
    }
  }

  return penalty;
}

function pickDiverseTop(items, limit = 3) {
  const pool = [...items].sort((a, b) => b.score - a.score);
  const selected = [];

  while (pool.length && selected.length < limit) {
    let bestIndex = 0;
    let bestValue = -Infinity;

    for (let index = 0; index < pool.length; index += 1) {
      const candidate = pool[index];
      const adjustedScore = candidate.score - overlapPenalty(candidate, selected);
      if (adjustedScore > bestValue) {
        bestValue = adjustedScore;
        bestIndex = index;
      }
    }

    selected.push(pool.splice(bestIndex, 1)[0]);
  }

  return selected;
}

function topByRole() {
  const groups = Object.fromEntries(ROLE_ORDER.map((role) => [role, []]));

  if (!state.enemyPicks.length) {
    return groups;
  }

  const unavailable = new Set([
    ...state.allyPicks,
    ...state.enemyPicks,
    ...state.enemyBans,
  ]);

  for (const hero of state.heroes) {
    if (unavailable.has(hero.id)) {
      continue;
    }
    if (state.onlyMine && !state.myPool.has(hero.id)) {
      continue;
    }

    const { score, reasons } = scoreHero(hero);
    for (const role of getHeroRoles(hero)) {
      if (groups[role]) {
        groups[role].push({ hero, score, reasons });
      }
    }
  }

  for (const role of ROLE_ORDER) {
    groups[role].sort((a, b) => b.score - a.score);
    groups[role] = pickDiverseTop(groups[role], 3);
  }

  return groups;
}

function buildReasonHtml(reason) {
  const cls = reason.value > 0 ? "pos" : "neg";
  const sign = reason.value > 0 ? "+" : "";
  return `<span class="rec-factor ${cls}"><span class="rec-factor-score">${sign}${reason.value}</span><span class="rec-factor-label">${escapeHtml(reason.label)}</span></span>`;
}

export function renderRecs(els) {
  if (!state.enemyPicks.length) {
    els.recsTabs.innerHTML = "";
    els.recsContent.innerHTML =
      '<div class="recs-empty"><div class="recs-empty-icon">⚔️</div>Add at least 1 enemy pick<br>to see recommendations</div>';
    return;
  }

  const byRole = topByRole();
  els.recsTabs.innerHTML = "";

  for (const role of ROLE_ORDER) {
    const button = document.createElement("button");
    button.className = "recs-tab" + (role === activeTab ? " active" : "");
    button.type = "button";
    button.textContent = role;
    button.onclick = () => {
      activeTab = role;
      renderRecs(els);
    };
    els.recsTabs.appendChild(button);
  }

  const items = (byRole[activeTab] || []).filter((item) => item.score > 0);
  els.recsContent.innerHTML = "";

  if (!items.length) {
    els.recsContent.innerHTML = `<div class="recs-empty">${
      state.onlyMine
        ? "No strong counterpick from your hero pool for this role"
        : "No strong counterpick for this role right now"
    }</div>`;
    return;
  }

  const maxAbs = Math.max(...items.map((item) => Math.abs(item.score)), 1);
  const BAR_MAX = 90;

  items.forEach(({ hero, score, reasons }, index) => {
    const scoreClass = score > 0 ? "sc-pos" : score < 0 ? "sc-neg" : "sc-zero";
    const width = Math.round((Math.abs(score) / maxAbs) * BAR_MAX);
    const sign = score > 0 ? "+" : "";
    const shownReasons = reasons.slice(0, 4);
    const roleBadges = getHeroRoles(hero)
      .map((role) => `<div class="hero-role-badge rb-${escapeHtml(role)}">${escapeHtml(role)}</div>`)
      .join("");
    const why = shownReasons.length
      ? shownReasons.map(buildReasonHtml).join("")
      : '<span class="rec-factor-empty">No data</span>';
    const note =
      reasons.length > shownReasons.length
        ? `Showing ${shownReasons.length} of ${reasons.length} reasons`
        : "";

    const iconUrl = getIconUrl(hero.id);
    const card = document.createElement("div");
    card.className = "rec-card";
    if (index === 0) {
      card.classList.add("rec-card-top");
    }
    card.dataset.role = hero.role;
    card.innerHTML = `
      <div class="rec-rank rr-${index + 1}">${index + 1}</div>
      <div class="rec-ava">
        ${iconUrl ? `<img referrerpolicy="no-referrer" src="${escapeHtml(iconUrl)}" alt="${escapeHtml(hero.name)}">` : ""}
        <div class="rec-ava-init" style="${iconUrl ? "display:none" : ""}">${escapeHtml(initials(hero.name))}</div>
      </div>
      <div class="rec-info">
        <div class="rec-head">
          <div class="rec-name">${escapeHtml(hero.name)}</div>
          <div class="hero-role-list hero-role-list-rec">${roleBadges}</div>
        </div>
        <div class="rec-why">${why}</div>
        ${note ? `<div class="rec-note">${escapeHtml(note)}</div>` : ""}
      </div>
      <div class="rec-score-col">
        <div class="rec-score ${scoreClass}">${sign}${score}</div>
        <div class="score-bar-wrap"><div class="score-bar ${scoreClass}" style="width:${width}%"></div></div>
      </div>
    `;

    const image = card.querySelector(".rec-ava img");
    attachImageFallback(image, () => {
      image.style.display = "none";
      const fallback = card.querySelector(".rec-ava-init");
      if (fallback) {
        fallback.style.display = "flex";
      }
    });

    els.recsContent.appendChild(card);
  });
}
