import fs from "node:fs/promises";
import http from "node:http";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const { chromium } = await import(
  process.env.POKELEARN_QA_MODULE || "playwright"
);
const root = fileURLToPath(new URL("../dist/", import.meta.url));
const browser = await chromium.launch();
let updated = false;
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname.includes("..")) throw Error();
    const file = pathname === "/" ? "index.html" : pathname.slice(1);
    let body = await fs.readFile(root + file);
    if (file === "sw.js" && updated)
      body = Buffer.from(
        body
          .toString()
          .replace("pokelearn-shell-", "pokelearn-shell-update-fixture-"),
      );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Type",
      file.endsWith(".js")
        ? "application/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : file.endsWith(".png")
            ? "image/png"
            : file.endsWith(".svg")
              ? "image/svg+xml"
              : file.endsWith(".ttf")
                ? "font/ttf"
                : file.endsWith(".webmanifest")
                  ? "application/json"
                  : "text/html",
    );
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(4181, "127.0.0.1", r));
try {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  await page.goto("http://127.0.0.1:4181");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((r) =>
        navigator.serviceWorker.addEventListener("controllerchange", r, {
          once: true,
        }),
      );
  });
  const before = await page.evaluate(() => caches.keys());
  await page.locator("#discover-plants").click();
  await page.locator("#tool-light").click();
  updated = true;
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg.update();
  });
  await page.locator("#updateBanner").waitFor({ state: "visible" });
  await page.locator("#updateButton").click();
  assert.equal(
    (await page.evaluate(() => window.__STUDIO_QA__.snapshot())).state,
    "activity",
  );
  assert.ok(
    await page.evaluate(
      async () => !!(await navigator.serviceWorker.getRegistration()).waiting,
    ),
  );
  await page.locator("#finish").click();
  await Promise.all([
    page.waitForEvent("load"),
    page.locator("#updateButton").click(),
  ]);
  await page.waitForFunction(
    async () => !(await navigator.serviceWorker.getRegistration()).waiting,
  );
  const after = await page.evaluate(() => caches.keys());
  assert.equal(after.length, 1);
  assert.ok(after[0].includes("update-fixture"));
  assert.ok(!after.includes(before[0]));
  console.log(
    "PASS PWA update waits for activity exit and deletes the old cache",
  );
  await page.locator("#playNav").click();
  const idle = await page
    .locator("#buddyCharacter")
    .evaluate((e) => e.getAnimations().map((a) => a.animationName));
  assert.ok(idle.includes("idle"));
  await page.locator("#discover-plants").click();
  for (const id of ["light", "water", "air"]) {
    await page.locator(`#tool-${id}`).click();
    await page.locator("#nextStep").click();
  }
  assert.equal(
    (await page.evaluate(() => window.__STUDIO_QA__.snapshot())).buddyState,
    "celebrating",
  );
  assert.ok(
    await page
      .locator("#buddyCharacter")
      .evaluate((e) =>
        e.getAnimations().some((a) => a.animationName === "hop"),
      ),
  );
  await page.locator("#completeActivity").click();
  assert.ok(
    await page
      .locator(".pip-arm.right")
      .evaluate((e) =>
        e.getAnimations().some((a) => a.animationName === "wave"),
      ),
  );
  console.log(
    "PASS visible idle, finite celebration and goodbye wave animations",
  );
  await page.locator("#playNav").click();
  await page.locator("#discover-plants").click();
  for (const id of ["light", "water", "air"]) {
    await page.locator(`#tool-${id}`).click();
    await page.locator("#nextStep").click();
  }
  assert.equal(
    (await page.evaluate(() => window.__STUDIO_QA__.snapshot())).buddyState,
    "idle",
  );
  console.log("PASS completion celebration occurs once per activity per visit");
  await context.close();
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
