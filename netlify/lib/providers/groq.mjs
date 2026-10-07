import {providerJson,ApiError} from '../common.mjs';
import {isClassifierOutput} from '../../../answer-contract.js';
export const groqDefaults=Object.freeze(['openai/gpt-oss-120b','openai/gpt-oss-20b']);
export function getGroqModels(env=process.env){
 const list=(env.GROQ_MODELS||groqDefaults.join(',')).split(',').map(s=>s.trim());
 if(!list.length||list.length>3||new Set(list).size!==list.length||list.some(id=>!/^[-a-zA-Z0-9_./]{3,100}$/.test(id)||/guard|safety|classif|moderat|whisper|tts|compound|embed/i.test(id)))throw new ApiError('ANSWER_MODEL_REQUIRED');
 return list;
}
export function createGroq({fetcher=fetch,env=process.env}={}){
 return {id:'groq',configured:()=>!!env.GROQ_API_KEY,models:()=>getGroqModels(env),async complete({model,system,question,signal}){
  const response=await fetcher('https://api.groq.com/openai/v1/chat/completions',{method:'POST',signal,headers:{Authorization:`Bearer ${env.GROQ_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:system+' Return JSON with only an answer string.'},{role:'user',content:question}],...(model.startsWith('openai/gpt-oss-')?{max_completion_tokens:512,reasoning_effort:'low',response_format:{type:'json_schema',json_schema:{name:'kid_answer',strict:true,schema:{type:'object',properties:{answer:{type:'string'}},required:['answer'],additionalProperties:false}}}}:{max_tokens:128,response_format:{type:'json_object'}}),temperature:.2})});
  const data=await providerJson(response),content=data?.choices?.[0]?.message?.content;
  if(isClassifierOutput(content))throw new ApiError('CLASSIFIER_OUTPUT',502);
  let parsed;try{parsed=JSON.parse(content);}catch{throw new ApiError('INVALID_ANSWER',502);}
  if(!parsed||Array.isArray(parsed)||Object.keys(parsed).length!==1||typeof parsed.answer!=='string')throw new ApiError('INVALID_ANSWER',502);
  return {answer:parsed.answer,model};
 }};
}
