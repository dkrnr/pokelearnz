import {guard,readJson,brainReply,ApiError,failure,log} from '../lib/common.mjs';
import {parseQuestion,inputDecision,safeOutput,outputHasRisk,systemPrompt,lines} from '../lib/child-safety.mjs';
import {modelTimeoutMs,brainDeadlineMs} from '../lib/models.mjs';
import {createProvider} from '../lib/providers/index.mjs';
import {authoredAnswer,answerBank} from '../lib/answer-bank.mjs';
import {reserveAttempt} from '../lib/quota.mjs';
export const config={path:['/api/chat','/.netlify/functions/chat'],rateLimit:{windowLimit:10,windowSize:60,aggregateBy:['ip','domain']}};
export function createChat({fetcher=fetch,provider,reserve=reserveAttempt,timeoutMs=modelTimeoutMs,deadlineMs=brainDeadlineMs}={}){
 return async(request,context={})=>{
  const began=performance.now();let used='none';
  try{
   guard(request);const {question,buddy}=parseQuestion(await readJson(request));
   const decision=inputDecision(question);if(decision){log(decision.code,performance.now()-began);return brainReply(decision.content,decision.code);}
   const authored=()=>brainReply(authoredAnswer(question),'OK',{source:'authored',model:'none'});
   if(/^(1|true|yes)$/i.test(process.env.DEMO_MODE||''))return authored();
   const brain=provider||createProvider({fetcher});
   if(!brain.configured()){
    if(answerBank.some(item=>item.match.test(question)))return authored();
    throw new ApiError('RESTING');
   }
   const deadline=AbortSignal.timeout(deadlineMs);let last='RESTING';
   for(const model of brain.models())for(let attempt=0;attempt<2;attempt++){
    if(request.signal.aborted)throw new ApiError('CANCELLED',499);
    if(deadline.aborted)break;
    await reserve(request,context);used=model;const started=performance.now();
    const signal=AbortSignal.any([request.signal,deadline,AbortSignal.timeout(timeoutMs)]);
    try{
     const result=await brain.complete({model,system:systemPrompt(buddy),question,signal}),text=result.text;
     if(!safeOutput(text)){
      if(outputHasRisk(text)){log('OUTPUT_BLOCKED',performance.now()-started,model);return brainReply(lines.grownup,'TRUSTED_GROWNUP');}
      // Reading/format misses retry within the same six-attempt budget; never show raw text.
      log('OUTPUT_FORMAT',performance.now()-started,model);continue;
     }
     log('OK',performance.now()-started,model);return brainReply(text.trim(),'OK',{source:'ai',model});
    }catch(error){
     if(request.signal.aborted)throw new ApiError('CANCELLED',499);
     last=error instanceof ApiError?error.code:signal.aborted?'PROVIDER_TIMEOUT':'OFFLINE';
     log(last,performance.now()-started,model);
     if(['PROVIDER_AUTH','PROVIDER_CREDIT'].includes(last))return authored();
     if(deadline.aborted)break;
    }
   }
   log('FALLBACK',performance.now()-began,used);
   return authored();
  }catch(error){log(error instanceof ApiError?error.code:'RESTING',performance.now()-began,used);return failure(error);}
 };
}
export default createChat();
