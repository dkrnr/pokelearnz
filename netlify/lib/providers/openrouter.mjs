import {providerJson,ApiError} from '../common.mjs';
import {isClassifierOutput} from '../../../answer-contract.js';
import {getModels,getRouting} from '../models.mjs';
/** BrainProvider: id, configured(), models(), complete({model,system,question,signal}).
 * Adapters own credentials, payloads and response parsing, never safety or retries. */
export function createOpenRouter({fetcher=fetch,env=process.env}={}){
 return {
  id:'openrouter',configured:()=>!!env.OPENROUTER_KEY,models:()=>getModels(env),
  async complete({model,system,question,signal}){
   const response=await fetcher('https://openrouter.ai/api/v1/chat/completions',{
    method:'POST',headers:{Authorization:`Bearer ${env.OPENROUTER_KEY}`,'Content-Type':'application/json','X-OpenRouter-Title':'PokeLearn'},signal,
    body:JSON.stringify({model,messages:[{role:'system',content:system+' Return a JSON object with only an answer string. The answer is plain child-facing text.'},{role:'user',content:question}],max_tokens:128,temperature:.2,provider:getRouting(env),reasoning:{effort:'none',exclude:true},response_format:{type:'json_schema',json_schema:{name:'kid_answer',strict:true,schema:{type:'object',properties:{answer:{type:'string'}},required:['answer'],additionalProperties:false}}}})
   });
   const data=await providerJson(response);
   const content=data?.choices?.[0]?.message?.content;
   if(isClassifierOutput(content))throw new ApiError('CLASSIFIER_OUTPUT',502);
   let parsed;try{parsed=JSON.parse(content);}catch{throw new ApiError('INVALID_ANSWER',502);}
   if(!parsed||Array.isArray(parsed)||Object.keys(parsed).length!==1||typeof parsed.answer!=='string')throw new ApiError('INVALID_ANSWER',502);
   return {answer:parsed.answer,model};
  }
 };
}
