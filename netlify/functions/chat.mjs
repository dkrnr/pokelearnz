import {guard,readJson,brainReply,ApiError,failure,log,abortable} from '../lib/common.mjs';
import {parseQuestion,inputDecision,safeOutput,outputHasRisk,systemPrompt,lines} from '../lib/child-safety.mjs';
import {isClassifierOutput} from '../../answer-contract.js';
import {modelTimeoutMs,brainDeadlineMs} from '../lib/models.mjs';
import {createProvider} from '../lib/providers/index.mjs';
import {authoredAnswer,knownAnswer,unknownAnswer} from '../lib/answer-bank.mjs';
import {reserveAttempt} from '../lib/quota.mjs';
export const config={path:['/api/chat','/.netlify/functions/chat'],rateLimit:{windowLimit:10,windowSize:60,aggregateBy:['ip','domain']}};
export function createChat({fetcher=fetch,provider,reserve=reserveAttempt,timeoutMs=modelTimeoutMs,deadlineMs=brainDeadlineMs}={}){
 // Best-effort warm-instance backoff; quotas remain authoritative and fail closed.
 let restUntil=0,restCode,restModel='none';
 return async(request,context={})=>{
  const began=performance.now(),overall=new AbortController();
  const timer=setTimeout(()=>overall.abort(),Math.min(deadlineMs,/^\d+$/.test(request.headers.get('x-pokelearn-budget-ms')||'')?Math.max(1,Number(request.headers.get('x-pokelearn-budget-ms'))):deadlineMs));
  const deadline=AbortSignal.any([request.signal,overall.signal]);let used='none',question;
  const authored=(error=null)=>{
   const answer=authoredAnswer(question),source=answer===unknownAnswer?'fallback':'authored';
   log(error||'OK',performance.now()-began,used,'fallback');
   return brainReply(answer,'OK',{source,model:used,lastError:error});
  };
  try{
   guard(request);const parsed=parseQuestion(await abortable(()=>readJson(request),deadline));question=parsed.question;
   const decision=inputDecision(question);
   log(decision?.code||'OK',performance.now()-began,'none','input');
   if(decision)return brainReply(decision.content,decision.code);
   if(/^(1|true|yes)$/i.test(process.env.DEMO_MODE||''))return authored('DEMO_MODE');
   const brain=provider||createProvider({fetcher});
   if(!brain.configured())return authored('PROVIDER_UNAVAILABLE');
   if(Date.now()<restUntil){used=restModel;return authored(restCode);}
   let last='RESTING';
   for(const model of brain.models())for(let attempt=0;attempt<2;attempt++){
    if(request.signal.aborted)throw new ApiError('CANCELLED',499);
    if(deadline.aborted)return authored('REQUEST_TIMEOUT');
    await abortable(()=>reserve(request,context),deadline);used=model;const started=performance.now();
    const attemptControl=new AbortController(),attemptTimer=setTimeout(()=>attemptControl.abort(),timeoutMs);
    const signal=AbortSignal.any([deadline,attemptControl.signal]);
    try{
     const result=await abortable(()=>brain.complete({model,system:systemPrompt(parsed.buddy),question,signal}),signal),text=result.answer;
     if(isClassifierOutput(text))throw new ApiError('CLASSIFIER_OUTPUT',502);
     if(!safeOutput(text)){
      if(outputHasRisk(text)){log('OUTPUT_BLOCKED',performance.now()-started,model,'answer',502);return brainReply(lines.grownup,'TRUSTED_GROWNUP',{model,lastError:'OUTPUT_BLOCKED'});}
      throw new ApiError('INVALID_ANSWER',502);
     }
     // Known observed factual failure: never explain green leaves as consuming green light.
     if(knownAnswer(question)?.id==='leaves'&&(/\b(?:use|eat|absorb)\b.{0,20}\bgreen light\b/i.test(text)||(/\bgreen\b/i.test(question)&&!/\b(?:reflect|reflects|bounce|bounces)\b/i.test(text))))throw new ApiError('FACT_CHECK_FAILED',502);
     log('OK',performance.now()-started,model,'answer');return brainReply(text.trim(),'OK',{source:'ai',model});
    }catch(error){
     if(request.signal.aborted)throw new ApiError('CANCELLED',499);
     last=signal.aborted?'REQUEST_TIMEOUT':error instanceof ApiError?error.code:'OFFLINE';
     log(last,performance.now()-started,model,'answer',error instanceof ApiError?error.status:502);
     if(['DAILY_LIMIT','RATE_LIMITED'].includes(last)){
      restCode=last;restModel=model;restUntil=last==='DAILY_LIMIT'?Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth(),new Date().getUTCDate()+1):Date.now()+30000;
      return authored(last); // One failed free-limit request, no quota-burning model cascade.
     }
     if(['PROVIDER_AUTH','PROVIDER_CREDIT','CLASSIFIER_OUTPUT','FACT_CHECK_FAILED'].includes(last))return authored(last);
     if(deadline.aborted)return authored('REQUEST_TIMEOUT');
    }finally{clearTimeout(attemptTimer);}
   }
   return authored(last);
  }catch(error){
   const code=request.signal.aborted?'CANCELLED':overall.signal.aborted?'REQUEST_TIMEOUT':error instanceof ApiError?error.code:'RESTING';
   if(code==='REQUEST_TIMEOUT'&&question)return authored(code);
   log(code,performance.now()-began,used,'answer',error?.status||503);return failure(new ApiError(code,error?.status||503));
  }finally{clearTimeout(timer);}
 };
}
export default createChat();
