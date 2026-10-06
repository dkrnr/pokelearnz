/** Opt-in-by-local-key-presence synthetic smoke. Never print bodies, transcripts, keys or raw errors. */
import fs from 'node:fs/promises';
const base=process.env.POKELEARN_TEST_URL||'http://localhost:8888';const url=new URL(base);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Smoke is limited to a local function server.');
const chat=!!process.env.OPENROUTER_KEY,voice=!!process.env.VALSEA_KEY;
if(!chat&&!voice){console.log('SKIP live providers: no local keys present.');process.exit(0);}
let health;try{health=await fetch(base+'/api/health',{signal:AbortSignal.timeout(5000)}).then(r=>r.json());}catch{console.log('SMOKE_FAILED: local function server is unavailable. Start netlify dev first.');process.exit(1);}
const headers={Origin:url.origin,'X-PokeLearn-Consent':'1'};let failed=false;
async function check(path,body,type){
 try{const response=await fetch(base+'/api/'+path,{method:'POST',headers:{...headers,...(type?{'Content-Type':type}:{})},body,signal:AbortSignal.timeout(55000)});const result=await response.json();const pass=(response.ok&&result.code==='OK')||(path==='transcribe'&&result.reason==='NO_SPEECH');console.log(JSON.stringify({check:path,status:response.status,code:result.code||'INVALID_RESPONSE',...(result.reason?{reason:result.reason}:{}),pass}));if(!pass)failed=true;}
 catch{console.log(JSON.stringify({check:path,code:'SMOKE_FAILED'}));failed=true;}
}
if(chat&&health.openrouter)await check('chat',JSON.stringify({question:'Why do leaves need light?',buddyId:25}),'application/json');else console.log('SKIP chat: local/function key is absent.');
if(voice&&health.valsea)for(const [name,mime] of [['chrome.webm','audio/webm'],['safari.m4a','audio/mp4']]){
 const form=new FormData();form.append('file',new Blob([await fs.readFile(new URL('../tests/fixtures/'+name,import.meta.url))],{type:mime}),name);form.append('model','valsea-transcribe');form.append('language','english');await check('transcribe',form);
}else console.log('SKIP voice: local/function key is absent.');
// Pure tones may produce empty transcripts. TYPE_INSTEAD proves fallback, not live recognition quality.
if(failed)process.exitCode=1;
