import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {activities} from '../activities.js';
const base=process.env.POKELEARN_TEST_URL||'http://127.0.0.1:4178';
const browser=await chromium.launch({headless:true});
const forbidden=/\bstreaks?\b|daily goals?|star counters?|point counters?|collect them all|come back tomorrow|don't leave|miss(?:ed|ing) out|you lost|hurry|countdown|ask me another|what else would|keep chatting|turn on notifications|feel lonely|abandon/i;
const snap=p=>p.evaluate(()=>window.__STUDIO_QA__.snapshot());
async function ready(p){await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);}
async function audit(p,label){
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' overflow');
  const buttons=await p.locator('button:visible').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width<56||r.height<56||!n.querySelector('svg,[aria-hidden=true]')||!n.textContent.trim();}).map(n=>n.textContent));
  assert.deepEqual(buttons,[],label+' targets/icons/words');
  assert.doesNotMatch(await p.locator('#main').innerText(),forbidden);
  assert.doesNotMatch(await p.locator('#activityDialog').innerText(),forbidden);
  assert.doesNotMatch(await p.locator('#main').innerText(),/Practice mode/i);
  await p.addScriptTag({path:new URL('../node_modules/axe-core/axe.min.js',import.meta.url).pathname});
  const violations=await p.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
  assert.deepEqual(violations,[],label+' accessibility');
}
async function solve(p,a){
  if(a.type==='build-plant')for(const step of a.steps){await p.locator('#tool-'+step.target).click();await p.locator('#nextStep').click();}
  if(a.type==='build-number')for(const step of a.steps){for(let i=0;i<step.target;i++)await p.locator('#addBlock').click();await p.locator('#checkGroup').click();await p.locator('#nextStep').click();}
  if(a.type==='sort'){for(let i=0;i<a.items.length;i++){await p.locator('#animal-'+i).click();await p.locator('#bin-'+a.items[i].target).click();}await p.locator('#nextStep').click();}
  if(a.type==='match')for(const item of a.items){await p.locator('#choice-'+item.target).click();await p.locator('#nextStep').click();}
  if(a.type==='order')for(const step of a.steps){for(let i=0;i<step.items.length;i++)await p.locator('#story-'+i).click();await p.locator('#nextStep').click();}
  assert.equal((await snap(p)).activity.phase,'recap');
}
try{
for(const [label,width,height] of [['phone',390,844],['portrait',820,1180],['landscape',1180,820]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce',bypassCSP:true}),p=await context.newPage(),errors=[],calls=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/.netlify/functions/'))calls.push(r.url());});
  await p.addInitScript(()=>{window.__audioPlays=0;window.__speech=0;HTMLMediaElement.prototype.play=async function(){window.__audioPlays++};speechSynthesis.speak=()=>window.__speech++;});
  await ready(p); await audit(p,label+' scene');
  assert.equal(await p.locator('#sceneProps button').count(),6);
  for(const a of activities){
    await p.locator('#discover-'+a.id).click();await p.locator('#activityWorkspace button').first().waitFor();
    await audit(p,label+' '+a.id);
    assert.equal((await snap(p)).recording,false); assert.equal(await p.locator('#micLabel').innerText(),'Tap to talk');assert.equal(await p.locator('#micButton').isDisabled(),true);
    if(a.type==='build-plant')await p.locator('#tool-water').click();
    if(a.type==='build-number')await p.locator('#checkGroup').click();
    if(a.type==='sort'){await p.locator('#animal-0').click();await p.locator('#bin-'+a.bins.find(b=>b.id!==a.items[0].target).id).click();}
    if(a.type==='match')await p.locator('#choice-'+a.choices.find(c=>c.id!==a.items[0].target).id).click();
    if(a.type==='order')await p.locator('#story-2').click();
    assert.equal((await snap(p)).activity.solved,false);assert.ok(await p.locator('#activityFeedback').innerText());
    await solve(p,a);await audit(p,label+' '+a.id+' recap');
    assert.equal(await p.locator('#activityNote').innerText(),a.note);
    await p.locator('#completeActivity').click();await p.locator('#endScreen').waitFor({state:'visible'});assert.equal(await p.locator('#main button:visible').count(),1);assert.equal((await snap(p)).recording,false);await p.locator('#wakeButton').click();
  }
  assert.equal(await p.evaluate(()=>window.__audioPlays+window.__speech),0,'no automatic narration');
  assert.deepEqual(calls,[],'authored activities never upload questions/voice');assert.deepEqual(errors,[]);
  assert.equal((await snap(p)).celebrations.filter(id=>activities.some(a=>a.id===id)).length,6);
  await p.locator('#discover-plants').click();await p.locator('#tool-water').click();assert.equal((await snap(p)).activity.solved,false);
  await p.locator('#tool-light').click();await p.locator('#resetStep').click();assert.deepEqual((await snap(p)).activity.helpers,[]);
  await p.locator('#activityDialog [data-close]').click();assert.equal(await p.evaluate(()=>document.activeElement.id),'discover-plants');
  await p.locator('#discover-numbers').click();await p.locator('#addBlock').click();await p.locator('#removeBlock').click();assert.equal((await snap(p)).activity.count,0);
  await p.locator('#checkGroup').click();assert.equal((await snap(p)).activity.solved,false);await p.locator('#activityDialog [data-close]').click();
  await p.locator('#discover-plants').click();await solve(p,activities[0]);assert.equal(await p.locator('#activityParticles .particle').count(),0,'repeat activity does not celebrate again');
  await context.close();console.log('PASS',label,'six authored activities, calm completion, no compulsion/autoplay/provider calls, accessible controls, mistakes, reset, reversal and focus');
}
// Optional recording configuration: test a generated WAV with the native audio player.
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),p=await context.newPage();
await p.route('**/authored-audio.js',r=>r.fulfill({contentType:'application/javascript',body:"export function recordingFor(key){return key==='plants.intro'?'/assets/audio/test-narration.wav':undefined;}"}));
const pcm=Buffer.alloc(44+8000);pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(8000,24);pcm.writeUInt32LE(16000,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(8000,40);
let audioRequests=0;
await p.route('**/assets/audio/test-narration.wav',r=>{audioRequests++;return r.fulfill({contentType:'audio/wav',body:pcm});});
await p.addInitScript(()=>{window.__plays=0;const native=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__plays++;return native.call(this);};});
await ready(p);await p.locator('#discover-plants').click();await p.locator('#tool-light').waitFor();assert.equal(audioRequests,0);
const loaded=p.waitForResponse('**/assets/audio/test-narration.wav');await p.locator('#activityRead').click();await loaded;await p.waitForFunction(()=>window.__plays===1);assert.equal(audioRequests,1);await p.locator('#activityDialog [data-close]').click();
assert.equal((await snap(p)).state,'idle');await context.close();console.log('PASS prerecorded authored audio after explicit Read aloud and close cancellation (generated WAV fixture; no production recordings yet)');
const offline=await browser.newContext({viewport:{width:820,height:1180},reducedMotion:'reduce'}),q=await offline.newPage();await ready(q);await q.evaluate(()=>navigator.serviceWorker.ready);await q.waitForFunction(()=>navigator.serviceWorker.controller);await offline.setOffline(true);await ready(q);
for(const a of activities){await q.locator('#discover-'+a.id).click();await q.locator('#activityWorkspace button').first().waitFor();await solve(q,a);await q.locator('#activityDialog [data-close]').click();}
const urls=await q.evaluate(async()=>{const urls=[];for(const name of await caches.keys())for(const request of await (await caches.open(name)).keys())urls.push(request.url);return urls;});assert.equal(urls.some(url=>/\.netlify|question|recording|transcript/.test(url)),false);
await offline.close();console.log('PASS all six authored activities offline, including first dynamic import; no private/API content in caches');
}finally{await browser.close();}
