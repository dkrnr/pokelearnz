import {readBrowserAnswer} from './browser-answer.mjs';
/** Real local providers only. CI deliberately skips; no keys or provider diagnostics printed. */
import fs from 'node:fs/promises';import {randomBytes} from 'node:crypto';import {chromium} from 'playwright';
import {readAnswer} from '../answer-contract.js';import {questions} from './core-questions.mjs';
if(process.env.CI||!process.env.OPENROUTER_KEY&&!process.env.VALSEA_KEY){console.log('SKIP test:core: CI or no local provider keys.');process.exit(0);}
// Loopback-only development quota, scoped to this process; never change deployed quotas/settings.
process.env.LOCAL_AI_LIMITS='memory';process.env.RATE_LIMIT_SALT ||= randomBytes(32).toString('hex');process.env.AI_IP_PER_MINUTE='30';
const {createServer}=await import('../server.mjs');const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port,headers={Origin:base,'X-PokeLearn-Consent':'1'},results=[];
let browser;
async function send(path,body,mime){const began=performance.now();const response=await fetch(base+'/api/'+path,{method:'POST',headers:{...headers,...(mime?{'Content-Type':mime}:{})},body,signal:AbortSignal.timeout(15500)});return {body:await response.json(),status:response.status,latencyMs:Math.round(performance.now()-began)};}
try{
 if(process.env.OPENROUTER_KEY)for(const {question,facts}of questions){
  let row;try{const result=await send('chat',JSON.stringify({question,buddyId:25}),'application/json'),answer=readAnswer(result.body);
   row={question,...result.body,status:result.status,latencyMs:result.latencyMs,pass:facts.test(answer),graceful:true};
  }catch(error){row={question,pass:false,graceful:false,code:/^[A-Z_]+$/.test(error.code||'')?error.code:'CORE_FAILED'};}
  results.push(row);console.log(JSON.stringify(row));
 }
 const voice=[];
 if(process.env.VALSEA_KEY){
  for(const [file,mime]of [['core-question.webm','audio/webm'],['core-question.m4a','audio/mp4']]){
   const form=new FormData();form.append('file',new Blob([await fs.readFile(new URL('../tests/fixtures/'+file,import.meta.url))],{type:mime}),file);form.append('model','valsea-transcribe');form.append('language','english');
   let row;try{const result=await send('transcribe',form);row={format:mime,status:result.status,code:result.body.code,latencyMs:result.latencyMs,recognized:/axolotl/i.test(result.body.text||''),typeFallback:result.body.code==='TYPE_INSTEAD'};}catch{row={format:mime,code:'VOICE_FAILED',recognized:false};}voice.push(row);console.log(JSON.stringify(row));
  }
  browser=await chromium.launch();const page=await browser.newPage({serviceWorkers:'block'});
  const wav=(await fs.readFile(new URL('../tests/fixtures/core-question.wav',import.meta.url))).toString('base64');
  await page.addInitScript(({wav})=>{
   localStorage.setItem('pokelearn_voice_v3',JSON.stringify({consent:true}));
   navigator.mediaDevices.getUserMedia=async()=>{
    const ctx=new AudioContext(),dest=ctx.createMediaStreamDestination();
    const bytes=Uint8Array.from(atob(wav),v=>v.charCodeAt(0)),buffer=await ctx.decodeAudioData(bytes.buffer),source=ctx.createBufferSource();source.buffer=buffer;source.connect(dest);await ctx.resume();source.start();
    for(const track of dest.stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{stop();ctx.close().catch(()=>{});};}
    return dest.stream;
   };
  },{wav});
  const stages=[];page.on('response',async response=>{if(!/\/.netlify\/functions\/(transcribe|chat)$/.test(new URL(response.url()).pathname))return;try{const data=await readBrowserAnswer(response);stages.push({stage:new URL(response.url()).pathname.split('/').pop(),status:response.status(),code:data.code,source:data.source,model:data.model,lastError:data.lastError});}catch{}});
  await page.goto(base+'/?debug=1');await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);const began=performance.now();await page.locator('#micButton').click();
  await page.waitForFunction(()=>['speaking','error'].includes(window.__STUDIO_QA__.snapshot().state),{}, {timeout:24000});
  await page.waitForTimeout(750);const snapshot=await page.evaluate(()=>window.__STUDIO_QA__.snapshot());
  const nativeVoice={format:'browser MediaRecorder',latencyMs:Math.round(performance.now()-began),state:snapshot.state,answer:await page.locator('#captionText').innerText(),audio:snapshot.audioStatus,localVoices:await page.evaluate(()=>speechSynthesis.getVoices().filter(v=>v.localService).length),stages,pass:snapshot.answered,readAloudVerified:snapshot.audioStatus==='speaking'||snapshot.audioStatus==='finished'};
  voice.push(nativeVoice);console.log(JSON.stringify(nativeVoice));
 }
 const report={checkedAt:new Date().toISOString(),synthetic:true,results,voice};await fs.writeFile(process.env.CORE_REPORT||'docs/redesign/V3-STAGE-5-CORE.json',JSON.stringify(report,null,2)+'\n');
 if(results.some(row=>!row.pass)||voice.some(row=>row.recognized===false||row.pass===false))process.exitCode=1;
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
