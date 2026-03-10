// tools/build-icons.mjs
// Генерация data/icons.json из MLBB Wiki (Fandom) через MediaWiki API (без 403)
// Запуск: node tools/build-icons.mjs
// Требуется Node 18+ (fetch есть из коробки)

import fs from "node:fs/promises";
import path from "node:path";

const HEROES_PATH = path.resolve("data/heroes.json");
const OUT_PATH = path.resolve("data/icons.json");

const API = "https://mobile-legends.fandom.com/api.php";
const PAGE_TITLES = [
  // RU страница у них иногда отсутствует/переименована — поэтому EN будет основной
  "List_of_heroes",
];

const ICON_SIZE = 64;

// --- ВАЖНО: здесь алиасы “имя с вики” -> твой id
// Если на вики герой называется иначе (апострофы, пробелы, дефисы), добавляй сюда.
const NAME_ALIASES_TO_ID = {
  "chang'e": "change",
  "chang’e": "change", // типографский апостроф
  "chang e": "change",
};

// ---------- utils ----------
function normalizeName(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/&#39;|&apos;/g, "'")
    .replace(/’/g, "'")
    .replace(/ё/g, "е")
    // разрешаем буквы/цифры/пробел/дефис/апостроф
    .replace(/[^a-z0-9а-я\s'-]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureSized(url, size = ICON_SIZE) {
  if (!url) return null;

  // Приводим к стабильному формату:
  // https://static.wikia.nocookie.net/.../images/.../HeroXXX-icon.png/revision/latest/scale-to-width-down/64
  const idx = url.indexOf("/revision/");
  if (idx !== -1) {
    const base = url.slice(0, idx);
    return `${base}/revision/latest/scale-to-width-down/${size}`;
  }
  return url;
}

function parseRows(html) {
  const trRe = /<tr[\s\S]*?>[\s\S]*?<\/tr>/gi;
  return html.match(trRe) || [];
}

// Из строки таблицы пытаемся вытащить имя героя.
// На EN странице это обычно ссылка на страницу героя.
function extractHeroNameFromRow(rowHtml) {
  // 1) title="Miya" (или "Chang'e") — самое частое
  let m = rowHtml.match(/<a[^>]+title="([^"]+)"/i);
  if (m?.[1]) {
    const t = m[1].trim();
    // Иногда title может быть типа "Miya, Moonlight Archer" — берём до запятой
    return t.split(",")[0].trim();
  }

  // 2) fallback: текст первой ссылки
  m = rowHtml.match(/<a[^>]*>([^<]{2,80})<\/a>/i);
  if (m?.[1]) return m[1].replace(/\s+/g, " ").trim();

  return null;
}

// В строке таблицы ищем первую картинку (иконку) героя.
function extractIconUrlFromRow(rowHtml) {
  // Fandom часто использует lazy-load data-src
  let m = rowHtml.match(/<img[^>]+data-src="([^"]+)"/i);
  if (m?.[1]) return m[1];

  // иногда обычный src
  m = rowHtml.match(/<img[^>]+src="([^"]+)"/i);
  if (m?.[1]) return m[1];

  return null;
}

async function fetchParseHtml(pageTitle) {
  const url =
    `${API}?action=parse&format=json&prop=text&redirects=1&page=${encodeURIComponent(pageTitle)}`;

  const res = await fetch(url, {
    headers: {
      "user-agent": "mlbb-draft-counter/1.0 icons builder",
      "accept": "application/json,text/plain,*/*",
      "accept-language": "en,ru;q=0.9",
      "referer": "https://mobile-legends.fandom.com/",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} from parse API`);

  const data = await res.json();

  if (data?.error) {
    throw new Error(`API error: ${data.error.code} - ${data.error.info}`);
  }

  // В этом формате HTML лежит в parse.text["*"]
  const html = data?.parse?.text?.["*"];
  if (!html || typeof html !== "string") {
    throw new Error("No HTML in data.parse.text['*'] (unexpected API response)");
  }

  return html;
}

async function main() {
  const heroes = JSON.parse(await fs.readFile(HEROES_PATH, "utf-8"));

  // Карты для матчей:
  // 1) нормализованное имя -> id
  const nameToId = new Map();
  // 2) нормализованный id -> id (на всякий)
  const idToId = new Map();

  for (const h of heroes) {
    nameToId.set(normalizeName(h.name), h.id);
    idToId.set(normalizeName(h.id), h.id);
  }

  // Применяем алиасы
  for (const [k, v] of Object.entries(NAME_ALIASES_TO_ID)) {
    nameToId.set(normalizeName(k), v);
  }

  let html = null;
  let usedTitle = null;

  for (const title of PAGE_TITLES) {
    console.log("Fetching via API parse:", title);
    html = await fetchParseHtml(title);
    usedTitle = title;
    break;
  }

  console.log("Using page:", usedTitle);

  const rows = parseRows(html);

  const icons = {};
  let totalFound = 0;
  let matched = 0;

  // Для диагностики: покажем первые несколько “не сопоставилось”, но с иконкой
  const notMatchedSamples = [];

  for (const row of rows) {
    const rawName = extractHeroNameFromRow(row);
    const rawIcon = extractIconUrlFromRow(row);
    if (!rawName || !rawIcon) continue;

    totalFound++;

    const nName = normalizeName(rawName);

    // 1) матч по имени
    let id = nameToId.get(nName);

    // 2) если не нашли, попробуем матч по “id-похожему” (иногда в таблице может быть что-то вроде x borg)
    if (!id) {
      id = idToId.get(nName);
    }

    if (!id) {
      if (notMatchedSamples.length < 8) {
        notMatchedSamples.push({ name: rawName, n: nName, icon: ensureSized(rawIcon, ICON_SIZE) });
      }
      continue;
    }

    icons[id] = ensureSized(rawIcon, ICON_SIZE);
    matched++;
  }

  // Пишем icons.json
  await fs.writeFile(OUT_PATH, JSON.stringify(icons, null, 2), "utf-8");

  // Покажем missing ids (у кого нет иконки после импорта)
  const missing = heroes.map(h => h.id).filter(id => !icons[id]);

  console.log("Done!");
  console.log("Rows with (name+icon) found:", totalFound);
  console.log("Matched to your heroes.json:", matched);
  console.log("Saved:", OUT_PATH);
  console.log("Missing icon for hero ids:", missing);

  if (notMatchedSamples.length) {
    console.log("Not matched samples (name -> icon):");
    for (const s of notMatchedSamples) {
      console.log("-", s.name, "| norm:", s.n, "|", s.icon);
    }
  }
}

// НЕ делаем process.exit(), чтобы не ловить UV_HANDLE_CLOSING на Windows
main().catch((e) => {
  console.error("ERROR:", e);
  process.exitCode = 1;
});