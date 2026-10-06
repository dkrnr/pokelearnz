import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.POKELEARN_TEST_URL || 'http://127.0.0.1:4178';
const round = process.env.REVIEW_ROUND || 'v3-round-1';
const out = new URL(`../docs/redesign/screens/${round}/`, import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const [name, width, height] of [['phone',390,844],['tablet-portrait',820,1180],['tablet-landscape',1180,820]]) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?mock=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__STUDIO_QA__?.snapshot().catalog === 1025);
  await page.locator('#buddyCharacter img').evaluate(img => img.decode().catch(() => {}));
  await page.screenshot({ path: new URL(`${name}-scene.png`, out).pathname });
  await page.locator('#micButton').click();
  await page.screenshot({ path: new URL(`${name}-listening.png`, out).pathname });
  await page.locator('#micButton').click();
  await page.screenshot({ path: new URL(`${name}-thinking.png`, out).pathname });
  await page.waitForFunction(() => window.__STUDIO_QA__.snapshot().state === 'speaking');
  await page.screenshot({ path: new URL(`${name}-speaking.png`, out).pathname });
  await page.locator('#changeBuddy').click();
  await page.waitForFunction(() => [...document.querySelectorAll('#buddyGrid img, #recentBuddies img')].filter(img => { const r=img.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }).every(img => img.complete && img.naturalWidth > 0), {}, { timeout: 15000 }).catch(()=>{});
  await page.screenshot({ path: new URL(`${name}-chooser.png`, out).pathname });
  await page.keyboard.press('Escape');
  for(const id of (name==='phone'?['plants','homes','numbers','shapes','sounds','story']:['plants'])) {
    await page.locator('#discover-'+id).click();await page.locator('#activityWorkspace button').first().waitFor();
    await page.screenshot({path:new URL(`${name}-activity-${id}.png`,out).pathname});
    if(id==='plants') {
      for(const tool of ['light','water','air']){await page.locator('#tool-'+tool).click();await page.locator('#nextStep').click();}
      await page.screenshot({path:new URL(`${name}-activity-recap.png`,out).pathname});
    }
    await page.locator('#activityDialog [data-close]').click();
  }
  await page.locator('#finish').click();await page.locator('#endScreen').waitFor({state:'visible'});await page.screenshot({path:new URL(`${name}-calm-end.png`,out).pathname});
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);await page.locator('#buddyCharacter img').evaluate(img=>img.decode());await page.screenshot({path:new URL(`${name}-normal-scene.png`,out).pathname});
  console.log(name, JSON.stringify(await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    smallButtons: [...document.querySelectorAll('button')].filter(n => n.checkVisibility()).filter(n => { const r = n.getBoundingClientRect(); return r.width < 56 || r.height < 56; }).map(n => n.textContent),
    sprite: document.querySelector('#buddyCharacter img')?.currentSrc,
    scroll: scrollY,
  }))), errors);
  await context.close();
}
await browser.close();
