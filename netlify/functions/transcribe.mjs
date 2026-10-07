import {guard,readLimited,providerJson,reply,ApiError,failure,log,brainReply,abortable} from '../lib/common.mjs';
import {audioLimits,validateAudio} from '../lib/audio.mjs';import {inputDecision} from '../lib/child-safety.mjs';import {reserveAttempt} from '../lib/quota.mjs';
export const config={path:['/api/transcribe','/.netlify/functions/transcribe'],rateLimit:{windowLimit:6,windowSize:60,aggregateBy:['ip','domain']}};
export function createTranscribe({fetcher=fetch,reserve=reserveAttempt,timeoutMs=6000,deadlineMs=10000}={}){
 return async(request,context={})=>{const began=performance.now(),deadline=AbortSignal.any([request.signal,AbortSignal.timeout(deadlineMs)]);try{
  guard(request);
  const type=request.headers.get('content-type')||'';
  if(!/^multipart\/form-data;\s*boundary=[\w'"()+_,./:=?-]{1,100}$/i.test(type))throw new ApiError('TYPE_INSTEAD',422);
  const body=await abortable(()=>readLimited(request,audioLimits.bytes+8192),deadline);let form;
  try{form=await new Response(body,{headers:{'Content-Type':type}}).formData();}catch{throw new ApiError('TYPE_INSTEAD',422);}
  const entries=[...form.keys()];if(entries.some(key=>!['file','model','language'].includes(key))||entries.length!==new Set(entries).size)throw new ApiError('TYPE_INSTEAD',422);
  const file=form.get('file'),language=form.get('language');
  if(!(file instanceof File)||form.get('model')!=='valsea-transcribe'||!['english','sinhala','tamil'].includes(language))throw new ApiError('TYPE_INSTEAD',422);
  const buffer=Buffer.from(await file.arrayBuffer());const audio=await abortable(()=>validateAudio(buffer,file.type),deadline);
  if(!process.env.VALSEA_KEY)throw new ApiError('TYPE_INSTEAD',503);
  await abortable(()=>reserve(request,context),deadline);
  const upload=new FormData();upload.append('file',new Blob([buffer],{type:audio.kind}),audio.filename);upload.append('model','valsea-transcribe');upload.append('language',language);upload.append('response_format','verbose_json');
  // One bounded retry for transient failures; the device consent covers both sends.
  // 429/auth/malformed/low-confidence audio never retries. No retry occurs after cancellation.
  let data;
  for(let attempt=0;attempt<2;attempt++){
   if(attempt)await abortable(()=>reserve(request,context),deadline);
   const signal=AbortSignal.any([deadline,AbortSignal.timeout(timeoutMs)]),started=performance.now();
   try{data=await abortable(async()=>providerJson(await fetcher('https://api.valsea.ai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.VALSEA_KEY}`},body:upload,signal})),signal);log('OK',performance.now()-started,'valsea-transcribe','transcription');break;}
   catch(error){log(error instanceof ApiError?error.code:'TYPE_INSTEAD',performance.now()-started,'valsea-transcribe','transcription',error?.status||502);if(attempt||deadline.aborted||['DAILY_LIMIT','RATE_LIMITED','PROVIDER_AUTH','PROVIDER_CREDIT','PROVIDER_REJECTED'].includes(error?.code))throw error;}
  }
  if(data.segments?.some(segment=>typeof segment.no_speech_prob==='number'&&segment.no_speech_prob>.6||typeof segment.avg_logprob==='number'&&segment.avg_logprob < -1))throw new ApiError('TYPE_INSTEAD',422);
  if(typeof data.text!=='string'||data.text.length>300)throw new ApiError('TYPE_INSTEAD',422);
  if(data.text.trim().length<2){log('NO_SPEECH',performance.now()-began,'valsea-transcribe','transcript',422);return reply({code:'TYPE_INSTEAD',reason:'NO_SPEECH'},422);}
  const decision=inputDecision(data.text);if(decision){log(decision.code,performance.now()-began,'valsea-transcribe','transcript');return brainReply(decision.content,decision.code);}
  return reply({code:'OK',text:data.text.trim()});
 }catch(error){const code=request.signal.aborted?'CANCELLED':error instanceof ApiError?error.code:'TYPE_INSTEAD';const passthrough=['RATE_LIMITED','RESTING','FORBIDDEN','CONSENT_REQUIRED','METHOD_NOT_ALLOWED','REQUEST_TOO_LARGE','CANCELLED'].includes(code);log(code,performance.now()-began,'valsea-transcribe','transcript',code==='CANCELLED'?499:passthrough?error?.status||503:422);if(['RATE_LIMITED','RESTING','FORBIDDEN','CONSENT_REQUIRED','METHOD_NOT_ALLOWED','REQUEST_TOO_LARGE','CANCELLED'].includes(code))return failure(new ApiError(code,code==='CANCELLED'?499:error?.status||503));return failure(new ApiError('TYPE_INSTEAD',422));}};
}
export default createTranscribe();
