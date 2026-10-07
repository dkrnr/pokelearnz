/** Explicit local benchmark: exactly 10 synthetic questions per Groq model; no retries,
 * OpenRouter, app cache, hosted quota changes or raw provider diagnostics. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createGroq} from '../netlify/lib/providers/groq.mjs';
import {systemPrompt,safeOutput} from '../netlify/lib/child-safety.mjs';
import {cacheAnswer} from '../netlify/lib/answer-cache.mjs';
const questions=[
 ['What is a quasar?',[/galax/i,/core|center|centre/i,/gas|black hole/i]],
 ['Why are leaves green?',[/reflect|bounce/i,/green/i]],
 ['Why does the Moon seem to change shape?',[/sun/i,/lit|light/i]],
 ['What causes ocean tides?',[/moon/i,/pull|gravity/i]],
 ['How does a rainbow form?',[/light|sun/i,/drop|rain|water/i,/split|bend|color|colour/i]],
 ['Why do we have seasons?',[/tilt|lean/i,/earth/i]],
 ['Why does ice float on water?',[/less dense|less packed|more space|weighs less|lighter/i]],
 ['How do plants make food?',[/sun|light/i,/water/i]],
 ['Why does thunder come after lightning?',[/sound/i,/light/i,/slow|fast/i]],
 ['What is a black hole?',[/pull|gravity/i,/light/i,/escape|get out/i]]
];
if(!process.env.GROQ_API_KEY)throw Error('GROQ_KEY_NOT_CONFIGURED');
const models=['openai/gpt-oss-120b','openai/gpt-oss-20b'];
const prompt=systemPrompt({name:'pikachu'});
const report={checkedAt:new Date().toISOString(),synthetic:true,provider:'groq',requests:20,retries:0,timeoutMs:4000,pacingMs:7000,promptHash:createHash('sha256').update(prompt).digest('hex'),prompt,models,results:[]};
let limits={};
const provider=createGroq({fetcher:async(url,options)=>{const r=await fetch(url,options);limits={};for(const name of ['x-ratelimit-limit-requests','x-ratelimit-limit-tokens','x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens']){const value=r.headers.get(name);if(/^\d+$/.test(value||''))limits[name]=Number(value);}return r;}});
for(const [question,facts] of questions)for(const model of models){
 const began=performance.now();let row={question,model};
 try{
  const result=await provider.complete({model,system:prompt,question,signal:AbortSignal.timeout(4000)});
  row={...row,answer:result.answer,outputPass:safeOutput(result.answer),factRubricPass:facts.every(re=>re.test(result.answer)),cacheEligible:cacheAnswer(result.answer)};
 }catch(error){row.error=/^[A-Z_]+$/.test(error.code||'')?error.code:'REQUEST_FAILED';}
 row.latencyMs=Math.round(performance.now()-began);row.limits=limits;report.results.push(row);console.log(JSON.stringify(row));
 if(report.results.length<20)await new Promise(resolve=>setTimeout(resolve,Math.max(0,7000-(performance.now()-began))));
}
report.summary=models.map(model=>{const rows=report.results.filter(r=>r.model===model),times=rows.filter(r=>r.answer).map(r=>r.latencyMs).sort((a,b)=>a-b);return {model,answers:rows.filter(r=>r.answer).length,outputPass:rows.filter(r=>r.outputPass).length,factRubricPass:rows.filter(r=>r.factRubricPass).length,cacheEligible:rows.filter(r=>r.cacheEligible).length,medianLatencyMs:times.length?(times[Math.floor((times.length-1)/2)]+times[Math.floor(times.length/2)])/2:null};});
const file=process.env.GROQ_REPORT||'qa/artifacts/stage7-groq.json';await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,report:file}));
if(report.results.some(row=>row.error))process.exitCode=1;
