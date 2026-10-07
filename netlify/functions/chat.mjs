import {guard,readJson,brainReply,ApiError,failure,log,abortable} from '../lib/common.mjs';
import {parseQuestion,inputDecision,safeOutput,outputHasRisk,outputRiskRules,systemPrompt,strictRetryPrompt} from '../lib/child-safety.mjs';
import {isClassifierOutput} from '../../answer-contract.js';
import {modelTimeoutMs,brainDeadlineMs} from '../lib/models.mjs';
import {createAnswerCache} from '../lib/answer-cache.mjs';
import {createProviders} from '../lib/providers/index.mjs';
import {authoredAnswer,knownAnswer,unknownAnswer} from '../lib/answer-bank.mjs';
import {smallTalk} from '../lib/small-talk.mjs';
import {readAnswer} from '../../answer-contract.js';
import {reserveAttempt} from '../lib/quota.mjs';
export const config={path:['/api/chat','/.netlify/functions/chat'],rateLimit:{windowLimit:10,windowSize:60,aggregateBy:['ip','domain']}};
function createJsonChat({fetcher=fetch,provider,reserve=reserveAttempt,timeoutMs=modelTimeoutMs,deadlineMs=brainDeadlineMs,env=process.env,cache=createAnswerCache({env}),bankLookup=knownAnswer}={}){
 // Best-effort warm-instance backoff; quotas remain authoritative and fail closed.
 let restUntil=0,restCode,restModel='none';
 return async(request,context={})=>{
  const began=performance.now(),overall=new AbortController();
  const timer=setTimeout(()=>overall.abort(),Math.min(deadlineMs,/^\d+$/.test(request.headers.get('x-pokelearn-budget-ms')||'')?Math.max(1,Number(request.headers.get('x-pokelearn-budget-ms'))):deadlineMs));
  const deadline=AbortSignal.any([request.signal,overall.signal]);let used='none',question,safetyRecovery=false;
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
   const talk=smallTalk(question,parsed.buddy);
   if(talk)return brainReply(talk.answer,'OK',{source:'authored',model:'none',lastError:null,kind:talk.kind});
   if(parsed.demo||/^(1|true|yes)$/i.test(env.DEMO_MODE||''))return authored('DEMO_MODE');
   const cached=await abortable(()=>cache?.get(question,parsed.buddy,request),deadline);
   if(cached)return brainReply(cached.answer,'OK',{source:'cache',model:cached.model,provider:cached.provider});
   const bank=bankLookup(question);if(bank&&safeOutput(bank.text))return brainReply(bank.text,'OK',{source:'authored',model:'none',lastError:null});
   const brains=provider?[provider]:createProviders({fetcher,env});
   if(!brains.length)return authored('PROVIDER_UNAVAILABLE');

   let last='PROVIDER_UNAVAILABLE',openrouterResetAt=0;
   for(const brain of brains){
   if(!brain.configured())continue;
   const providerId=brain.id||'openrouter';
   if(providerId==='openrouter'&&Date.now()<restUntil){last=restCode;used=restModel;openrouterResetAt=restCode==='DAILY_LIMIT'?restUntil:0;continue;}
   if(providerId==='openrouter'){openrouterResetAt=await abortable(()=>cache?.status(request)||0,deadline);if(openrouterResetAt){last='DAILY_LIMIT';continue;}}
   providerModels: for(const model of brain.models())for(let attempt=0;attempt<2;attempt++){
    if(request.signal.aborted)throw new ApiError('CANCELLED',499);
    if(deadline.aborted)return authored('REQUEST_TIMEOUT');
    await abortable(()=>reserve(request,context),deadline);used=model;const started=performance.now();
    const attemptControl=new AbortController(),attemptTimer=setTimeout(()=>attemptControl.abort(),timeoutMs);
    const signal=AbortSignal.any([deadline,attemptControl.signal]);
    try{
     const result=await abortable(()=>brain.complete({model,system:systemPrompt(parsed.buddy)+(safetyRecovery?strictRetryPrompt:''),question,signal}),signal),text=result.answer;
     if(isClassifierOutput(text))throw new ApiError('CLASSIFIER_OUTPUT',502);
     if(!safeOutput(text)){
      if(outputHasRisk(text)){for(const rule of outputRiskRules(text))log('OUTPUT_RULE_'+rule,performance.now()-started,model,'output',502);throw new ApiError('OUTPUT_BLOCKED',502);}
      throw new ApiError('INVALID_ANSWER',502);
     }
     // Known observed factual failure: never explain green leaves as consuming green light.
     if(knownAnswer(question)?.id==='leaves'&&(/\b(?:use|eat|absorb)\b.{0,20}\bgreen light\b/i.test(text)||(/\bgreen\b/i.test(question)&&!/\b(?:reflect|reflects|bounce|bounces)\b/i.test(text))))throw new ApiError('FACT_CHECK_FAILED',502);
     await abortable(()=>cache?.put(question,parsed.buddy,{answer:text.trim(),model,provider:providerId},request),deadline);
     log('OK',performance.now()-started,model,'answer');return brainReply(text.trim(),'OK',{source:'ai',model,provider:providerId,openrouterResetAt});
    }catch(error){
     if(request.signal.aborted)throw new ApiError('CANCELLED',499);
     last=signal.aborted?'REQUEST_TIMEOUT':error instanceof ApiError?error.code:'OFFLINE';
     log(last,performance.now()-started,model,'answer',error instanceof ApiError?error.status:502);
     if(['DAILY_LIMIT','RATE_LIMITED'].includes(last)){
      if(providerId==='openrouter'&&last==='DAILY_LIMIT')openrouterResetAt=await abortable(()=>cache?.markLimit(request)||Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth(),new Date().getUTCDate()+1),deadline);
      if(providerId==='openrouter'){restCode=last;restModel=model;restUntil=openrouterResetAt||Date.now()+30000;}
      if(providerId==='groq')continue providerModels; // Groq model limits can differ: try the next configured model once.
      break providerModels; // OpenRouter free models share daily account capacity.
     }
     if(safetyRecovery)return authored(last);
     if(last==='OUTPUT_BLOCKED'){
      safetyRecovery=true;attempt=-1;continue; // One extra attempt on this model, within existing quota/deadline.
     }
     if(['CLASSIFIER_OUTPUT','FACT_CHECK_FAILED'].includes(last))return authored(last);
     if(['PROVIDER_AUTH','PROVIDER_CREDIT'].includes(last))break providerModels;
     if(deadline.aborted)return authored('REQUEST_TIMEOUT');
    }finally{clearTimeout(attemptTimer);}
   }
   }
   const fallback=authored(last);if(openrouterResetAt){const body=await fallback.json();return brainReply(body.answer,'OK',{...body,openrouterResetAt});}return fallback;
  }catch(error){
   const code=request.signal.aborted?'CANCELLED':overall.signal.aborted?'REQUEST_TIMEOUT':error instanceof ApiError?error.code:'RESTING';
   if(code==='REQUEST_TIMEOUT'&&question)return authored(code);
   log(code,performance.now()-began,used,'answer',error?.status||503);return failure(new ApiError(code,error?.status||503));
  }finally{clearTimeout(timer);}
 };
}
/** Stream only the final checked answer. Never speak raw, unvalidated provider tokens. */
export function createChat(options={}){
 const handler=createJsonChat(options);
 return async(request,context={})=>{
  if(!request.headers.get('accept')?.includes('application/x-ndjson'))return handler(request,context);
  // Keep origin, consent and method rejection as normal HTTP errors.
  try{guard(request);}catch(error){return failure(error);}
  const encoder=new TextEncoder(),control=new AbortController();let cancelled=false;
  const upstreamRequest=new Request(request,{signal:AbortSignal.any([request.signal,control.signal])});
  const body=new ReadableStream({async start(controller){
   const send=event=>{if(!cancelled&&!request.signal.aborted)controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));};
   try{
    const response=await handler(upstreamRequest,context),result=await response.json();
    if(!response.ok){send({type:'error',code:result.code});return;}
    const answer=readAnswer(result),sentences=answer.split(/(?<=[.!?])\s+/);
    for(const [index,text]of sentences.entries())send({type:'sentence',index,text,source:result.source,kind:result.kind});
    send({type:'done',...result});
   }catch{send({type:'error',code:'RESTING'});}finally{if(!cancelled)controller.close();}
  },cancel(){cancelled=true;control.abort();}});
  return new Response(body,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'}});
 };
}
export default createChat();
