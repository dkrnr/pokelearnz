import fs from 'node:fs/promises';import {getModels} from '../netlify/lib/models.mjs';
const response=await fetch('https://openrouter.ai/api/v1/models',{signal:AbortSignal.timeout(15000)});
if(!response.ok)throw Error('Model catalog unavailable (HTTP '+response.status+')');
const data=await response.json();if(!Array.isArray(data.data))throw Error('Invalid model catalog');
const results=getModels().map(id=>{const found=data.data.find(model=>model.id===id);return {id,exists:!!found,free:!!found&&Number(found.pricing?.prompt)===0&&Number(found.pricing?.completion)===0,answerModel:!!found&&!/(?:guardrail|classifier|content safety|moderation model|embedding|reranker)/i.test([found.name,found.description].join(' ')),jsonFormat:!!found?.supported_parameters?.includes('response_format')};});
console.log(JSON.stringify({checkedAt:new Date().toISOString(),models:results},null,2));
if(process.env.MODEL_REPORT)await fs.writeFile(process.env.MODEL_REPORT,JSON.stringify({checkedAt:new Date().toISOString(),models:results},null,2)+'\n');
if(results.some(model=>!model.exists||!model.free||!model.answerModel||!model.jsonFormat))process.exitCode=1;
