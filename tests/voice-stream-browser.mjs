/** Deterministic stream and speech events, never a claim of audible device output. */
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.POKELEARN_TEST_URL||'http://127.0.0.1:4178',browser=await chromium.launch();
try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});
 await page.addInitScript(()=>{
  localStorage.setItem('pokelearn_voice_v3',JSON.stringify({consent:true}));
  window.__speechEvents=[];window.__speechTimers=[];window.__streamDone=false;window.__cancelCount=0;window.__nativeLocalVoices=speechSynthesis.getVoices().filter(v=>v.localService).length;
  speechSynthesis.getVoices=()=>window.__noVoice?[]:[{localService:true,lang:'en-US',name:'Fixture'}];
  window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
  speechSynthesis.resume=()=>{};
  speechSynthesis.cancel=()=>{window.__cancelCount++;window.__speechTimers.forEach(clearTimeout);window.__speechTimers=[];};
  speechSynthesis.speak=utterance=>{
   window.__speechEvents.push({text:utterance.text,pitch:utterance.pitch,rate:utterance.rate,beforeDone:!window.__streamDone});
   if(window.__speechError){setTimeout(()=>utterance.onerror?.(),10);return;}
   window.__speechTimers.push(setTimeout(()=>utterance.onstart?.(),20),setTimeout(()=>utterance.onboundary?.({name:'word',charIndex:0}),25),setTimeout(()=>utterance.onend?.(),160));
  };
  navigator.mediaDevices.getUserMedia=async()=>{
   const ctx=new AudioContext(),output=ctx.createMediaStreamDestination(),tone=ctx.createOscillator(),gain=ctx.createGain();
   gain.gain.value=window.__silentMic?0:.1;tone.connect(gain).connect(output);tone.start();await ctx.resume();
   for(const track of output.stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{stop();ctx.close().catch(()=>{});};}
   return output.stream;
  };
  const nativeFetch=window.fetch;
  window.fetch=async(url,options)=>{
   if(!String(url).endsWith('/.netlify/functions/chat'))return nativeFetch(url,options);
   window.__streamDone=false;const encoder=new TextEncoder(),answer='Leaves use light to make food. Roots take in water.';
   const body=new ReadableStream({start(controller){
    let closed=false;const timers=[];
    const send=event=>{if(!closed)controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));};
    timers.push(setTimeout(()=>send({type:'sentence',index:0,text:'Leaves use light to make food.',source:'authored'}),180));
    timers.push(setTimeout(()=>{if(closed)return;send({type:'sentence',index:1,text:'Roots take in water.',source:'authored'});send({type:'done',answer,code:'OK',source:'authored',model:'none'});window.__streamDone=true;closed=true;controller.close();},800));
    options.signal.addEventListener('abort',()=>{timers.forEach(clearTimeout);if(!closed){closed=true;controller.error(new DOMException('Aborted','AbortError'));}},{once:true});
   }});
   return new Response(body,{headers:{'Content-Type':'application/x-ndjson'}});
  };
 });
 await page.goto(base);await page.waitForFunction(()=>window.__STUDIO_QA__?.snapshot().catalog===1025);
 const ask=async()=>{await page.locator('#keyboardButton').click();await page.locator('#questionInput').fill('How do leaves grow?');await page.locator('#questionForm button').click();};
 await ask();await page.waitForFunction(()=>window.__speechEvents.length===1);
 assert.equal(await page.locator('#voiceState').innerText(),'Speaking');
 assert.equal(await page.locator('#captionText').innerText(),'Leaves use light to make food.');
 assert.equal(await page.evaluate(()=>window.__speechEvents[0].beforeDone),true);
 await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().firstSpokenWordMs!==null);
 const timing=await page.evaluate(()=>({firstSpeechStartMs:window.__STUDIO_QA__.snapshot().firstSpeechStartMs,firstSpokenWordMs:window.__STUDIO_QA__.snapshot().firstSpokenWordMs,nativeLocalVoices:window.__nativeLocalVoices}));
 assert.ok(timing.firstSpokenWordMs<700,'First sentence speaks before the 800ms stream completion');
 await page.waitForFunction(()=>window.__speechEvents.length===2&&window.__STUDIO_QA__.snapshot().answered);
 assert.deepEqual(await page.evaluate(()=>window.__speechEvents.map(e=>e.text)),['Leaves use light to make food.','Roots take in water.']);
 assert.deepEqual(await page.evaluate(()=>({pitch:window.__speechEvents[0].pitch,rate:window.__speechEvents[0].rate})),{pitch:1.2,rate:.96});
 await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().state==='idle');
 await page.evaluate(()=>{window.__speechEvents=[];});await ask();await page.waitForFunction(()=>window.__speechEvents.length===1);
 const cancelled=await page.evaluate(()=>window.__cancelCount);await page.locator('#interruptVoice').click();
 await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().state==='listening');
 assert.equal(await page.locator('#voiceState').innerText(),'Listening');assert.ok(await page.evaluate(()=>window.__cancelCount)>cancelled);
 await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>window.__speechEvents.length),1,'Old stream cannot resume speech after interrupt');
 await page.locator('#changeBuddy').click();await page.locator('#buddyDialog [data-close]').click();
 await page.evaluate(()=>{window.__noVoice=true;window.__speechEvents=[];});await ask();await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().answered);
 assert.equal(await page.evaluate(()=>window.__speechEvents.length),0);assert.equal(await page.locator('#captionText').innerText(),'Leaves use light to make food. Roots take in water.');
 await page.evaluate(()=>{window.__noVoice=false;window.__speechError=true;});await ask();await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().answered);
 assert.equal(await page.locator('#captionText').innerText(),'Leaves use light to make food. Roots take in water.');
 // Quiet input is rejected on-device, without a transcription upload.
 let uploads=0;await page.route('**/.netlify/functions/transcribe',async route=>{uploads++;await route.fulfill({status:422,json:{code:'TYPE_INSTEAD'}});});
 await page.evaluate(()=>{window.__silentMic=true;});await page.locator('#micButton').click(); // stop caption-only speaking
 await page.locator('#micButton').click();await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().state==='listening');
 await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().state==='error',{}, {timeout:8000});
 assert.equal(uploads,0);assert.match(await page.locator('#captionText').innerText(),/typing/);assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).recording,false);
 if(process.env.VOICE_BROWSER_REPORT)await writeFile(process.env.VOICE_BROWSER_REPORT,JSON.stringify({checkedAt:new Date().toISOString(),fixture:true,notice:'Mock stream and speech events: no audible output or real device first-word latency verified.',firstSentenceDelayMs:180,streamDoneDelayMs:800,...timing,verified:['sentence order','first sentence before stream done','buddy pitch/rate','interrupt cancels old speech and stream, starts listening','captions without voices and on speech error','silent microphone skips upload']},null,2)+'\n');
 console.log('PASS sentence stream, first-word fixture timing, buddy voice, interrupt → listening, no-voice/error captions and zero-upload silence');
}finally{await browser.close();}
