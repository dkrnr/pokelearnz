/** One explicit live check, hard-capped at three synthetic questions. Never deploys or loads .env. */
import fs from 'node:fs/promises';import path from 'node:path';import {chromium} from 'playwright';import {assessLiveResult} from './live-result.mjs';
const supplied=process.argv[2];if(!supplied)throw Error('Usage: npm run test:live -- <url>');
const url=new URL(supplied);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Supply an app HTTP(S) URL without credentials.');url.searchParams.set('debug','1');url.searchParams.delete('mock');url.searchParams.delete('demo');
const report={checkedAt:new Date().toISOString(),url:url.origin,synthetic:true,maxQuestions:3,gateAutoSent:false,results:[],cspViolations:[],runtimeErrors:[],networkErrors:[],headers:{},views:[],publicPages:[]};
const browser=await chromium.launch();
try{
 const page=await browser.newPage({serviceWorkers:'block'});
 page.on('pageerror',error=>report.runtimeErrors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/Content Security Policy|Refused to (load|execute|connect)|violates.*directive/i.test(message.text()))report.cspViolations.push(message.text());});
 page.on('requestfailed',request=>{const failure=request.failure()?.errorText||'NETWORK_ERROR';report.networkErrors.push({host:new URL(request.url()).hostname,error:failure});});
 await page.addInitScript(()=>{window.__liveCsp=[];document.addEventListener('securitypolicyviolation',e=>window.__liveCsp.push({directive:e.effectiveDirective,blocked:e.blockedURI}));});
 const navigation=await page.goto(url.href,{waitUntil:'domcontentloaded'});const headers=await navigation.allHeaders();for(const key of ['content-security-policy','strict-transport-security','x-content-type-options','x-frame-options','referrer-policy','permissions-policy'])report.headers[key]=headers[key]||null;
 await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025,{}, {timeout:30000});report.views.push('scene');
 report.health=await page.evaluate(async()=>{const r=await fetch('/api/health',{signal:AbortSignal.timeout(15000)});const body=await r.json();return {status:r.status,groq:body.groq===true,openrouter:body.openrouter===true,valsea:body.valsea===true};});
 // Playwright's browser fetch Response has a numeric status, unlike its Node Response.
 if(report.health.status!==200)throw Error('HEALTH_UNAVAILABLE');
 if(!report.health.openrouter||!report.health.valsea)throw Error('MISSING_'+(!report.health.openrouter?'OPENROUTER_KEY':'VALSEA_KEY'));
 const prompts=[{question:'What do axolotls eat?',facts:/worm|bug|insect|fish|shrimp/i},{question:'What is a quasar?',facts:/bright|light|galax|black hole|space|star/i},{question:'What is a quasar?',facts:/bright|light|galax|black hole|space|star/i}];
 for(const [index,{question,facts}]of prompts.entries()){
  const began=performance.now();let sent=0;const listener=r=>{if(new URL(r.url()).pathname.endsWith('/chat'))sent++;};page.on('request',listener);
  const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/chat'),{timeout:20000});responsePromise.catch(()=>{});
  await page.locator('#keyboardButton').click();await page.locator('#questionInput').fill(question);await page.locator('#questionForm button').click();
  if(await page.locator('#grownupDialog').isVisible()){
   const sum=(await page.locator('#gateQuestion').innerText()).match(/\((\d+) × (\d+)\) \+ (\d+)/);if(!sum)throw Error('UNSUPPORTED_GATE');
   await page.locator('#gateAnswer').fill(String(+sum[1]*+sum[2]+ +sum[3]));await page.locator('#unlockSetup').click();await page.locator('#onlineConsent').check();
   await page.waitForFunction(()=>!window.__STUDIO_QA__.snapshot().pendingQuestion);
  }
  let row;
  try{
   const response=await responsePromise;await page.waitForFunction(()=>['speaking','error'].includes(window.__STUDIO_QA__.snapshot().state),{}, {timeout:18000});
   const body=await response.json(),caption=await page.locator('#captionText').innerText();row={question,status:response.status(),source:body.source||'unknown',provider:body.provider||null,model:body.model||'none',code:body.code||'UNKNOWN',lastError:body.lastError||null,answer:caption,latencyMs:Math.round(performance.now()-began),...assessLiveResult({body,status:response.status(),caption,facts})};
   if(index===0)report.gateAutoSent=sent===1;
   if(index===2&&['ai','cache'].includes(report.results[1]?.source)){row.cacheExpected=true;row.cacheHit=body.source==='cache';row.pass&&=row.cacheHit;}
  }catch(error){row={question,pass:false,code:/ERR_CONNECTION_CLOSED|ERR_CONNECTION_RESET|ERR_SSL/.exec(error.message)?.[0]||'UI_OR_RESPONSE_TIMEOUT'};}
  report.results.push(row);console.log(JSON.stringify(row));page.off('request',listener);if(!row.pass)break;
  if(['thinking','speaking','listening'].includes((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).state))await page.locator('#micButton').click();
 }
 // Audit all public pages in this same live run, without extra questions.
 for(const slug of ['about','parents','privacy','contact']){
  const info=await browser.newPage();
  try{
   const res=await info.goto(url.origin+'/'+slug,{waitUntil:'networkidle',timeout:20000});
   const text=await info.locator('main').innerText();
   const frames=await info.locator('iframe[src^="https://app.netlify.com/cdp"]').evaluateAll(nodes=>nodes.map(n=>({origin:'https://app.netlify.com',path:'/cdp',visible:getComputedStyle(n).display!=='none'})));
   report.publicPages.push({slug,status:res.status(),offMessage:/Collaborate on projects before going live|Developer test reports|HMAC|PII|Missing keys|when configured|production activity/i.test(text),reviewFrames:frames});
  }catch{report.publicPages.push({slug,pass:false,error:'PUBLIC_PAGE_AUDIT_FAILED'});}finally{await info.close();}
 }
 report.answerNoteVisible=await page.locator('#answerNote').isVisible();
 report.views.push('typing');await page.locator('#changeBuddy').click();await page.locator('#buddySearch').fill('eevee');await page.locator('#buddyGrid button').click();report.views.push('chooser');
 await page.locator('#discover-numbers').click();await page.locator('#checkGroup').click();report.views.push('activity');await page.waitForTimeout(1000);report.cspViolations.push(...await page.evaluate(()=>window.__liveCsp));
 report.pass=report.gateAutoSent&&report.results.length===3&&report.results.every(r=>r.pass)&&!report.cspViolations.length&&!report.runtimeErrors.length&&report.answerNoteVisible&&report.publicPages.every(p=>p.status===200&&!p.offMessage&&p.reviewFrames.every(f=>!f.visible));
 report.cacheVerified=report.results[2]?.cacheHit===true;report.groqVerified=report.results.some(r=>r.source==='ai'&&r.provider==='groq');
}catch(error){report.pass=false;report.error=/ERR_CONNECTION_CLOSED|ERR_CONNECTION_RESET|ERR_SSL|MISSING_OPENROUTER_KEY|MISSING_VALSEA_KEY|HEALTH_UNAVAILABLE|UNSUPPORTED_GATE/.exec(error.message)?.[0]||'LIVE_CHECK_FAILED';console.log(JSON.stringify({error:report.error,pass:false}));}
finally{
 await browser.close();const file=process.env.LIVE_REPORT||'qa/artifacts/release-live.json';await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:report.pass,questions:report.results.length,gateAutoSent:report.gateAutoSent,groqVerified:report.groqVerified||false,cacheVerified:report.cacheVerified||false,gracefulLimits:report.results.filter(r=>r.gracefulLimit).length,cspViolations:report.cspViolations.length,report:file}));if(!report.pass)process.exitCode=1;
}
