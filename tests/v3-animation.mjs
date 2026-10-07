import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.POKELEARN_TEST_URL||'http://127.0.0.1:4178';
const browser=await chromium.launch();
try{
for(const [width,height] of [[390,844],[820,1180],[1180,820]]){
  const page=await browser.newPage({viewport:{width,height}});await page.addInitScript(()=>{Math.random=()=>0;});
  await page.goto(base+'/?mock=1');await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);await page.locator('#buddyCharacter img').evaluate(img=>img.decode());
  assert.match(await page.locator('#buddyCharacter img').getAttribute('src'),/25-moving.gif$/);
  assert.equal(await page.locator('#buddyCharacter img').evaluate(img=>parseInt(img.style.width)/img.naturalWidth),Number(await page.locator('#buddyCharacter img').getAttribute('data-scale')));
  const seen=new Set(),lines=new Set(),marks=new Set();let previous;
  for(let i=0;i<12;i++){await page.locator('#buddyTap').click();await page.waitForTimeout(40);const kind=await page.locator('#buddyTap').getAttribute('data-trick');assert.notEqual(kind,previous);previous=kind;seen.add(kind);lines.add(await page.locator('#captionText').innerText());marks.add(await page.locator('#particles .particle').first().innerText());}
  assert.equal(seen.size,6);assert.equal(lines.size,6);assert.equal(marks.size,6);
  await page.locator('#movingToggle').click();assert.match(await page.locator('#buddyCharacter img').getAttribute('src'),/webp$/);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#movingToggle').click();assert.match(await page.locator('#buddyCharacter img').getAttribute('src'),/webp$/);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('#micButton').click();await page.locator('#discover-plants').click();await page.locator('#tool-light').waitFor();
  assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).recording,false);assert.equal(await page.locator('#micLabel').innerText(),'Tap to talk');assert.equal(await page.locator('#micButton').isDisabled(),true);
  await page.locator('#activityDialog [data-close]').click();await page.locator('#changeBuddy').click();
  await page.locator('#typeFilters [data-type=fire]').click();assert.ok((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).chooser.total<110);
  assert.equal(await page.locator('#typeFilters button').count(),19);
  assert.equal(await page.locator('#buddyGrid .sprite-placeholder').count(),await page.locator('#buddyGrid button').count());
  await page.mouse.move(0,0);await page.waitForTimeout(1600);assert.equal(await page.locator('#buddyGrid img[src$=".gif"]').count(),0);
  const first=page.locator('#buddyGrid button').first();await first.hover();assert.ok(await page.locator('.previewing').count()<=1);
  await page.locator('#buddyDialog [data-close]').click();await page.locator('#finish').click();await page.locator('#endScreen').waitFor({state:'visible'});
  assert.equal(await page.locator('#main button:visible').count(),1);assert.equal(await page.locator('#main a:visible').count(),0);assert.equal(await page.locator('#sleepingBuddy img').count(),1);
  await page.locator('#wakeButton').click();assert.equal(await page.locator('#micButton').isEnabled(),true);await page.close();
  console.log('PASS',width,height,'integer hero, six varied reactions/no repeats, static reduced motion, type chips/placeholders, single preview, activity microphone stopped, sleep controls');
}
}finally{await browser.close();}
