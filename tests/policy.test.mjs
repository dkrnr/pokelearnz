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
  assert.doesNotMatch(css, /url\(\s*['"]?https?:\/\/|@import\s+['"]https?:\/\//i);
  assert.match(app, /sound:\s*false/);
  assert.match(app, /v\.localService/);
  assert.match(app, /state\.answered/);
  assert.match(app, /celebrated\.has/);
});
export { forbidden };
test('scene motion animates only transform and opacity',async()=>{
  const css=await fs.readFile(new URL('../style.css',import.meta.url),'utf8');
  for(const match of css.matchAll(/@keyframes\s+[\w-]+\s*\{/g)){
    let end=match.index+match[0].length,depth=1,start=end;
    while(depth&&end<css.length){if(css[end]==='{')depth++;if(css[end]==='}')depth--;end++;}
    for(const property of css.slice(start,end-1).matchAll(/([a-z-]+)\s*:/g))assert.ok(['transform','opacity'].includes(property[1]),'expensive animation property: '+property[1]);
  }
});
test('authored activity player cannot upload child questions or use background engagement APIs',async()=>{
  const player=await fs.readFile(new URL('../activity-player.js',import.meta.url),'utf8');
  assert.doesNotMatch(player,/fetch\(|XMLHttpRequest|Notification|PushManager|setInterval|autoplay/);
  const {recordings,recordingFor}=await import('../authored-audio.js');
  recordings.test='/assets/audio/narration.mp3';assert.equal(recordingFor('test'),recordings.test);
  for(const path of ['/uploads/child.wav','https://example.com/voice.mp3','/assets/audio/../private.wav']){recordings.test=path;assert.equal(recordingFor('test'),undefined);}delete recordings.test;
});
test('complete catalog search accepts official punctuation, accents, gender symbols and padded numbers',async()=>{
  const {loadBuddies,searchBuddies,buddyCount}=await import('../buddy.js');
  const catalog=JSON.parse(await fs.readFile(new URL('../buddy-catalog.json',import.meta.url),'utf8')),originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>catalog});
  try{await loadBuddies();}finally{globalThis.fetch=originalFetch;}
  assert.equal(buddyCount(),1025);
  assert.deepEqual(searchBuddies('2').map(b=>b.id),[2]);
  for(const [query,id] of [['Mr. Mime',122],['ho-oh',250],['Flabébé',669],['Sirfetch’d',865],['Type: Null',772],['Nidoran♀',29],['Nidoran♂',32],['#025',25],['1025',1025]])assert.equal(searchBuddies(query).some(b=>b.id===id),true,query);
});
