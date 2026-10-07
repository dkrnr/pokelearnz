import {readBrowserAnswer} from '../scripts/browser-answer.mjs';
import assert from 'node:assert/strict';import {chromium} from 'playwright';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({serviceWorkers:'block'});await page.addInitScript(()=>{speechSynthesis.getVoices=()=>[];});
 await page.goto((process.env.POKELEARN_TEST_URL||'http://127.0.0.1:4178')+'/?debug=1');await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);
 await page.locator('#keyboardButton').click();await page.locator('#questionInput').fill('hi there');await page.locator('#questionForm button').click();
 const [a,b,c]=(await page.locator('#gateQuestion').innerText()).match(/\d+/g).map(Number);await page.locator('#gateAnswer').fill(String(a*b+c));await page.locator('#unlockSetup').click();
 const response=page.waitForResponse(r=>r.url().endsWith('/chat'));await page.locator('#onlineConsent').check();const res=await response;assert.match(res.headers()['content-type'],/application\/x-ndjson/);const body=await readBrowserAnswer(res);
 await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().lastResult.source==='authored');
 assert.equal(body.model,'none');assert.equal(body.kind,'greeting');assert.equal(await page.locator('#captionText').innerText(),body.answer);assert.match(body.answer,/What would you like to learn\?/);
 console.log('PASS real local authored greeting, gate resume, question preserved in captions, no model');
}finally{await browser.close();}
