import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server.mjs";
delete process.env.OPENROUTER_KEY;
let server, base;
before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));
test("production serves public shell and valid install metadata", async () => {
  const r = await fetch(base);
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Discovery Camp/);
  const m = await (await fetch(base + "/manifest.webmanifest")).json();
  assert.equal(m.display, "standalone");
  for (const icon of m.icons) {
    const r = await fetch(base + icon.src);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("content-type"), "image/png");
  }
});
test("private repo files and traversal are unavailable", async () => {
  for (const file of [
    "/.env",
    "/STUDIO.md",
    "/server.mjs",
    "/netlify/functions/chat.js",
    "/research/makeover-2026-10-06/RESEARCH.md",
    "/..%2f.env",
  ])
    assert.equal((await fetch(base + file)).status, 404);
});
test("API method guard and missing-key response require no provider call", async () => {
  assert.equal((await fetch(base + "/.netlify/functions/chat")).status, 405);
  const r = await fetch(base + "/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"messages":[]}',
  });
  assert.equal(r.status, 500);
  assert.equal(r.headers.get("cache-control"), "no-store");
});
