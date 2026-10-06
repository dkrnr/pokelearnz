import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.POKELEARN_TEST_URL || 'http://127.0.0.1:4178';
const browser = await chromium.launch({ headless: true });
const forbidden = /\bstreaks?\b|daily goals?|star counters?|point counters?|collect them all|come back tomorrow|don't leave|miss(?:ed|ing) out|you lost|hurry|countdown|ask me another|what else would|keep chatting|turn on notifications|feel lonely|abandon/i;
async function ready(page, path='/?mock=1') {
  await page.goto(base+path,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);
}
const snapshot = p => p.evaluate(()=>window.__STUDIO_QA__.snapshot());
async function unlock(p) {
  const [a,b,c]=(await p.locator('#gateQuestion').innerText()).match(/\d+/g).map(Number);
  await p.locator('#gateAnswer').fill(String(a*b+c)); await p.locator('#unlockSetup').click();
}
async function audit(p) {
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
  assert.deepEqual(await p.locator('button:visible').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width<56||r.height<56}).map(n=>n.textContent)),[],'56px targets');
  assert.doesNotMatch(await p.locator('#main').innerText(),forbidden);
}
try {
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}), p=await context.newPage();
  const calls=[], errors=[];
  p.on('request',r=>{if(r.url().includes('/.netlify/functions/'))calls.push(r.url());assert.equal(r.url().includes('raw.githubusercontent.com'),false)});
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{ window.__micCalls=0; navigator.mediaDevices.getUserMedia=async()=>{window.__micCalls++;throw Error('unexpected');}; window.__speechCalls=0; speechSynthesis.speak=()=>window.__speechCalls++; });
  await ready(p); await audit(p);
  assert.equal((await snapshot(p)).sound,false); assert.equal(await p.evaluate(()=>window.__speechCalls),0);
  assert.equal(await p.locator('#keyboardDialog').isVisible(),false);
  assert.match(await p.locator('#buddyCharacter img').getAttribute('src'),/\.webp$/);
  await p.locator('#changeBuddy').click(); await audit(p);
  assert.ok(await p.locator('#buddyGrid button').count()<40);
  await p.locator('#buddyGrid button').first().focus(); await p.keyboard.press('End');
  await p.waitForFunction(()=>document.querySelector('#buddyGrid').innerText.includes('Pecharunt')); assert.match(await p.locator('#buddyGrid').innerText(),/Pecharunt/);
  await p.locator('[data-generation="9"]').click(); assert.equal((await snapshot(p)).chooser.total,120);
  await p.locator('#typeFilter').selectOption('grass'); assert.ok((await snapshot(p)).chooser.total<120);
  await p.locator('[data-generation="all"]').click(); await p.locator('#typeFilter').selectOption('');
  await p.locator('#buddySearch').fill('#1025'); assert.equal(await p.locator('#buddyGrid button').count(),1);
  await p.waitForFunction(()=>document.querySelector('#buddyGrid').innerText.includes('Pecharunt')); assert.match(await p.locator('#buddyGrid').innerText(),/Pecharunt/);
  await p.locator('#shinyToggle').click(); assert.match(await p.locator('#buddyGrid img').getAttribute('src'),/\/shiny\//);
  await p.locator('#buddyGrid button').click(); assert.equal((await snapshot(p)).buddy,1025);
  await p.locator('#changeBuddy').click(); await p.locator('#buddySearch').fill('eevee');
  await p.locator('#buddyGrid button').click(); assert.equal((await snapshot(p)).buddy,133);
  await p.locator('#changeBuddy').click(); assert.equal(await p.locator('#recentBuddies button').count(),3);
  await p.locator('#surpriseBuddy').click(); assert.ok((await snapshot(p)).buddy>=1);
  await p.locator('#micButton').click(); assert.equal((await snapshot(p)).state,'listening'); assert.equal((await snapshot(p)).sound,true);
  await p.locator('#readAloud').click(); assert.equal((await snapshot(p)).sound,false); assert.equal((await snapshot(p)).state,'listening');
  await p.locator('#readAloud').click(); assert.equal((await snapshot(p)).state,'listening'); assert.equal(await p.evaluate(()=>window.__speechCalls),0);
  await p.locator('#micButton').click(); assert.equal((await snapshot(p)).state,'thinking');
  await p.waitForFunction(()=>window.__STUDIO_QA__.snapshot().state==='speaking');
  assert.match(await p.locator('#captionText').innerText(),/Leaves/); assert.equal(await p.evaluate(()=>scrollY),0);
  await p.locator('#micButton').click(); assert.equal((await snapshot(p)).state,'idle');
  await p.locator('#readAloud').click(); assert.equal((await snapshot(p)).sound,false);
  await p.locator('#micButton').click(); assert.equal((await snapshot(p)).sound,false); await p.waitForFunction(()=>window.__STUDIO_QA__.snapshot().state==='thinking',{},{timeout:6500});
  await p.locator('#changeBuddy').click(); await p.waitForTimeout(1600);
  assert.equal((await snapshot(p)).state,'idle'); assert.equal((await snapshot(p)).requestActive,false);
  await p.keyboard.press('Escape');
  await p.locator('#keyboardButton').click(); await p.locator('#questionInput').fill('Why does rain fall?');
  await p.locator('#questionForm button').click(); await p.waitForFunction(()=>window.__STUDIO_QA__.snapshot().state==='speaking');
  assert.match(await p.locator('#captionText').innerText(),/Clouds/);
  assert.equal(await p.evaluate(()=>window.__micCalls),0); assert.deepEqual(calls,[]); assert.deepEqual(errors,[]);
  await p.locator('#finish').click(); await p.locator('#endScreen').waitFor({state:'visible'}); await audit(p);
  await p.locator('#wakeButton').click(); await p.locator('#grownupOpen').click();
  await p.locator('#gateAnswer').fill('14'); await p.locator('#unlockSetup').click(); assert.equal(await p.locator('#setupSettings').isVisible(),false);
  await unlock(p); await p.locator('#onlineConsent').check();
  await p.locator('#saveBuddies').check(); await p.keyboard.press('Escape');
  const chosen=(await snapshot(p)).buddy; await ready(p);
  assert.equal((await snapshot(p)).consent,true); assert.equal((await snapshot(p)).buddy,chosen);
  await p.locator('#grownupOpen').click(); await p.locator('#language').selectOption('ta'); await p.keyboard.press('Escape');
  assert.equal(await p.locator('#micLabel').innerText(),'பேச தட்டு'); await audit(p);
  await p.locator('#grownupOpen').click(); await p.locator('#language').selectOption('si'); await p.keyboard.press('Escape'); await audit(p);
  await p.locator('#grownupOpen').click(); await p.locator('#language').selectOption('en');
  await p.locator('#clearData').click(); assert.equal((await snapshot(p)).consent,false); await p.keyboard.press('Escape');
  await ready(p,'/'); await p.locator('#micButton').click(); assert.equal(await p.locator('#grownupDialog').isVisible(),true);
  assert.equal(await p.evaluate(()=>window.__micCalls),0);
  await unlock(p);await p.locator('#onlineConsent').check();await p.keyboard.press('Escape');
  await p.locator('#micButton').click();await p.waitForFunction(()=>window.__STUDIO_QA__.snapshot().state==='error');
  assert.match(await p.locator('#captionText').innerText(),/typing/); assert.equal(await p.locator('#keyboardButton').isEnabled(),true);
  console.log('PASS mock flow, cancellation, selector 1–1025, shiny, virtual scroll, generation/type filters, recent shelf, setup persistence, language drafts, reduced motion, no automatic audio/mic/provider calls, friendly mic error');
  await context.close();
  // Verify cached shell, metadata and an actually visited CDN sprite offline.
  const offlineContext=await browser.newContext({viewport:{width:820,height:1180},reducedMotion:'reduce'}), q=await offlineContext.newPage();
  await ready(q);
  await q.evaluate(()=>navigator.serviceWorker.ready);
  await q.waitForFunction(()=>navigator.serviceWorker.controller);
  await q.reload({waitUntil:'domcontentloaded'});
  await q.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);
  await q.locator('#buddyCharacter img').evaluate(img=>img.decode());
  await q.locator('#changeBuddy').click(); await q.locator('#buddySearch').fill('bulbasaur');
  await q.locator('#buddyGrid img').evaluate(img=>img.decode()); await q.keyboard.press('Escape');
  await q.waitForFunction(async()=>{const c=await caches.open('pokelearn-sprites-v3'); return (await c.keys()).length>0;});
  await offlineContext.setOffline(true);await ready(q);await audit(q);
  await q.locator('#buddyCharacter img').evaluate(img=>img.decode());
  await q.locator('#changeBuddy').click();await q.locator('#buddySearch').fill('1025');await q.waitForFunction(()=>document.querySelector('#buddyGrid').innerText.includes('Pecharunt'));assert.match(await q.locator('#buddyGrid').innerText(),/Pecharunt/);
  const keys=await q.evaluate(()=>caches.keys());assert.ok(keys.includes('pokelearn-sprites-v3'));
  console.log('PASS offline shell, full catalog and visited buddy image');await offlineContext.close();
  // Automated accessibility scan of scene, chooser, keyboard and grown-ups.
  const a=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await ready(a);await a.addScriptTag({path:new URL('../node_modules/axe-core/axe.min.js',import.meta.url).pathname});
  for (const view of ['scene','chooser','keyboard','grownups']) {
    if(view!=='scene') await a.locator({chooser:'#changeBuddy',keyboard:'#keyboardButton',grownups:'#grownupOpen'}[view]).click();
    const result=await a.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
    assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${view}: accessibility`);
    if(view!=='scene')await a.keyboard.press('Escape');
  }
  console.log('PASS automated accessibility on scene, chooser, keyboard, grown-ups');
} finally { await browser.close(); }
