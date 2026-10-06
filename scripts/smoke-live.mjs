/** Local-key-only synthetic smoke. The ten-question option prints only authored test questions/answers. Never audio, keys or raw diagnostics. */
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
if(chat&&health.openrouter){
 if(process.env.SMOKE_TEN==='1'){
  const questions=JSON.parse(await fs.readFile(new URL('../tests/fixtures/child-questions.json',import.meta.url),'utf8')),results=[];
  for(const question of questions){
   const began=performance.now();let row;
   try{
    const response=await fetch(base+'/api/chat',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({question,buddyId:25}),signal:AbortSignal.timeout(55000)}),body=await response.json();
    row={question,status:response.status,code:body.code,source:body.source||'safety',model:body.model||'none',latencyMs:Math.round(performance.now()-began),answer:body.choices?.[0]?.message?.content||null};
    if(row.source!=='ai'||row.code!=='OK')failed=true;
   }catch{row={question,code:'SMOKE_FAILED',latencyMs:Math.round(performance.now()-began)};failed=true;}
   results.push(row);console.log(JSON.stringify(row));await new Promise(resolve=>setTimeout(resolve,3500));
  }
  if(process.env.SMOKE_REPORT)await fs.writeFile(process.env.SMOKE_REPORT,JSON.stringify({checkedAt:new Date().toISOString(),synthetic:true,results},null,2)+'\n');
 }else await check('chat',JSON.stringify({question:'Why do leaves need light?',buddyId:25}),'application/json');
}else console.log('SKIP chat: local/function key is absent.');
if(process.env.SMOKE_VOICE!=='0'&&voice&&health.valsea)for(const [name,mime] of [['chrome.webm','audio/webm'],['safari.m4a','audio/mp4']]){
 const form=new FormData();form.append('file',new Blob([await fs.readFile(new URL('../tests/fixtures/'+name,import.meta.url))],{type:mime}),name);form.append('model','valsea-transcribe');form.append('language','english');await check('transcribe',form);
}else console.log('SKIP voice: local/function key is absent.');
// Pure tones may produce empty transcripts. TYPE_INSTEAD proves fallback, not live recognition quality.
if(failed)process.exitCode=1;
