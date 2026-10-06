import {guard,readJson,providerJson,brainReply,ApiError,failure,log} from '../lib/common.mjs';
import {parseQuestion,inputDecision,safeOutput,systemPrompt,lines} from '../lib/child-safety.mjs';
import {models,modelTimeoutMs,brainDeadlineMs,routing} from '../lib/models.mjs';
import {reserveAttempt} from '../lib/quota.mjs';
export const config={path:['/api/chat','/.netlify/functions/chat'],rateLimit:{windowLimit:10,windowSize:60,aggregateBy:['ip','domain']}};
export function createChat({fetcher=fetch,reserve=reserveAttempt,timeoutMs=modelTimeoutMs,deadlineMs=brainDeadlineMs}={}){
 return async(request,context={})=>{
  const began=performance.now();let used='none';
  try{
   guard(request);const {question,buddy}=parseQuestion(await readJson(request));
   const decision=inputDecision(question);if(decision){log(decision.code,performance.now()-began);return brainReply(decision.content,decision.code);}
   if(!process.env.OPENROUTER_KEY)throw new ApiError('RESTING');
   const deadline=AbortSignal.timeout(deadlineMs);let last='RESTING';
   for(const model of models)for(let attempt=0;attempt<2;attempt++){
    if(request.signal.aborted)throw new ApiError('CANCELLED',499);
    if(deadline.aborted)break;
    await reserve(request,context);used=model;const started=performance.now();
    const signal=AbortSignal.any([request.signal,deadline,AbortSignal.timeout(timeoutMs)]);
    try{
     const response=await fetcher('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENROUTER_KEY}`,'Content-Type':'application/json','X-OpenRouter-Title':'PokeLearn'},signal,body:JSON.stringify({model,messages:[{role:'system',content:systemPrompt(buddy)},{role:'user',content:question}],max_tokens:96,temperature:.2,provider:routing})});
     const data=await providerJson(response),text=data?.choices?.[0]?.message?.content;
     if(!safeOutput(text)){log('OUTPUT_BLOCKED',performance.now()-started,model);return brainReply(lines.grownup,'TRUSTED_GROWNUP');}
     log('OK',performance.now()-started,model);return brainReply(text.trim());
    }catch(error){
     if(request.signal.aborted)throw new ApiError('CANCELLED',499);
     last=error instanceof ApiError?error.code:signal.aborted?'PROVIDER_TIMEOUT':'OFFLINE';
     log(last,performance.now()-started,model);
     if(deadline.aborted)break;
    }
   }
   log('FALLBACK',performance.now()-began,used);
   return brainReply(lines.rest,last==='RATE_LIMITED'?'RATE_LIMITED':last==='OFFLINE'?'OFFLINE':'RESTING');
  }catch(error){log(error instanceof ApiError?error.code:'RESTING',performance.now()-began,used);return failure(error);}
 };
}
export default createChat();
