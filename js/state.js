export const ROLE_ORDER = ["Roam", "Jungle", "Mid", "Gold", "Exp"];

const PAGE_KEY =
  typeof location !== "undefined"
    ? location.pathname.replace(/[^a-z0-9/_-]/gi, "_").toLowerCase()
    : "default";
const LS_KEY = `mlbb_pool_v3:${PAGE_KEY}`;
const LS_KEY_LEGACY = "mlbb_pool_v2";
const LS_KEY_OLDER = "mlbb_my_pool_v1";
const LS_ONLY_MINE_KEY = `mlbb_only_mine_v2:${PAGE_KEY}`;
const LS_ONLY_MINE_KEY_LEGACY = "mlbb_only_mine_v1";

export const state = {
  heroes: [],
  counterMap: Object.create(null),
  heroById: Object.create(null),

  allyPicks: [],
  enemyPicks: [],
  enemyBans: [],

  roleFilter: "All",
  onlyMine: loadOnlyMine(),

  myPool: loadMyPool(),
};

function readCookie(name) {
  if (typeof document === "undefined") {
    return null;
  }
  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix));
  if (!match) {
    return null;
  }
  return decodeURIComponent(match.slice(prefix.length));
}

function writeCookie(name, value) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

function readStoredValue(...keys) {
  for (const key of keys) {
    try {
      const value = localStorage.getItem(key);
      if (value != null) {
        return value;
      }
    } catch {
      // Ignore and continue to cookie fallback.
    }
    const cookieValue = readCookie(key);
    if (cookieValue != null) {
      return cookieValue;
    }
  }
  return null;
}

function writeStoredValue(key, value) {
  let wrote = false;
  try {
    localStorage.setItem(key, value);
    wrote = true;
  } catch {
    // Ignore and continue to cookie fallback.
  }
  try {
    writeCookie(key, value);
    wrote = true;
  } catch {
    // Ignore cookie failures.
  }
  return wrote;
}

export function loadMyPool() {
  try {
    const source = readStoredValue(LS_KEY, LS_KEY_LEGACY, LS_KEY_OLDER);
    if (!source) return new Set();
    const arr = JSON.parse(source);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

export function saveMyPool(set) {
  writeStoredValue(LS_KEY, JSON.stringify(Array.from(set)));
}

export function loadOnlyMine() {
  try {
    const value = readStoredValue(LS_ONLY_MINE_KEY, LS_ONLY_MINE_KEY_LEGACY);
    return value === "true";
  } catch {
    return false;
  }
}

export function saveOnlyMine(value) {
  writeStoredValue(LS_ONLY_MINE_KEY, String(value));
}

export function getHeroRoles(hero) {
  if (!hero) {
    return [];
  }
  if (Array.isArray(hero.roles) && hero.roles.length) {
    return hero.roles;
  }
  return hero.role ? [hero.role] : [];
}

export function heroHasRole(hero, role) {
  return getHeroRoles(hero).includes(role);
}

export function heroesShareRole(heroA, heroB) {
  const rolesA = getHeroRoles(heroA);
  const rolesB = new Set(getHeroRoles(heroB));
  return rolesA.some((role) => rolesB.has(role));
}
