import { createHash } from "node:crypto";
import { cp, mkdir, rm, readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url),
  out = new URL("../dist/", import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of [
  "index.html",
  "style.css",
  "app.js",
  "activities.js",
  "art.js",
  "buddy.js",
  "locales.js",
  "safety.js",
  "sw.js",
  "manifest.webmanifest",
  "assets",
])
  await cp(new URL(name, root), new URL(name, out), { recursive: true });
await cp(new URL("../_headers", import.meta.url), new URL("_headers", out));
const { buddyAssets } = await import(new URL("../buddy.js", import.meta.url));
const hash = createHash("sha256");
async function digest(dir) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const next = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    if (entry.isDirectory()) await digest(next);
    else if (entry.name !== "sw.js")
      hash.update(entry.name).update(await readFile(next));
  }
}
await digest(out);
const stamp = hash.digest("hex").slice(0, 16);
const worker = new URL("sw.js", out);
await writeFile(
  worker,
  (await readFile(worker, "utf8")).replace("__BUILD__", stamp).replace("__BUDDY_ASSETS__", JSON.stringify(buddyAssets)),
);
console.log(`Built public files at ${fileURLToPath(out)}`);
