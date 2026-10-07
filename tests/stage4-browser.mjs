import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {animatedCoverage} from '../animated-coverage.js';
import {activities} from '../activities.js';
const base=process.env.POKELEARN_TEST_URL||'http://127.0.0.1:4178';
const catalog=JSON.parse(await fs.readFile(new URL('../buddy-catalog.json',import.meta.url),'utf8'));
const fire=catalog.filter(b=>b.id>=906&&b.id<=1025&&b.types.includes('fire'));
assert.deepEqual(fire.map(b=>b.id),[909,910,911,935,936,937,952,994,1004,1020]);
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:820,height:1180},serviceWorkers:'block'});
 // Decode/motion fixture avoids making this deterministic check depend on CDN availability.
 await page.route('https://cdn.jsdelivr.net/**/official-artwork/906.png',route=>route.fulfill({path:new URL('../assets/buddies/1.png',import.meta.url).pathname,contentType:'image/png'}));
 await page.addInitScript(()=>{Math.random=()=>.5;});
 await page.goto(base+'/?mock=1');await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);
 await page.locator('#changeBuddy').click();await page.locator('[data-generation="9"]').click();await page.locator('#typeFilters [data-type="fire"]').click();
 assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).chooser.total,10);
 assert.match(await page.locator('#chooserStatus').innerText(),/^10 /);
 // ID 906 is a verified no-GIF buddy; Artwork must retain procedural idle motion.
 assert.equal(!!animatedCoverage.normal[906],false);
 await page.locator('#typeFilters [data-type=""]').click();await page.locator('#buddySearch').fill('906');await page.locator('#buddyGrid button').click();
 await page.locator('#movingToggle').click();assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).moving,false);
 const source=await page.locator('#buddyCharacter img').getAttribute('src');assert.match(source,/official-artwork\/906.png$/);
 await page.locator('#buddyCharacter img').evaluate(img=>img.decode());
 await page.waitForFunction(()=>document.querySelector('#buddyTap').dataset.trick==='breathe',{}, {timeout:12000});
 const before=await page.locator('#buddyTap').evaluate(el=>getComputedStyle(el).transform);await page.waitForTimeout(250);
 const after=await page.locator('#buddyTap').evaluate(el=>getComputedStyle(el).transform);assert.notEqual(before,after);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#buddyTap').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.locator('#discover-numbers').click();await page.locator('#checkGroup').waitFor();
 await page.locator('#checkGroup').click();assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).activity.solved,false);
 const blocks=activities.find(a=>a.id==='numbers');
 for(const step of blocks.steps){
  for(let i=0;i<step.target;i++)await page.locator('#addBlock').click();
  await page.locator('#checkGroup').click();assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).activity.solved,true);
  await page.locator('#nextStep').click();
 }
 assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).activity.phase,'recap');
 await page.locator('#completeActivity').click();await page.locator('#endScreen').waitFor({state:'visible'});
 assert.equal(await page.locator('#main button:visible').count(),1);await page.locator('#wakeButton').click();
 assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).state,'idle');
 console.log('PASS Gen 9 Fire count=10; no-GIF Artwork URL and idle transforms (bundled image fixture); reduced motion static; Blocks wrong answer through recap, Done for now and Wake');
}finally{await browser.close();}
