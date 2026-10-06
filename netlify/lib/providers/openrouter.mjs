import {providerJson} from '../common.mjs';
import {getModels,getRouting} from '../models.mjs';
/** BrainProvider: id, configured(), models(), complete({model,system,question,signal}).
 * Adapters own credentials, payloads and response parsing, never safety or retries. */
export function createOpenRouter({fetcher=fetch,env=process.env}={}){
 return {
  id:'openrouter',configured:()=>!!env.OPENROUTER_KEY,models:()=>getModels(env),
  async complete({model,system,question,signal}){
   const response=await fetcher('https://openrouter.ai/api/v1/chat/completions',{
    method:'POST',headers:{Authorization:`Bearer ${env.OPENROUTER_KEY}`,'Content-Type':'application/json','X-OpenRouter-Title':'PokeLearn'},signal,
    body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content:question}],max_tokens:128,temperature:.2,provider:getRouting(env),reasoning:{effort:'none',exclude:true}})
   });
   const data=await providerJson(response);
   return {text:data?.choices?.[0]?.message?.content,model};
  }
 };
}
