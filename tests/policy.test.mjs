import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const { activities } = await import("../activities.js");
const forbidden =
  /\bstreaks?\b|daily goals?|star(?:s)? (?:counter|points)|point counters?|collect them all|come back tomorrow|don't leave|do not leave|miss(?:ed|ing) out|you lost|hurry|time(?: is)? running out|countdown|ask me another|what else (?:would|do)|keep chatting|turn on notifications|feel lonely|abandon/i;
function strings(value) {
  return typeof value === "string"
    ? [value]
    : value && typeof value === "object"
      ? Object.values(value).flatMap(strings)
      : [];
}
test("six finite authored activities across three subjects and interaction types", () => {
  assert.equal(activities.length, 6);
  assert.equal(new Set(activities.map((a) => a.subject)).size, 3);
  assert.ok(new Set(activities.map((a) => a.type)).size >= 3);
  for (const a of activities) {
    assert.equal(a.duration, "3–5 minutes");
    assert.ok(a.outside);
    assert.ok(a.steps?.length || a.items?.length);
  }
});
test("authored child content has short sentences and no compulsion language", () => {
  for (const text of strings(activities)) {
    assert.doesNotMatch(text, forbidden);
    for (const sentence of text.split(/[.!?]+/).filter(Boolean))
      assert.ok(
        sentence.trim().split(/\s+/).length <= 8,
        `Long child sentence: ${sentence}`,
      );
  }
});
test("no notification, background engagement, autoplay or remote font APIs", async () => {
  const app = await fs.readFile(new URL("../app.js", import.meta.url), "utf8"),
    html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    css = await fs.readFile(new URL("../style.css", import.meta.url), "utf8");
  assert.doesNotMatch(
    app,
    /Notification|PushManager|setInterval|\.subscribe\(|serviceWorker\.ready.*push/,
  );
  assert.doesNotMatch(html, /<audio|<video|autoplay|https?:\/\//i);
  assert.doesNotMatch(css, /https?:\/\//i);
  assert.match(app, /sound:\s*false/);
  assert.match(app, /v\.localService/);
  assert.match(app, /state\.answered/);
  assert.match(app, /celebrated\.has/);
});
export { forbidden };
