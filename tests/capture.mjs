import fs from "node:fs/promises";
const { chromium } = await import(
  process.env.POKELEARN_QA_MODULE || "playwright"
);
const base = process.env.POKELEARN_TEST_URL || "http://127.0.0.1:4178";
const round = process.env.REVIEW_ROUND || "round-1";
const out = new URL(`../docs/redesign/screens/${round}/`, import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const [name, width, height] of [
  ["phone", 390, 844],
  ["tablet-portrait", 820, 1180],
  ["tablet-landscape", 1180, 820],
]) {
  const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: true,
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !(
        m.text().startsWith("Failed to load resource:") &&
        m.location().url.includes("/.netlify/functions/")
      )
    )
      errors.push(m.text());
  });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.screenshot({
    path: new URL(`${name}-shelf.png`, out).pathname,
    fullPage: true,
  });
  await page.locator("#discover-plants").click();
  await page.screenshot({
    path: new URL(`${name}-plant.png`, out).pathname,
    fullPage: true,
  });
  for (const tool of ["light", "water", "air"]) {
    await page.locator(`#tool-${tool}`).click();
    await page.locator("#nextStep").click();
  }
  await page.screenshot({
    path: new URL(`${name}-completion.png`, out).pathname,
    fullPage: true,
  });
  await page.locator("#completeActivity").click();
  await page.screenshot({
    path: new URL(`${name}-goodbye.png`, out).pathname,
    fullPage: true,
  });
  await page.locator("#grownupOpen").click();
  await page.screenshot({
    path: new URL(`${name}-grownups.png`, out).pathname,
    fullPage: true,
  });
  await page.locator("#onlineConsent").check();
  await page.keyboard.press("Escape");
  await page.route("**/.netlify/functions/chat", (r) =>
    r.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.locator("#askNav").click();
  await page.locator("#questionInput").fill("Why do leaves need light?");
  await page.locator("#askButton").click();
  await page.locator("#retryQuestion").waitFor({ state: "visible" });
  await page.screenshot({
    path: new URL(`${name}-failure.png`, out).pathname,
    fullPage: true,
  });
  await page.locator("#playNav").click();
  await page.locator("#discover-homes").click();
  await page.screenshot({
    path: new URL(`${name}-sort.png`, out).pathname,
    fullPage: true,
  });
  await page.locator("#playNav").click();
  await page.locator("#discover-story").click();
  await page.screenshot({
    path: new URL(`${name}-story.png`, out).pathname,
    fullPage: true,
  });
  for (const id of ["numbers", "shapes", "sounds"]) {
    await page.locator("#playNav").click();
    await page.locator(`#discover-${id}`).click();
    await page.screenshot({
      path: new URL(`${name}-${id}.png`, out).pathname,
      fullPage: true,
    });
  }
  console.log(
    name,
    JSON.stringify({
      errors,
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    }),
  );
  await context.close();
}
await browser.close();
