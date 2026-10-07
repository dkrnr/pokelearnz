import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.POKELEARN_TEST_URL||'http://127.0.0.1:4178';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({serviceWorkers:'block'});
 await page.addInitScript(()=>{
  window.__spoken=[];window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  speechSynthesis.getVoices=()=>[{localService:true,lang:'en-US',name:'Test voice'}];
  speechSynthesis.speak=u=>{window.__spoken.push(u.text);setTimeout(()=>u.onend?.(),100);};
 });
 let mode='good',calls=[];
 await page.route('**/.netlify/functions/chat',async route=>{
  calls.push(JSON.parse(route.request().postData()));
  if(mode==='stuck')return;
  const result=mode==='classifier'?{answer:'User Safety: safe',source:'ai',code:'OK'}:mode==='legacy'?{choices:[{message:{content:'User Safety: safe'}}]}:{answer:'Axolotls eat worms and small fish.',source:'authored',model:'fixture',lastError:'DAILY_LIMIT',code:'OK'};
  await route.fulfill({json:result});
 });
 await page.goto(base+'/?debug=1');await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);
 async function ask(question){await page.locator('#keyboardButton').click();await page.locator('#questionInput').fill(question);await page.locator('#questionForm button').click();}
 await ask('What do axolotls eat?');await page.locator('#grownupDialog').waitFor({state:'visible'});
 assert.equal(calls.length,0);assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).pendingQuestion,true);
 assert.equal(await page.locator('#debugStatus').isVisible(),false);
 const sum=(await page.locator('#gateQuestion').innerText()).match(/\((\d+) × (\d+)\) \+ (\d+)/);
 await page.locator('#gateAnswer').fill('0');await page.locator('#unlockSetup').click();assert.equal(calls.length,0);
 await page.locator('#gateAnswer').fill(String(+sum[1]*+sum[2]+ +sum[3]));await page.locator('#unlockSetup').click();
 await page.locator('#onlineConsent').check();
 await page.waitForFunction(()=>window.__spoken.length===1);
 assert.equal(calls.length,1);assert.equal(calls[0].question,'What do axolotls eat?');
 assert.deepEqual(await page.evaluate(()=>window.__spoken),['Axolotls eat worms and small fish.']);
 await page.locator('#grownupOpen').click();assert.equal(await page.locator('#setupGate').isVisible(),false);assert.equal(await page.locator('#debugSource').innerText(),'Demo bank');assert.match(await page.locator('#debugDetails').innerText(),/DAILY_LIMIT/);await page.locator('#grownupDialog [data-close]').click();
 for(const bad of ['classifier','legacy']){mode=bad;await ask('What do axolotls eat?');await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().state==='error');assert.doesNotMatch(await page.locator('#captionText').innerText(),/User Safety/);assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).lastResult.source,null);}
 mode='good';await page.evaluate(()=>{speechSynthesis.speak=()=>{throw Error('Unavailable device speech');};});await ask('What do axolotls eat?');await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().audioStatus==='unavailable');assert.equal(await page.locator('#captionText').innerText(),'Axolotls eat worms and small fish.');assert.match(await page.locator('#voiceHint').innerText(),/answer.*read/);
 mode='stuck';await page.clock.install();await ask('What do axolotls eat?');await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().state==='thinking');await page.clock.runFor(15500);assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).state,'error');assert.match(await page.locator('#captionText').innerText(),/try again|type/);assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).requestActive,false);
 console.log('PASS pending question auto-sends once; one gate per session; typed read-aloud; adult-only source/debug; classifier/legacy rejection; 15s stuck-request watchdog; speech-service exception keeps captions');
}finally{await browser.close();}
