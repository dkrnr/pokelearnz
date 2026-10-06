import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = await import(
  process.env.POKELEARN_QA_MODULE || "playwright"
);
const axePath =
  process.env.POKELEARN_AXE_PATH || require.resolve("axe-core/axe.min.js");
const { activities } = await import("../activities.js");
const base = process.env.POKELEARN_TEST_URL || "http://127.0.0.1:4178";
const browser = await chromium.launch(),
  results = [];
const forbidden =
  /\bstreaks?\b|daily goals?|star counters?|point counters?|collect them all|come back tomorrow|don't leave|miss(?:ed|ing) out|you lost|hurry|countdown|ask me another|what else would|keep chatting|turn on notifications|feel lonely|abandon/i;
const snapshot = (p) => p.evaluate(() => window.__STUDIO_QA__.snapshot());
async function check(label, fn) {
  try {
    await fn();
    results.push({ label, pass: true });
    console.log("PASS", label);
  } catch (e) {
    results.push({ label, pass: false, error: e.stack });
    console.log("FAIL", label, e.message);
  }
}
async function fresh(options = {}, url = base) {
  const context = await browser.newContext(options),
    page = await context.newPage();
  const errors = [];
  const external = [];
  page.on("request", (r) => {
    if (new URL(r.url()).origin !== new URL(base).origin)
      external.push(r.url());
  });
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
  await page.route("**/.netlify/functions/**", (r) =>
    r.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.goto(url, { waitUntil: "networkidle" });
  return { context, page, errors, external };
}
async function allow(page) {
  await page.locator("#grownupOpen").click();
  await page.locator("#onlineConsent").check();
  await page.keyboard.press("Escape");
}
async function audit(page, label) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    `${label}: overflow`,
  );
  const tiny = await page.locator("button:visible").evaluateAll((nodes) =>
    nodes
      .filter((n) => {
        const r = n.getBoundingClientRect();
        return r.width < 56 || r.height < 56;
      })
      .map((n) => [
        n.textContent,
        n.getBoundingClientRect().width,
        n.getBoundingClientRect().height,
      ]),
  );
  assert.deepEqual(tiny, [], `${label}: small targets`);
  const noIcons = await page
    .locator("button:visible")
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => !n.querySelector("[aria-hidden=true],svg"))
        .map((n) => n.textContent),
    );
  assert.deepEqual(noIcons, []);
  const noWords = await page
    .locator("button:visible")
    .evaluateAll((nodes) =>
      nodes.filter((n) => !n.textContent.trim()).map((n) => n.id),
    );
  assert.deepEqual(noWords, []);
  const kidText = await page.locator(".app-shell").innerText();
  assert.doesNotMatch(kidText, forbidden);
  assert.equal(
    await page.locator("audio[autoplay],video[autoplay]").count(),
    0,
  );
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () =>
    (
      await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      })
    ).violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
  );
  assert.deepEqual(violations, [], `${label}: axe violations`);
}
async function solve(page, a) {
  if (a.type === "build-plant")
    for (const step of a.steps) {
      await page.locator(`#tool-${step.target}`).click();
      await page.locator("#nextStep").click();
    }
  if (a.type === "build-number")
    for (const step of a.steps) {
      for (let i = 0; i < step.target; i++)
        await page.locator("#addBlock").click();
      await page.locator("#checkGroup").click();
      await page.locator("#nextStep").click();
    }
  if (a.type === "sort") {
    for (let i = 0; i < a.items.length; i++) {
      await page.locator(`#animal-${i}`).click();
      await page.locator(`#bin-${a.items[i].target}`).click();
    }
    await page.locator("#nextStep").click();
  }
  if (a.type === "match")
    for (const item of a.items) {
      await page.locator(`#choice-${item.target}`).click();
      await page.locator("#nextStep").click();
    }
  if (a.type === "order")
    for (const step of a.steps) {
      for (let i = 0; i < step.items.length; i++)
        await page.locator(`#story-${i}`).click();
      await page.locator("#nextStep").click();
    }
  assert.equal((await snapshot(page)).state, "recap");
}
for (const [name, width, height] of [
  ["phone", 390, 844],
  ["tablet portrait", 820, 1180],
  ["tablet landscape", 1180, 820],
])
  await check(
    `${name}: six lessons, accessibility, calm completion and real-world exit`,
    async () => {
      const { context, page, errors, external } = await fresh({
        viewport: { width, height },
        hasTouch: true,
      });
      await audit(page, "shelf");
      assert.equal(await page.evaluate(() => localStorage.length), 0);
      assert.equal((await snapshot(page)).sound, false);
      for (const a of activities) {
        await page.locator(`#discover-${a.id}`).click();
        await audit(page, a.id);
        await solve(page, a);
        await audit(page, `${a.id} recap`);
        await page.locator("#completeActivity").click();
        assert.equal((await snapshot(page)).buddyState, "goodbye");
        await audit(page, "goodbye");
        await page.locator("#playNav").click();
      }
      await page.locator("#grownupOpen").click();
      await audit(page, "parent dialog");
      assert.match(
        await page.locator("#grownupDialog").textContent(),
        /OpenRouter/,
      );
      assert.match(
        await page.locator("#grownupDialog").textContent(),
        /Valsea/,
      );
      await page.keyboard.press("Escape");
      await page.locator("#askNav").click();
      await audit(page, "ask");
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      await context.close();
    },
  );
