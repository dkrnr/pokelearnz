/** Deterministic frame sequence of the real CSS tap reaction, not an illustration. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.POKELEARN_TEST_URL||'http://127.0.0.1:4178';
const out='docs/redesign/screens/v3-stage3-tap';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});await page.addInitScript(()=>{Math.random=()=>0;});await page.goto(base+'/?mock=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);await page.locator('#buddyCharacter img').evaluate(img=>img.decode());
await page.screenshot({path:out+'/000-before.png'});await page.locator('#buddyTap').click();await page.waitForFunction(()=>document.querySelector('#buddyTap').dataset.trick);
const measures=[];
for(const ms of [100,350,650,900]){
  const measure=await page.evaluate(ms=>{for(const animation of document.getAnimations()){animation.pause();animation.currentTime=ms;}return {ms,transform:getComputedStyle(document.querySelector('#buddyTap')).transform,particles:document.querySelectorAll('#particles .particle').length};},ms);
  measures.push(measure);await page.screenshot({path:out+`/${String(ms).padStart(3,'0')}-reaction.png`});
}
assert.notEqual(measures[0].transform,measures[1].transform);assert.equal(measures[1].particles,7);
await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#buddyTap').click();assert.equal(await page.evaluate(()=>document.querySelector('#buddyTap').getAnimations().length),0);assert.ok(await page.locator('#captionText').innerText());
// Capture the other five finite reactions at their visible middle frame.
await page.emulateMedia({reducedMotion:'no-preference'});
for(let i=0;i<6;i++){await page.locator('#buddyTap').click();await page.waitForTimeout(35);const kind=await page.locator('#buddyTap').getAttribute('data-trick');await page.evaluate(()=>{for(const animation of document.getAnimations()){animation.pause();animation.currentTime=350;}});await page.screenshot({path:out+'/'+kind+'.png'});}
console.log('PASS hop/squash/particles frame evidence and reduced-motion caption feedback',JSON.stringify(measures));
}finally{await browser.close();}
