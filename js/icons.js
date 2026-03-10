let ICONS = null;

async function tryLoad(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.json();
}

export async function loadIcons() {
  try {
    // 1) пробуем локальные
    ICONS = await tryLoad("./data/icons.local.json");
    if (ICONS) return ICONS;

    // 2) fallback на удалённые
    ICONS = await tryLoad("./data/icons.json");
    return ICONS || {};
  } catch {
    ICONS = {};
    return {};
  }
}

export function getIconUrl(heroId) {
  if (!ICONS) return null;
  return ICONS[heroId] || null;
}