/** Ten authored questions against an explicitly supplied deployed app; never deploys. */
import fs from 'node:fs/promises';import {chromium} from 'playwright';import {readAnswer} from '../answer-contract.js';import {questions} from './core-questions.mjs';
const supplied=process.argv[2];if(!supplied)throw Error('Usage: npm run test:live -- <url>');
const url=new URL(supplied);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Supply an app HTTP(S) URL without credentials.');url.searchParams.set('debug','1');url.searchParams.delete('mock');
const browser=await chromium.launch(),results=[];let gateAutoSent=null;
try{
 const page=await browser.newPage({serviceWorkers:'block'});await page.goto(url.href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025,{}, {timeout:30000});
 for(const {question,facts}of questions){
  const began=performance.now();let response;let sent=0;
  const listener=r=>{if(new URL(r.url()).pathname.endsWith('/chat'))response=r;};page.on('response',listener);const requestListener=r=>{if(new URL(r.url()).pathname.endsWith('/chat'))sent++;};page.on('request',requestListener);
  await page.locator('#keyboardButton').click();await page.locator('#questionInput').fill(question);await page.locator('#questionForm button').click();
  if(await page.locator('#grownupDialog').isVisible()){
   const sum=(await page.locator('#gateQuestion').innerText()).match(/\((\d+) × (\d+)\) \+ (\d+)/);if(!sum)throw Error('Unsupported parental gate');
   await page.locator('#gateAnswer').fill(String(+sum[1]*+sum[2]+ +sum[3]));await page.locator('#unlockSetup').click();await page.locator('#onlineConsent').check();
   await page.waitForFunction(()=>!window.__STUDIO_QA__.snapshot().pendingQuestion);
   await page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/chat'),{timeout:18000}).catch(()=>{});
   gateAutoSent=sent===1;
  }
  let row;
  try{
   await page.waitForFunction(()=>['speaking','error'].includes(window.__STUDIO_QA__.snapshot().state),{}, {timeout:18000});
   const snapshot=await page.evaluate(()=>window.__STUDIO_QA__.snapshot()),caption=await page.locator('#captionText').innerText();let body={};try{body=await response?.json()||{};}catch{}
   let validated=false;try{validated=readAnswer(body)===caption;}catch{}
   row={question,latencyMs:Math.round(performance.now()-began),state:snapshot.state,status:response?.status()||null,source:body.source||'unknown (legacy)',model:body.model||'unknown',code:body.code||'UNKNOWN',lastError:body.lastError||null,answer:caption,validated,pass:validated&&facts.test(caption),graceful:snapshot.state!=='thinking'&&!/User Safety/i.test(caption)};
  }catch{row={question,latencyMs:Math.round(performance.now()-began),pass:false,graceful:false,code:'UI_TIMEOUT'};}
  results.push(row);console.log(JSON.stringify(row));page.off('response',listener);page.off('request',requestListener);
  if(['thinking','speaking','listening'].includes((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).state))await page.locator('#micButton').click();
  // Avoid draining the shared 8/minute quota. Ten synthetic prompts, no retries per prompt.
  await page.waitForTimeout(8000);
 }
 await fs.writeFile(process.env.LIVE_REPORT||'docs/redesign/V3-STAGE-5-LIVE.json',JSON.stringify({checkedAt:new Date().toISOString(),url:url.origin,synthetic:true,gateAutoSent,results},null,2)+'\n');
 if(!gateAutoSent||results.some(row=>!row.pass))process.exitCode=1;
}finally{await browser.close();}
