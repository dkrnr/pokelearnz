/* Run with a local build server. Reports go to ignored qa/artifacts, never to git. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
const base = process.env.POKELEARN_TEST_URL || 'http://127.0.0.1:4178';
const label = process.env.PROFILE_LABEL || 'after';
const output = process.env.PROFILE_OUTPUT || 'qa/artifacts/performance';
await fs.mkdir(output, { recursive:true });
const configuration = {
  extends:'lighthouse:default',
  settings:{ onlyCategories:['performance'], formFactor:'mobile', throttlingMethod:'devtools',
    screenEmulation:{ mobile:true, width:390, height:844, deviceScaleFactor:2, disabled:false },
    throttling:{ rttMs:150, throughputKbps:1638.4, requestLatencyMs:150, downloadThroughputKbps:1638.4, uploadThroughputKbps:675, cpuSlowdownMultiplier:4 },
  },
};
let lighthouse;
if (process.env.LIGHTHOUSE_DIR) ({ default:lighthouse } = await import(pathToFileURL(path.join(process.env.LIGHTHOUSE_DIR, 'node_modules/lighthouse/core/index.js')).href));
else ({ default:lighthouse } = await import('lighthouse'));
const runs=[];
for (let i=0; i<3; i++) {
  const port=9230+i;
  const browser=await chromium.launch({ headless:true, executablePath:chromium.executablePath(), args:[`--remote-debugging-port=${port}`] });
  try {
    const result=await lighthouse(`${base}/?mock=1`, { port, output:['json','html'], logLevel:'error' }, configuration);
    const lhr=result.lhr;
    await fs.writeFile(path.join(output,`${label}-${i+1}.json`),JSON.stringify(lhr,null,2));
    await fs.writeFile(path.join(output,`${label}-${i+1}.html`),result.report[1]);
    const summary={ score:lhr.categories.performance.score*100,
      lcpMs:lhr.audits['largest-contentful-paint'].numericValue,
      fcpMs:lhr.audits['first-contentful-paint'].numericValue,
      cls:lhr.audits['cumulative-layout-shift'].numericValue,
      tbtMs:lhr.audits['total-blocking-time'].numericValue,
      warnings:lhr.runWarnings,
      lcpElement:lhr.audits['largest-contentful-paint-element']?.details?.items,
      transfer:lhr.audits['total-byte-weight']?.numericValue,
    };
    runs.push(summary);console.log(label, i+1, JSON.stringify(summary));
  } finally { await browser.close(); }
}
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:820,height:1180},hasTouch:true});
const session=await page.context().newCDPSession(page);
await session.send('Emulation.setCPUThrottlingRate',{rate:4});
await page.addInitScript(()=>{
  window.__profileTasks=[]; window.__profileShifts=[];
  new PerformanceObserver(list=>window.__profileTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
  new PerformanceObserver(list=>window.__profileShifts.push(...list.getEntries().filter(e=>!e.hadRecentInput).map(e=>e.value))).observe({type:'layout-shift',buffered:true});
});
await page.goto(`${base}/?mock=1`,{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);
await page.locator('#buddyCharacter img').evaluate(img=>Promise.race([img.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,20000))]));
const opened=Date.now();await page.locator('#changeBuddy').click();
const openMs=Date.now()-opened;
await page.waitForTimeout(500);
const start=await page.evaluate(()=>performance.now());
await page.mouse.move(500,850);
for(let i=0;i<30;i++){await page.mouse.wheel(0,260);await page.waitForTimeout(40);}
const scroll=await page.evaluate(start=>({ maxTaskMs:Math.max(0,...window.__profileTasks.filter(e=>e.start>=start).map(e=>e.duration)), tasksOver100ms:window.__profileTasks.filter(e=>e.start>=start&&e.duration>100).length, mounted:document.querySelectorAll('#buddyGrid button').length, scrollTop:document.querySelector('#buddyViewport')?.scrollTop||0, cls:window.__profileShifts.reduce((sum,n)=>sum+n,0) }),start);
console.log(label,'chooser',JSON.stringify({openMs,...scroll}));
const movingHero=[];
if(label.startsWith('stage3'))for(let i=0;i<3;i++){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),p=await context.newPage(),cdp=await context.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1638.4*1024/8,uploadThroughput:675*1024/8});
  await p.goto(`${base}/?mock=1`,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>{const img=document.querySelector('#buddyCharacter img');return img?.dataset.kind==='pixel' && img.naturalWidth && img.style.visibility!=='hidden';});
  movingHero.push(await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()))))));await context.close();
}
console.log(label,'moving hero ready',JSON.stringify(movingHero));
const cached=[];
for(let i=0;i<3;i++){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  const warmPage=await context.newPage(),cdp=await context.newCDPSession(warmPage);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1638.4*1024/8,uploadThroughput:675*1024/8});
  await warmPage.addInitScript(()=>{window.__warmLcp=0;new PerformanceObserver(list=>{for(const e of list.getEntries())window.__warmLcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});});
  await warmPage.goto(`${base}/?mock=1`,{waitUntil:'load'});
  await warmPage.evaluate(()=>navigator.serviceWorker.ready);await warmPage.waitForFunction(()=>navigator.serviceWorker.controller);
  await warmPage.reload({waitUntil:'load'});await warmPage.locator('#buddyCharacter img').evaluate(img=>img.decode());await warmPage.waitForTimeout(300);
  cached.push(await warmPage.evaluate(()=>({lcpMs:window.__warmLcp,observedAtMs:performance.now(),controlled:!!navigator.serviceWorker.controller})));await context.close();
}
console.log(label,'cached',JSON.stringify(cached));
const median=key=>[...runs.map(r=>r[key])].sort((a,b)=>a-b)[1];
const summary={label,base,settings:configuration.settings,runs,median:{score:median('score'),lcpMs:median('lcpMs'),fcpMs:median('fcpMs'),cls:median('cls'),tbtMs:median('tbtMs')},chooser:{openMs,...scroll},movingHeroReadyMs:movingHero,cached,cachedMedianLcpMs:[...cached.map(r=>r.lcpMs)].sort((a,b)=>a-b)[1],budget:{lcpMs:2500,maxScrollTaskMs:100}};
await fs.writeFile(path.join(output,`${label}-summary.json`),JSON.stringify(summary,null,2));
console.log('SUMMARY',JSON.stringify(summary));
await browser.close();

if((label==='final'||label.endsWith('-final')) && (summary.median.lcpMs>=2500 || scroll.tasksOver100ms>0 || scroll.scrollTop<=0 || summary.median.cls!==0 || runs.some(r=>r.warnings.length)))throw Error('Performance budget failed or incomplete profile');
