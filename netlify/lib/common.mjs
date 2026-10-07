export class ApiError extends Error {constructor(code,status=503){super(code);this.code=code;this.status=status;}}
export function reply(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'}});}
export function guard(request){
 if(request.method!=='POST')throw new ApiError('METHOD_NOT_ALLOWED',405);
 const origin=request.headers.get('origin'),url=new URL(request.url);
 const configured=[process.env.URL,process.env.DEPLOY_PRIME_URL,...(process.env.ALLOWED_ORIGINS||'https://pokelearnz.netlify.app').split(',')].filter(Boolean).map(value=>value.trim());
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(!origin || !(configured.includes(origin)||(local&&origin===url.origin)))throw new ApiError('FORBIDDEN',403);
 if(request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError('FORBIDDEN',403);
 if(request.headers.get('x-pokelearn-consent')!=='1')throw new ApiError('CONSENT_REQUIRED',403);
 if(/^(1|true|yes)$/i.test(process.env.PAUSE_AI||''))throw new ApiError('RESTING');
 if(request.signal.aborted)throw new ApiError('CANCELLED',499);
}
export async function readLimited(request,limit){
 const declared=request.headers.get('content-length');if(declared && (!/^\d+$/.test(declared)||Number(declared)>limit))throw new ApiError('REQUEST_TOO_LARGE',413);
 const reader=request.body?.getReader();if(!reader)return Buffer.alloc(0);
 const chunks=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw new ApiError('REQUEST_TOO_LARGE',413);}chunks.push(Buffer.from(value));}}
 finally{reader.releaseLock();}
 return Buffer.concat(chunks,total);
}
export async function readJson(request,limit=8192){
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new ApiError('BAD_INPUT',400);
 try{return JSON.parse((await readLimited(request,limit)).toString('utf8'));}catch(error){if(error instanceof ApiError)throw error;throw new ApiError('BAD_INPUT',400);}
}
export function log(code,latencyMs,model='none',stage='answer',status=200){
 // Deliberately never include exception messages, URLs, request bodies, headers, audio, IP or response text.
 console.info(JSON.stringify({stage,model,status,code,latencyMs:Math.round(latencyMs)}));
}
export function failure(error){return reply({code:error instanceof ApiError?error.code:'RESTING'},error instanceof ApiError?error.status:503);}
export async function providerJson(response,limit=65536){
 if(!response.ok){let privacy=false,daily=false;try{const diagnostic=JSON.parse((await readLimited(response,8192)).toString('utf8'));const message=diagnostic?.error?.message||'';privacy=response.status===404&&/(?:data policy|zero.?data.?retention|\bzdr\b|privacy)/i.test(message);daily=response.status===429&&/(?:daily|per.day|free-models-per-day)/i.test(message);}catch{}const codes={400:'PROVIDER_REJECTED',401:'PROVIDER_AUTH',402:'PROVIDER_CREDIT',403:'PROVIDER_AUTH',404:'PROVIDER_UNAVAILABLE',429:'RATE_LIMITED'};throw new ApiError(daily?'DAILY_LIMIT':privacy?'PROVIDER_PRIVACY_UNAVAILABLE':codes[response.status]||'PROVIDER_FAILED',response.status===429?429:502);}
 try{return JSON.parse((await readLimited(response,limit)).toString('utf8'));}catch(error){if(error instanceof ApiError)throw error;throw new ApiError('PROVIDER_FAILED',502);}
}
export const brainReply=(answer,code='OK',details={})=>reply({code,source:'safety',model:'none',lastError:null,...details,answer});
/** Abort also races completion, so a broken adapter that ignores signal cannot hold the turn. */
export async function abortable(operation,signal){
 if(signal.aborted)throw new ApiError('REQUEST_TIMEOUT',504);
 let abort;const stopped=new Promise((_,reject)=>{abort=()=>reject(new ApiError('REQUEST_TIMEOUT',504));signal.addEventListener('abort',abort,{once:true});});
 try{return await Promise.race([Promise.resolve().then(operation),stopped]);}finally{signal.removeEventListener('abort',abort);}
}
