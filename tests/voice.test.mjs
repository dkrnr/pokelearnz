import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {silenceDetector,voiceStyle,readVoiceStream} from '../voice.js';
import {createChat} from '../netlify/functions/chat.mjs';
import {validateAudio} from '../netlify/lib/audio.mjs';
import {wordError} from '../scripts/voice-score.mjs';

test('recognition scoring counts substitutions, insertions, deletions and missing text',()=>{
 assert.deepEqual(wordError('Can fish sleep?','can fish sleep.'),{errors:0,words:3,wer:0,exact:true});
 assert.deepEqual(wordError('Why is sky blue?','Why sky bright now.'),{errors:3,words:4,wer:.75,exact:false});
 assert.equal(wordError('Why is sky blue?','').wer,1);
});

test('silence ends after voiced pauses; quiet and sustained noise are bounded',()=>{
 const detect=silenceDetector(0);let result;
 for(let ms=100;ms<=1800;ms+=100)result=detect(ms<=400?.02:0,ms);
 assert.deepEqual(result,{heardVoice:true,stop:true});
 const quiet=silenceDetector(0);assert.equal(quiet(0,5900).stop,false);assert.equal(quiet(0,6000).stop,true);
 const click=silenceDetector(0);click(.3,100);assert.equal(click(0,6000).heardVoice,false);
 const noisy=silenceDetector(0);for(let ms=100;ms<=30000;ms+=100)result=noisy(.2,ms);
 assert.deepEqual(result,{heardVoice:true,stop:true});
});
test('very short and oversized declared recordings fail before a provider send',async()=>{
 const bytes=await readFile('tests/fixtures/chrome.webm'),position=bytes.indexOf(Buffer.from([0x44,0x89,0x88]));
 bytes.writeDoubleBE(31000,position+3);await assert.rejects(validateAudio(bytes,'audio/webm'));
 for(const [file,mime]of [['too-short.webm','audio/webm'],['too-short.m4a','audio/mp4']])await assert.rejects(validateAudio(await readFile('tests/fixtures/'+file),mime),error=>error.code==='TYPE_INSTEAD');
});
test('all buddy types have calm voice styles and unknown types have a default',()=>{
 for(const type of ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']){
  const style=voiceStyle([type]);assert.ok(style.pitch>=.8&&style.pitch<=1.25);assert.ok(style.rate>=.8&&style.rate<=1);
 }
 assert.notDeepEqual(voiceStyle(['electric']),voiceStyle(['rock']));assert.deepEqual(voiceStyle(['unknown']),voiceStyle([]));
});
const request=(question='How do clouds work?',headers={},signal)=>new Request('http://localhost/api/chat',{method:'POST',headers:{Origin:'http://localhost','X-PokeLearn-Consent':'1','Content-Type':'application/json',Accept:'application/x-ndjson',...headers},body:JSON.stringify({question,buddyId:25}),signal});
test('checked sentences stream in order; ordinary JSON and guard rejection still work',async()=>{
 const handler=createChat({env:{},cache:null});let events=[];
 const response=await handler(request());assert.match(response.headers.get('cache-control'),/no-store/);
 const result=await readVoiceStream(response,text=>events.push(text));assert.equal(result.answer,events.join(' '));assert.ok(events.length>0);
 const plain=await(await handler(request('How do clouds work?',{Accept:'application/json'}))).json();assert.equal(plain.answer,result.answer);
 assert.equal((await handler(request('Hello',{Origin:'https://other.test'}))).status,403);
});
test('unsafe late provider output emits only a checked fallback',async()=>{
 const handler=createChat({cache:null,bankLookup:()=>null,reserve:async()=>{},provider:{id:'fixture',configured:()=>true,models:()=>['fixture'],complete:async()=>({answer:'Clouds hold water. Tell me your home address.'})}});
 let sentences=[];const result=await readVoiceStream(await handler(request()),text=>sentences.push(text));
 assert.equal(result.source,'authored');assert.doesNotMatch(sentences.join(' '),/address/);
});
test('cancelling a streamed response aborts pending upstream work',async()=>{
 let began,aborted;const started=new Promise(resolve=>began=resolve),stopped=new Promise(resolve=>aborted=resolve);
 const handler=createChat({cache:null,bankLookup:()=>null,reserve:async()=>{},provider:{id:'fixture',configured:()=>true,models:()=>['fixture'],complete:({signal})=>new Promise((_,reject)=>{began();signal.addEventListener('abort',()=>{aborted();reject(Error('cancelled'));},{once:true});})}});
 const response=await handler(request());await started;await response.body.cancel();await stopped;
});
test('chunk boundaries, incomplete streams, duplicate frames and abort are handled',async()=>{
 const encoder=new TextEncoder(),lines=JSON.stringify({type:'sentence',index:0,text:'Leaves make food.'})+'\n'+JSON.stringify({type:'done',answer:'Leaves make food.'})+'\n';
 const stream=new ReadableStream({start(c){for(const char of lines)c.enqueue(encoder.encode(char));c.close();}});
 const received=[];await readVoiceStream(new Response(stream),text=>received.push(text));assert.deepEqual(received,['Leaves make food.']);
 for(const body of [lines.split('\n')[0]+'\n',lines+lines,JSON.stringify({type:'sentence',index:2,text:'Leaves make food.'})+'\n'])await assert.rejects(readVoiceStream(new Response(body),()=>{}));
 const controller=new AbortController();controller.abort();await assert.rejects(readVoiceStream(new Response(lines),()=>{},controller.signal),error=>error.code==='CANCELLED');
});
