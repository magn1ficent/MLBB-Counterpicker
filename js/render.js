import { renderDraft as renderDraftView } from "./render-draft.js";
import { renderGrid as renderHeroes } from "./render-heroes.js";
import { renderRecs as renderRecommendations, setActiveTab } from "./render-recs.js";

export { setActiveTab };

export function buildCounterMap(edges) {
  const map = Object.create(null);
  for (const edge of edges) {
    const { hero, enemy, value } = edge;
    if (!hero || !enemy || typeof value !== "number") {
      continue;
    }
    if (!map[hero]) {
      map[hero] = Object.create(null);
    }
    map[hero][enemy] = value;
  }
  return map;
}

export function buildSynergyMap(edges) {
  const map = Object.create(null);
  for (const edge of edges) {
    const { hero, ally, value } = edge;
    if (!hero || !ally || typeof value !== "number") {
      continue;
    }
    if (!map[hero]) {
      map[hero] = Object.create(null);
    }
    map[hero][ally] = value;
  }
  return map;
}

export function renderGrid(els, callbacks) {
  renderHeroes(els, callbacks);
}

export function renderDraft(els, callbacks) {
  renderDraftView(els, callbacks);
}

export function renderRecs(els) {
  renderRecommendations(els);
}
