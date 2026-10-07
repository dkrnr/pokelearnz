import assert from 'node:assert/strict';import {chromium} from 'playwright';import {createRequire} from 'node:module';
const base=process.env.POKELEARN_TEST_URL||'http://127.0.0.1:4178';const browser=await chromium.launch();const require=createRequire(import.meta.url);
try{
 const titles=new Set(),descriptions=new Set();
 for(const slug of ['about','parents','privacy','contact']){
  const page=await browser.newPage({javaScriptEnabled:false});const res=await page.goto(base+'/'+slug);assert.equal(res.status(),200);titles.add(await page.title());descriptions.add(await page.locator('meta[name=description]').getAttribute('content'));assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://pokelearnz.netlify.app/'+slug);assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),'https://pokelearnz.netlify.app/assets/social-card.png');assert.match(await page.locator('main').innerText(),/university demo/i);await page.close();
 }
 assert.equal(titles.size,4);assert.equal(descriptions.size,4);
 const plain=await browser.newPage({javaScriptEnabled:false});await plain.goto(base);assert.match(await plain.locator('noscript').innerText(),/six finite activities/);await plain.close();
 const page=await browser.newPage();await page.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.effectiveDirective));});await page.goto(base+'/?demo=1');await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);
 assert.equal(await page.locator('#demoTag').isVisible(),false);
 const response=page.waitForResponse(r=>r.url().endsWith('/chat'));await page.locator('#keyboardButton').click();await page.locator('#questionInput').fill('What is a quasar?');await page.locator('#questionForm button').click();const [a,b,c]=(await page.locator('#gateQuestion').innerText()).match(/\d+/g).map(Number);await page.locator('#gateAnswer').fill(String(a*b+c));await page.locator('#unlockSetup').click();await page.locator('#onlineConsent').check();const res=await response;const body=await res.json();assert.equal(res.request().postDataJSON().demo,true);assert.equal(body.lastError,'DEMO_MODE');assert.equal(body.model,'none');await page.locator('#grownupOpen').click();assert.equal(await page.locator('#demoTag').isVisible(),true);assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
 await page.close();
 for(const slug of ['about','parents','privacy','contact']){const p=await browser.newPage({bypassCSP:true});await p.goto(base+'/'+slug);await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const issues=await p.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>v.id));assert.deepEqual(issues,[],slug);await p.close();}
 console.log('PASS static pages/unique SEO/no-JS, gated URL demo without a model, JSON-LD CSP and all information-page accessibility');
}finally{await browser.close();}
