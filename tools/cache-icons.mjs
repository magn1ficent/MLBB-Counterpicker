// tools/cache-icons.mjs
// Скачивает иконки из data/icons.json в assets/icons/
// и создаёт data/icons.local.json с локальными путями.
// Запуск: node tools/cache-icons.mjs

import fs from "node:fs/promises";
import path from "node:path";

const ICONS_REMOTE = path.resolve("data/icons.json");
const OUT_DIR = path.resolve("assets/icons");
const ICONS_LOCAL = path.resolve("data/icons.local.json");

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function download(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "mlbb-draft-counter/1.0 icon cacher",
      "accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "referer": "https://mobile-legends.fandom.com/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function main() {
  if (!(await exists(ICONS_REMOTE))) {
    throw new Error("data/icons.json not found. Run build-icons.mjs first.");
  }

  const remote = JSON.parse(await fs.readFile(ICONS_REMOTE, "utf-8"));

  await fs.mkdir(OUT_DIR, { recursive: true });

  const localMap = {};
  const ids = Object.keys(remote);
  let ok = 0, fail = 0;

  for (const id of ids) {
    const url = remote[id];
    const outPath = path.join(OUT_DIR, `${id}.png`);
    const publicPath = `./assets/icons/${id}.png`;

    try {
      const buf = await download(url);
      await fs.writeFile(outPath, buf);
      localMap[id] = publicPath;
      ok++;
      process.stdout.write(`✔ ${id}\n`);
    } catch (e) {
      fail++;
      process.stdout.write(`✖ ${id} (${e.message})\n`);
      // если не скачалось — оставим удалённый URL как запасной вариант
      localMap[id] = url;
    }
  }

  await fs.writeFile(ICONS_LOCAL, JSON.stringify(localMap, null, 2), "utf-8");

  console.log("\nDone!");
  console.log("Saved local icons to:", OUT_DIR);
  console.log("Saved mapping to:", ICONS_LOCAL);
  console.log("ok:", ok, "fail:", fail);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exitCode = 1;
});