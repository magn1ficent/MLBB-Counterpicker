import { loadIcons } from "./icons.js";
import {
  buildSynergyMap,
  buildCounterMap,
  renderDraft,
  renderGrid,
  renderRecs,
  setActiveTab,
} from "./render.js";
import { saveOnlyMine, state } from "./state.js";

const els = {
  loadingOverlay: document.getElementById("loadingOverlay"),
  errorBox: document.getElementById("errorBox"),
  errorMsg: document.getElementById("errorMsg"),
  statusPill: document.getElementById("statusPill"),

  search: document.getElementById("search"),
  searchClear: document.getElementById("searchClear"),
  poolCount: document.getElementById("poolCount"),
  heroGrid: document.getElementById("heroGrid"),

  bansSection: document.getElementById("bansSection"),
  picksSection: document.getElementById("picksSection"),
  alliesSection: document.getElementById("alliesSection"),
  alliesHeader: document.getElementById("alliesHeader"),
  bansHeader: document.getElementById("bansHeader"),
  picksHeader: document.getElementById("picksHeader"),
  allyCount: document.getElementById("allyCount"),
  banCount: document.getElementById("banCount"),
  pickCount: document.getElementById("pickCount"),
  allyRow: document.getElementById("allyRow"),
  banRow: document.getElementById("banRow"),
  pickRow: document.getElementById("pickRow"),

  recsTabs: document.getElementById("recsTabs"),
  recsContent: document.getElementById("recsContent"),

  demoBtn: document.getElementById("demoBtn"),
  clearBtn: document.getElementById("clearBtn"),
  mineToggle: document.getElementById("mineToggle"),
  roleButtons: Array.from(document.querySelectorAll(".role-chip")),
};

const renderCallbacks = {
  renderGrid: () => renderGrid(els, renderCallbacks),
  renderDraft: () => renderDraft(els, renderCallbacks),
  renderRecs: () => renderRecs(els),
};

function renderAll() {
  renderCallbacks.renderGrid();
  renderCallbacks.renderDraft();
  renderCallbacks.renderRecs();
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${path}: HTTP ${res.status}`);
  }
  return await res.json();
}

function fillDemo() {
  const ids = state.heroes.map((hero) => hero.id);
  const used = new Set();

  const pickUnique = () => {
    let id;
    do {
      id = ids[Math.floor(Math.random() * ids.length)];
    } while (used.has(id));
    used.add(id);
    return id;
  };

  state.allyPicks = Array.from({ length: 4 }, pickUnique);
  state.enemyPicks = Array.from({ length: 5 }, pickUnique);
  state.enemyBans = Array.from({ length: 10 }, pickUnique);
  renderAll();
}

function bindEvents() {
  els.alliesHeader.addEventListener("click", () => {
    const isOpen = els.alliesSection.classList.toggle("open");
    els.alliesHeader.setAttribute("aria-expanded", String(isOpen));
  });

  els.bansHeader.addEventListener("click", () => {
    const isOpen = els.bansSection.classList.toggle("open");
    els.bansHeader.setAttribute("aria-expanded", String(isOpen));
  });

  els.picksHeader.addEventListener("click", () => {
    const isOpen = els.picksSection.classList.toggle("open");
    els.picksHeader.setAttribute("aria-expanded", String(isOpen));
  });

  els.mineToggle.addEventListener("click", () => {
    state.onlyMine = !state.onlyMine;
    saveOnlyMine(state.onlyMine);
    els.mineToggle.classList.toggle("on", state.onlyMine);
    els.mineToggle.setAttribute("aria-pressed", String(state.onlyMine));
    renderCallbacks.renderGrid();
    renderCallbacks.renderRecs();
  });

  els.search.addEventListener("input", renderCallbacks.renderGrid);
  els.search.addEventListener("input", () => {
    els.searchClear.classList.toggle("visible", Boolean(els.search.value.trim()));
  });
  els.searchClear.addEventListener("click", () => {
    els.search.value = "";
    els.searchClear.classList.remove("visible");
    renderCallbacks.renderGrid();
  });
  els.clearBtn.addEventListener("click", () => {
    state.allyPicks = [];
    state.enemyPicks = [];
    state.enemyBans = [];
    renderAll();
  });
  els.demoBtn.addEventListener("click", fillDemo);

  for (const button of els.roleButtons) {
    button.addEventListener("click", () => {
      state.roleFilter = button.dataset.role;
      for (const roleButton of els.roleButtons) {
        roleButton.classList.toggle("active", roleButton === button);
      }
      renderCallbacks.renderGrid();
    });
  }
}

async function init() {
  try {
    const [heroes, counters, synergies] = await Promise.all([
      fetchJson("./data/heroes.json"),
      fetchJson("./data/counters.json"),
      fetchJson("./data/synergies.json"),
    ]);

    await loadIcons();
    state.heroes = heroes;
    state.counterMap = buildCounterMap(counters);
    state.synergyMap = buildSynergyMap(synergies);
    state.heroById = Object.create(null);

    for (const hero of heroes) {
      state.heroById[hero.id] = hero;
    }

    els.statusPill.textContent = `${heroes.length} heroes · ${counters.length} links`;
    els.loadingOverlay.classList.add("hidden");
    els.searchClear.classList.toggle("visible", Boolean(els.search.value.trim()));
    els.mineToggle.classList.toggle("on", state.onlyMine);
    els.mineToggle.setAttribute("aria-pressed", String(state.onlyMine));
    setActiveTab("Roam");
    renderAll();
  } catch (err) {
    console.error(err);
    els.loadingOverlay.classList.add("hidden");
    els.errorBox.style.display = "flex";
    els.errorMsg.textContent =
      `Open through a local server:\npython -m http.server 8000\n\n${err.message}`;
  }
}

bindEvents();
init();