await check(
  "friendly mistakes, reset, number reversal, and keyboard focus remain usable",
  async () => {
    const { context, page } = await fresh();
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(() => document.activeElement.className),
      "skip-link",
    );
    await page.locator("#discover-plants").click();
    await page.locator("#tool-water").click();
    assert.equal((await snapshot(page)).solved, false);
    await page.locator("#tool-light").click();
    await page.locator("#nextStep").click();
    assert.deepEqual((await snapshot(page)).helpers, ["light"]);
    await page.locator("#tool-water").click();
    await page.locator("#resetStep").click();
    assert.deepEqual((await snapshot(page)).helpers, ["light"]);
    await page.locator("#playNav").click();
    await page.locator("#discover-numbers").click();
    await page.locator("#addBlock").click();
    await page.locator("#removeBlock").click();
    assert.equal((await snapshot(page)).count, 0);
    await page.locator("#checkGroup").click();
    assert.equal((await snapshot(page)).solved, false);
    await page.locator("#finish").click();
    assert.equal((await snapshot(page)).state, "goodbye");
    await context.close();
  },
);
await check(
  "optional storage, consent migration, withdrawal and blocked storage",
  async () => {
    const { context, page } = await fresh();
    await page.evaluate(() =>
      localStorage.setItem("pokelearn_history", "private-old-question"),
    );
    await page.reload();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("pokelearn_history")),
      null,
    );
    await page.locator("#grownupOpen").click();
    await page.locator("#saveReject").click();
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await page.locator("#saveAccept").click();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("pokelearn_camp_v1")),
    );
    assert.deepEqual(Object.keys(saved).sort(), [
      "buddy",
      "completed",
      "consent",
      "shiny",
      "version",
    ]);
    await page.reload();
    assert.equal((await snapshot(page)).saving, true);
    await page.locator("#grownupOpen").click();
    await page.locator("#clearData").click();
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await context.close();
    const c = await browser.newContext();
    await c.addInitScript(() => {
      for (const key of ["getItem", "setItem", "removeItem"])
        Storage.prototype[key] = () => {
          throw Error("blocked");
        };
    });
    const p = await c.newPage();
    await p.goto(base);
    await p.locator("#grownupOpen").click();
    await p.locator("#saveAccept").click();
    assert.equal((await snapshot(p)).saving, false);
    assert.match(
      await p.locator("#storageStatus").textContent(),
      /cannot save/,
    );
    await p.keyboard.press("Escape");
    await p.locator("#discover-plants").click();
    assert.equal((await snapshot(p)).state, "activity");
    await c.close();
  },
);
await check(
  "local speech only, gesture-only sound, unavailable voice and retry",
  async () => {
    const { context, page } = await fresh();
    await page.evaluate(() => {
      window.SpeechSynthesisUtterance = class {
        constructor(text) {
          this.text = text;
        }
      };
      window.speechCalls = [];
      speechSynthesis.getVoices = () => [
        { lang: "en-US", localService: false },
      ];
      speechSynthesis.speak = (u) => speechCalls.push(u.text);
    });
    await page.locator("#heroListen").click();
    assert.equal(await page.locator("#speechNotice").isVisible(), true);
    assert.equal(await page.evaluate(() => speechCalls.length), 0);
    await page.evaluate(() => {
      speechSynthesis.getVoices = () => [{ lang: "en-US", localService: true }];
      speechSynthesis.speak = (u) => {
        speechCalls.push(u.text);
        u.onstart?.();
      };
    });
    await page.locator("#speechRetry").click();
    assert.equal(await page.locator("#speechNotice").isVisible(), false);
    assert.equal((await snapshot(page)).buddyState, "listening");
    assert.equal(await page.evaluate(() => speechCalls.length), 1);
    await page.locator("#soundButton").click();
    assert.equal((await snapshot(page)).sound, true);
    await page.locator("#soundButton").click();
    assert.equal((await snapshot(page)).sound, false);
    await page.reload();
    assert.equal((await snapshot(page)).sound, false);
    await context.close();
  },
);
await check(
  "bounded provider answer, no history or continuation, and honest retry",
  async () => {
    const { context, page } = await fresh();
    await page.locator("#askNav").click();
    await page.locator("#questionInput").fill("Why leaves?");
    await page.locator("#askButton").click();
    assert.match(
      await page.locator("#questionStatus").textContent(),
      /grown-up/,
    );
    await allow(page);
    let captured;
    await page.unroute("**/.netlify/functions/**");
    await page.route("**/.netlify/functions/chat", (r) => {
      captured = r.request().postDataJSON();
      return r.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          choices: [{ message: { content: "Leaves use light to make food." } }],
        }),
      });
    });
    await page.locator("#questionInput").fill("Why leaves?");
    await page.locator("#askButton").click();
    await page.locator("#answer").waitFor({ state: "visible" });
    assert.equal(captured.messages.length, 2);
    assert.match(captured.messages[0].content, /Never pressure/);
    assert.equal(await page.locator("#questionForm").isVisible(), false);
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await audit(page, "answer");
    await page.locator("#playNav").click();
    await page.locator("#askNav").click();
    await page.unroute("**/.netlify/functions/chat");
    await page.route("**/.netlify/functions/chat", (r) =>
      r.fulfill({ status: 429, contentType: "application/json", body: "{}" }),
    );
    await page.locator("#questionInput").fill("Why rain?");
    await page.locator("#askButton").click();
    await page.locator("#retryQuestion").waitFor({ state: "visible" });
    assert.equal((await snapshot(page)).buddyState, "unavailable");
    await audit(page, "AI failure");
    await context.close();
  },
);
await check("mock-answer development mode uses no backend", async () => {
  const { context, page } = await fresh({}, base + "/?mock=1");
  let apiCalls = 0;
  page.on("request", (r) => {
    if (r.url().includes("/.netlify/")) apiCalls++;
  });
  await page.locator("#askNav").click();
  await page.locator("#questionInput").fill("Why leaves?");
  await page.locator("#askButton").click();
  await page.locator("#answer").waitFor({ state: "visible" });
  assert.match(await page.locator(".dev-note").textContent(), /fixture/);
  assert.equal(apiCalls, 0);
  await context.close();
});
await check(
  "late answers cannot undo Stop, Done, parent opening or buddy changes",
  async () => {
    const { context, page } = await fresh();
    await allow(page);
    await page.unroute("**/.netlify/functions/**");
    const pending = [];
    await page.route(
      "**/.netlify/functions/chat",
      (r) => new Promise((resolve) => pending.push({ r, resolve })),
    );
    for (const action of ["stop", "done", "parent", "buddy"]) {
      await page.locator("#askNav").click();
      await page.locator("#questionInput").fill("Why rain?");
      await page.locator("#askButton").click();
      await page.waitForFunction(
        () => window.__STUDIO_QA__.snapshot().requestActive,
      );
      if (action === "stop") await page.locator("#cancelQuestion").click();
      if (action === "done") await page.locator("#finish").click();
      if (["parent", "buddy"].includes(action)) {
        await page.locator("#grownupOpen").click();
        if (action === "buddy") await page.locator('[data-buddy="1"]').click();
        await page.keyboard.press("Escape");
      }
      for (const { r, resolve } of pending.splice(0)) {
        await r
          .fulfill({
            contentType: "application/json",
            body: '{"choices":[{"message":{"content":"LATE RESPONSE."}}]}',
          })
          .catch(() => {});
        resolve();
      }
      await page.waitForTimeout(50);
      if (await page.locator("#answer").count())
        assert.equal(await page.locator("#answer").isVisible(), false);
      assert.equal((await snapshot(page)).requestActive, false);
    }
    await context.close();
  },
);
await check(
  "voice permission, transcript review, provider failure and late permission cancellation",
  async () => {
    const { context, page, errors } = await fresh();
    await allow(page);
    await page.locator("#askNav").click();
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw Error("denied");
      };
    });
    await page.locator("#micBtn").click();
    await page.locator("#retryQuestion").waitFor({ state: "visible" });
    assert.match(
      await page.locator("#questionStatus").textContent(),
      /didn't open/,
    );
    await page.evaluate(() => {
      window.tracksStopped = 0;
      navigator.mediaDevices.getUserMedia = async () => ({
        getTracks: () => [{ stop: () => tracksStopped++ }],
      });
      window.MediaRecorder = class {
        static isTypeSupported() {
          return true;
        }
        constructor() {
          this.state = "inactive";
          this.mimeType = "audio/webm";
        }
        start() {
          this.state = "recording";
        }
        stop() {
          this.state = "inactive";
          this.ondataavailable?.({ data: new Blob(["voice fixture"]) });
          this.onstop?.();
        }
      };
    });
    await page.unroute("**/.netlify/functions/**");
    let chatCalls = 0;
    await page.route("**/.netlify/functions/transcribe", (r) =>
      r.fulfill({
        contentType: "application/json",
        body: '{"text":"Why leaves?"}',
      }),
    );
    await page.route("**/.netlify/functions/chat", (r) => {
      chatCalls++;
      return r.fulfill({
        contentType: "application/json",
        body: '{"choices":[{"message":{"content":"Leaves use light to make food."}}]}',
      });
    });
    await page.locator("#micBtn").click();
    assert.equal((await snapshot(page)).buddyState, "listening");
    await page.locator("#micBtn").click();
    await page.waitForFunction(
      () => document.querySelector("#questionInput").value === "Why leaves?",
    );
    assert.equal(chatCalls, 0);
    assert.equal(await page.evaluate(() => tracksStopped), 1);
    assert.equal((await snapshot(page)).recording, false);
    await page.locator("#askButton").click();
    await page.locator("#answer").waitFor({ state: "visible" });
    assert.equal(chatCalls, 1);
    await page.locator("#askNav").click();
    await page.unroute("**/.netlify/functions/transcribe");
    await page.route("**/.netlify/functions/transcribe", (r) =>
      r.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
    );
    await page.locator("#micBtn").click();
    await page.locator("#micBtn").click();
    await page.locator("#retryQuestion").waitFor({ state: "visible" });
    assert.match(
      await page.locator("#questionStatus").textContent(),
      /couldn't hear/,
    );
    assert.equal(await page.locator("#questionInput").isDisabled(), false);
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () =>
        new Promise((resolve) => (window.resolvePermission = resolve));
    });
    await page.locator("#micBtn").click();
    await page.waitForFunction(
      () => window.__STUDIO_QA__.snapshot().permissionPending,
    );
    await page.locator("#finish").click();
    await page.evaluate(() =>
      resolvePermission({ getTracks: () => [{ stop: () => tracksStopped++ }] }),
    );
    await page.waitForTimeout(40);
    assert.equal((await snapshot(page)).recording, false);
    assert.equal((await snapshot(page)).state, "goodbye");
    assert.deepEqual(errors, []);
    await context.close();
  },
);
await check(
  "offline reload runs all six lessons; APIs and private content never cached",
  async () => {
    const { context, page } = await fresh();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise((r) =>
          navigator.serviceWorker.addEventListener("controllerchange", r, {
            once: true,
          }),
        );
    });
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    for (const a of activities) {
      await page.locator(`#discover-${a.id}`).click();
      await solve(page, a);
      await page.locator("#playNav").click();
    }
    await page.locator("#askNav").click();
    await page.locator("#grownupOpen").click();
    await page.locator("#onlineConsent").check();
    await page.keyboard.press("Escape");
    await page.locator("#questionInput").fill("Why rain?");
    await page.locator("#askButton").click();
    assert.match(
      await page.locator("#questionStatus").textContent(),
      /need internet/,
    );
    const urls = await page.evaluate(async () => {
      const result = [];
      for (const key of await caches.keys())
        for (const req of await (await caches.open(key)).keys())
          result.push(req.url);
      return result;
    });
    assert.equal(
      urls.some((x) => /\.netlify|question|recording|transcript/.test(x)),
      false,
    );
    assert.ok(urls.length <= 22);
    await context.close();
  },
);
await check(
  "reduced motion, original buddy replacement, and draft language gating",
  async () => {
    const { context, page } = await fresh({ reducedMotion: "reduce" });
    assert.equal(
      await page
        .locator("#buddyCharacter")
        .evaluate((e) => e.getAnimations().length),
      0,
    );
    await page.locator("#grownupOpen").click();
    await page.locator('[data-buddy="25"]').click();
    await page.evaluate(() =>
      document.querySelector(".buddy-sprite").dispatchEvent(new Event("error")),
    );
    assert.equal(await page.locator(".pip").count(), 1);
    await page.locator("#language").selectOption("si");
    assert.match(
      await page.locator("#languageNotice").textContent(),
      /unreviewed/,
    );
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    await page.locator("#language").selectOption("ta");
    assert.equal((await snapshot(page)).language, "ta");
    await page.keyboard.press("Escape");
    await page.locator("#discover-plants").click();
    assert.match(await page.locator("#screen").textContent(), /leaves/);
    await context.close();
    const c = await browser.newContext({ javaScriptEnabled: false }),
      p = await c.newPage();
    await p.goto(base);
    assert.equal(await p.locator(".noscript-note").isVisible(), true);
    await c.close();
  },
);
await browser.close();
await fs.mkdir(new URL("../qa/artifacts/", import.meta.url), {
  recursive: true,
});
await fs.writeFile(
  new URL("../qa/artifacts/v2-results.json", import.meta.url),
  JSON.stringify(results, null, 2),
);
if (results.some((r) => !r.pass)) process.exitCode = 1;
