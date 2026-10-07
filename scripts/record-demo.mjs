/** Records the real local authored-bank flow. No .env, remote models or microphone.
 * Requires ffmpeg; outputs a short GIF and ignored source WebM/provenance. */
import {chromium} from 'playwright';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import {createServer} from '../server.mjs';
const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const out=new URL('../qa/artifacts/demo-video/',import.meta.url),gif=new URL('../docs/portfolio/demo.gif',import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch();let context,video;const requests=[],chapters=[];
try{
 context=await browser.newContext({viewport:{width:960,height:720},deviceScaleFactor:1,serviceWorkers:'block',recordVideo:{dir:out.pathname,size:{width:960,height:720}}});
 const page=await context.newPage();video=page.video();
 // Save an opt-in demo device setup; the three-minute walkthrough explains the real gate.
 await page.addInitScript(()=>{localStorage.setItem('pokelearn_voice_v3',JSON.stringify({consent:true}));});
 await page.route('https://**',route=>route.abort()); // external pictures fall back to bundled buddy art
 page.on('request',r=>{if(new URL(r.url()).pathname.endsWith('/chat'))requests.push(r.postDataJSON());});
 const hold=async(label,ms)=>{chapters.push({label});await page.waitForTimeout(ms);};
 await page.goto(base+'/?demo=1');await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);
 await hold('Quiet scene',1400);
 await page.locator('#keyboardButton').click();await page.locator('#questionInput').fill('Why are leaves green?');await page.locator('#questionForm button').click();
 await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().answered);
 if((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).lastResult.source!=='authored')throw Error('DEMO_BANK_EXPECTED');
 await hold('Authored science answer and AI note',3500);await page.locator('#micButton').click();
 await page.locator('#changeBuddy').click();await page.locator('#buddySearch').fill('eevee');await hold('Chooser',2000);await page.locator('#buddyGrid button').click();
 await page.locator('#discover-numbers').click();for(let i=0;i<3;i++)await page.locator('#addBlock').click();await page.locator('#checkGroup').click();await hold('Build a number',2500);
 await page.locator('#activityDialog [data-close]').click();await page.locator('#finish').click();await page.locator('#endScreen').waitFor({state:'visible'});await hold('Sleep',2000);
 await page.goto(base+'/parents');await hold('Parent guide',2500);
 if(requests.length!==1||requests[0].demo!==true)throw Error('ONE_AUTHORED_DEMO_REQUEST_EXPECTED');
 await context.close();context=null;
 const file=await video.path();
 const encoded=spawnSync('ffmpeg',['-y','-i',file,'-vf','fps=8,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4','-loop','0',gif.pathname],{encoding:'utf8'});
 if(encoded.status!==0)throw Error('GIF_ENCODING_FAILED');
 await fs.writeFile(new URL('provenance.json',out),JSON.stringify({recordedAt:new Date().toISOString(),local:true,authoredBank:true,modelCalls:0,audioUploads:0,viewport:{width:960,height:720},chapters,chatQuestions:requests.map(r=>r.question),gif:'docs/portfolio/demo.gif'},null,2)+'\n');
 console.log('Recorded docs/portfolio/demo.gif: local authored bank, chooser, activity, Sleep and parents; no model/audio calls.');
}finally{if(context)await context.close();await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
