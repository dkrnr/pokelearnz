// Site behavior checks use the catalog's installed browser tooling, never real AI/voice providers.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const modulePath = process.env.POKELEARN_QA_MODULE || "playwright";
const { chromium } = await import(modulePath);
const base = process.env.POKELEARN_TEST_URL || "http://127.0.0.1:4178";
const out = new URL("../qa/artifacts/behavior/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const results = [];
async function check(label, fn) {
  if (
    process.env.POKELEARN_TEST_FILTER &&
    !label.includes(process.env.POKELEARN_TEST_FILTER)
  )
    return;
  try {
    await fn();
    results.push({ label, pass: true });
    console.log("PASS", label);
  } catch (error) {
    results.push({ label, pass: false, error: error.message });
    console.log("FAIL", label, error.message);
  }
}
const snapshot = (page) => page.evaluate(() => window.__STUDIO_QA__.snapshot());
const phase = async (page, expected) =>
  assert.equal((await snapshot(page)).state, expected);
async function fresh(options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.route("**/.netlify/functions/**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"QA fixture: unavailable"}',
    }),
  );
  await page.goto(base, { waitUntil: "networkidle" });
  return { context, page };
}
for (const [label, width, height] of [
  ["phone", 390, 844],
  ["tablet-portrait", 768, 1024],
  ["tablet-landscape", 1024, 768],
  ["desktop", 1366, 768],
]) {
  await check(
    `${label}: experiment, reverse, retry, completion and pause`,
    async () => {
      const { context, page } = await fresh({
        viewport: { width, height },
        hasTouch: label !== "desktop",
      });
      await page.locator("#discover-plants").click();
      await page.locator("#tool-light").click();
      assert.equal((await snapshot(page)).light, true);
      await page.locator("#tool-light").click();
      assert.equal((await snapshot(page)).light, false);
      await page.locator("#tool-light").click();
      await page.locator("#tool-water").click();
      assert.equal((await snapshot(page)).progress, 1);
      if (width <= 900) {
        const specimen = await page.locator("#specimen").boundingBox();
        const controls = await page.locator(".experiment-tools").boundingBox();
        assert.ok(
          Math.abs(specimen.y - controls.y) < 60,
          "Diagram must stay beside its controls",
        );
      }
      await page.screenshot({
        path: new URL(`${label}-both.png`, out).pathname,
        fullPage: true,
      });
      await page.locator("#checkActivity").click();
      assert.equal(
        await page.evaluate(() => document.activeElement.tagName),
        "H2",
      );
      await page.locator("#answer-onlyWater").click();
      assert.match(
        await page.locator("#checkFeedback").textContent(),
        /Water helps/,
      );
      await page.locator("#answer-neither").click();
      assert.match(
        await page.locator("#checkFeedback").textContent(),
        /need helpers/,
      );
      await page.locator("#answer-both").click();
      await phase(page, "recap");
      await page.locator("#backActivity").click();
      await phase(page, "experiment");
      await page.locator("#checkActivity").click();
      await page.locator("#answer-both").click();
      await page.locator("#completeActivity").click();
      await phase(page, "finished");
      assert.equal((await snapshot(page)).completed, true);
      assert.equal(await page.locator("#questionInput").isDisabled(), true);
      await page.locator("#resumeActivity").click();
      await phase(page, "recap");
      assert.equal(await page.evaluate(() => localStorage.length), 0);
      await context.close();
    },
  );
}
await check(
  "Finish works from every lesson stage and resumes without losing state",
  async () => {
    const { context, page } = await fresh();
    for (const stage of ["welcome", "experiment", "check", "recap"]) {
      await page.goto(base);
      if (stage !== "welcome") await page.locator("#discover-plants").click();
      if (["check", "recap"].includes(stage))
        await page.locator("#checkActivity").click();
      if (stage === "recap") await page.locator("#answer-both").click();
      await phase(page, stage);
      await page.locator("#finish").click();
      await phase(page, "finished");
      await page.locator("#resumeActivity").click();
      await phase(page, stage);
    }
    await context.close();
  },
);
await check(
  "Question entry, optional practice, nearby pause and keyboard bypass",
  async () => {
    const { context, page } = await fresh({
      viewport: { width: 390, height: 844 },
    });
    const input = await page.locator("#questionInput").boundingBox();
    assert.ok(
      input.y + input.height < 844,
      "Question entry must fit in first phone viewport",
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(() => document.activeElement.className),
      "skip-link",
    );
    assert.equal(
      await page
        .locator(".skip-link")
        .evaluate((el) => getComputedStyle(el).clipPath),
      "none",
    );
    await page.locator("#discover-plants").click();
    await page.locator("#tool-light").click();
    await page.locator("#skipCheck").click();
    await phase(page, "recap");
    assert.equal(
      await page
        .locator("#specimen")
        .evaluate((el) => Boolean(el.closest("#activityContent"))),
      true,
    );
    await page.locator("#pauseActivity").click();
    await phase(page, "finished");
    assert.match(
      await page.locator("#resumeActivity").getAttribute("class"),
      /quiet-button/,
    );
    await context.close();
  },
);
await check(
  "Buddy picker is bounded, searchable, keyboard dismissible and preserves appearance choice",
  async () => {
    const { context, page } = await fresh({
      viewport: { width: 390, height: 844 },
    });
    await page.locator("#buddyOpen").click();
    assert.equal(await page.locator(".pokemon-cell").count(), 6);
    await page.locator("#pokemonSearch").fill("not-a-pokemon");
    assert.equal(await page.locator(".pokemon-cell").count(), 0);
    await page.locator("#pokemonSearch").fill("bulbasaur");
    assert.equal(await page.locator(".pokemon-cell").count(), 1);
    await page.locator(".pokemon-cell").click();
    assert.equal(await page.locator("#heroName").textContent(), "Bulbasaur");
    assert.equal(await page.locator("#buddyDialog").isVisible(), false);
    await page.locator("#buddyOpen").click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#buddyDialog").isVisible(), false);
    assert.equal(
      await page.evaluate(() => document.querySelector(".app-shell").inert),
      false,
    );
    await page.locator("#buddyOpen").click();
    await page.locator("#pokemonSearch").fill("25");
    await page.locator("#shinyToggle").check();
    await page.locator(".pokemon-cell").click();
    assert.match(
      await page.locator("#heroSprite").getAttribute("src"),
      /25-shiny/,
    );
    await context.close();
  },
);
await check(
  "Asset failure while modal is open remains safe after closing",
  async () => {
    const { context, page } = await fresh();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const image = await page.locator("#heroSprite").elementHandle();
    await page.locator("#grownupOpen").click();
    await image.evaluate((el) => el.dispatchEvent(new Event("error")));
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => !document.querySelector(".app-shell").inert,
    );
    assert.equal(await page.locator("#buddyFallback").isVisible(), true);
    assert.equal(errors.length, 0);
    await context.close();
  },
);
await check(
  "Default/rejected storage, optional save, reload, withdrawal and legacy clearing",
  async () => {
    const { context, page } = await fresh();
    await page.evaluate(() =>
      localStorage.setItem(
        "pokelearn_history",
        '[{"question":"legacy-private-question"}]',
      ),
    );
    await page.reload();
    await page.locator("#grownupOpen").click();
    await page.locator("#saveReject").click();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("pokelearn_camp_v1")),
      null,
    );
    await page.locator("#saveAccept").click();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("pokelearn_camp_v1")),
    );
    assert.equal(saved.consent, true);
    assert.deepEqual(Object.keys(saved).sort(), [
      "buddy",
      "completed",
      "consent",
      "shiny",
      "version",
    ]);
    await page.reload();
    assert.equal((await snapshot(page)).saving, true);
    assert.equal(
      (await page.locator("body").textContent()).includes(
        "legacy-private-question",
      ),
      false,
    );
    await page.locator("#grownupOpen").click();
    await page.locator("#clearData").click();
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await context.close();
  },
);
await check("Blocked storage still permits learning", async () => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.removeItem = () => {
      throw new Error("blocked");
    };
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.locator("#grownupOpen").click();
  await page.locator("#saveAccept").click();
  assert.equal((await snapshot(page)).saving, false);
  assert.match(
    await page.locator("#storageStatus").textContent(),
    /cannot save/,
  );
  await page.keyboard.press("Escape");
  await page.locator("#discover-plants").click();
  await phase(page, "experiment");
  await context.close();
});
await check(
  "Provider success and failure are honest; healthy prompt is sent; no persistent questions",
  async () => {
    const { context, page } = await fresh();
    let captured;
    await page.unroute("**/.netlify/functions/**");
    await page.route("**/.netlify/functions/chat", async (route) => {
      captured = route.request().postDataJSON();
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          choices: [
            { message: { content: "QA fixture: leaves collect light." } },
          ],
        }),
      });
    });
    await page.locator("#questionInput").fill("Why do plants need light?");
    await page.locator("#askButton").click();
    await page.locator("#answer").waitFor({ state: "visible" });
    assert.match(captured.messages[0].content, /Never pressure/);
    assert.match(await page.locator("#answerText").textContent(), /QA fixture/);
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    assert.equal((await snapshot(page)).buddyState, "explaining");
    await page.unroute("**/.netlify/functions/chat");
    await page.route("**/.netlify/functions/chat", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: "{}",
      }),
    );
    await page.locator("#questionInput").fill("How do roots work?");
    await page.locator("#askButton").click();
    await page.waitForFunction(() =>
      document
        .getElementById("questionStatus")
        .textContent.includes("taking a break"),
    );
    assert.equal(await page.locator("#answer").isVisible(), false);
    assert.equal((await snapshot(page)).buddyState, "unavailable");
    await context.close();
  },
);
await check(
  "Late responses cannot undo Stop, Done or a changed buddy",
  async () => {
    const { context, page } = await fresh();
    await page.unroute("**/.netlify/functions/**");
    let pending = [];
    await page.route(
      "**/.netlify/functions/chat",
      (route) => new Promise((resolve) => pending.push({ route, resolve })),
    );
    for (const action of ["stop", "finish", "buddy"]) {
      await page.locator("#questionInput").fill("What makes rain?");
      await page.locator("#askButton").click();
      await page.waitForFunction(
        () => window.__STUDIO_QA__.snapshot().requestActive,
      );
      if (action === "stop") await page.locator("#cancelQuestion").click();
      if (action === "finish") await page.locator("#finish").click();
      if (action === "buddy") {
        await page.locator("#buddyOpen").click();
        await page
          .getByRole("button", { name: "Bulbasaur", exact: true })
          .click();
      }
      for (const p of pending) {
        await p.route
          .fulfill({
            contentType: "application/json",
            body: '{"choices":[{"message":{"content":"LATE RESPONSE"}}]}',
          })
          .catch(() => {});
        p.resolve();
      }
      pending = [];
      await page.waitForTimeout(100);
      assert.equal(await page.locator("#answer").isVisible(), false);
      assert.equal((await snapshot(page)).requestActive, false);
      if (action === "finish") {
        await phase(page, "finished");
        await page.locator("#resumeActivity").click();
      }
    }
    await context.close();
  },
);
await check(
  "Offline reload, local activity and cache allowlist exclude APIs/transcripts",
  async () => {
    const { context, page } = await fresh();
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise((resolve) =>
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            resolve,
            { once: true },
          ),
        );
    });
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#discover-plants").click();
    await page.locator("#tool-light").click();
    await page.locator("#tool-water").click();
    assert.equal((await snapshot(page)).progress, 1);
    await page.locator("#questionInput").fill("Why rain?");
    await page.locator("#askButton").click();
    assert.match(
      await page.locator("#questionStatus").textContent(),
      /need internet/,
    );
    const cache = await page.evaluate(async () => {
      const keys = await caches.keys();
      return Promise.all(
        keys.map(async (key) => ({
          key,
          urls: (await (await caches.open(key)).keys()).map((x) => x.url),
        })),
      );
    });
    for (const entry of cache) {
      assert.ok(entry.urls.length <= 22);
      assert.equal(
        entry.urls.some(
          (x) =>
            x.includes(".netlify") ||
            x.includes("question") ||
            x.includes("recording"),
        ),
        false,
      );
    }
    await context.close();
  },
);
await check(
  "Reduced motion keeps requested scene states and image failure names the companion",
  async () => {
    const { context, page } = await fresh({
      reducedMotion: "reduce",
      viewport: { width: 390, height: 844 },
    });
    await page.locator("#discover-plants").click();
    await page.locator("#tool-light").click();
    await page.locator("#tool-water").click();
    assert.equal((await snapshot(page)).progress, 1);
    assert.equal((await snapshot(page)).reducedMotion, true);
    assert.equal(
      await page
        .locator(".new-leaf")
        .evaluate((el) => getComputedStyle(el).opacity),
      "1",
    );
    assert.equal(
      await page
        .locator(".new-leaf")
        .evaluate((el) => getComputedStyle(el).transitionDuration),
      "0s",
    );
    await page.evaluate(() =>
      document.getElementById("heroSprite").dispatchEvent(new Event("error")),
    );
    assert.equal(await page.locator("#buddyFallback").isVisible(), true);
    assert.equal(await page.locator("#buddyFallback").textContent(), "Pikachu");
    await context.close();
  },
);
await check(
  "Sinhala dynamic activity, Tamil voice choice and no-JS learning copy",
  async () => {
    const { context, page } = await fresh();
    await page.locator("#language").selectOption("si");
    assert.equal(await page.locator("html").getAttribute("lang"), "si");
    await page.locator("#discover-plants").click();
    assert.match(await page.locator("#activityContent").textContent(), /පැළ/);
    await page.locator("#language").selectOption("ta");
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert.match(await page.locator("#questionStatus").textContent(), /Tamil/);
    await context.close();
    const nojs = await browser.newContext({ javaScriptEnabled: false });
    const np = await nojs.newPage();
    await np.goto(base);
    assert.equal(await np.locator(".noscript-note").isVisible(), true);
    assert.match(
      await np.locator(".noscript-note").textContent(),
      /Roots|roots/,
    );
    await nojs.close();
  },
);
await browser.close();
await fs.writeFile(
  new URL("results.json", out),
  JSON.stringify(
    {
      providerEvidence: "Stubbed QA fixtures; no live voice/AI calls",
      results,
    },
    null,
    2,
  ),
);
if (results.some((x) => !x.pass)) process.exitCode = 1;
