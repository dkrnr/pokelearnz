import {createHmac} from 'node:crypto';import {ApiError} from './common.mjs';
export function createMemoryStore(){const values=new Map();let revision=0;return {getWithMetadata:async key=>structuredClone(values.get(key)||null),setJSON:async(key,data,options)=>{const old=values.get(key);if(options.onlyIfNew?!!old:old?.etag!==options.onlyIfMatch)return {modified:false};values.set(key,{data:structuredClone(data),etag:String(++revision)});return {modified:true};},list:async()=>({blobs:[...values.keys()].map(key=>({key}))}),delete:async key=>values.delete(key)};}
const localStore=createMemoryStore();let storePromise,cleanedDay;
const bounded=(value,defaultValue,max)=>/^\d+$/.test(value||'')?Math.max(1,Math.min(max,Number(value))):defaultValue;
export async function quotaStore(request){
 const local=['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname);
 if(local && process.env.LOCAL_AI_LIMITS==='memory')return localStore;
 storePromise ||= import('@netlify/blobs').then(({getStore})=>getStore({name:'pokelearn-ai-budget',consistency:'strong'}));
 return storePromise;
}
export async function reserve(store,ip,{now=Date.now(),dailyCap=200,ipCap=8,salt=process.env.RATE_LIMIT_SALT}={}){
 if(typeof salt!=='string'||salt.length<32||!ip)throw new ApiError('RESTING');
 const date=new Date(now).toISOString().slice(0,10),key='day-'+date,window=Math.floor(now/60000);
 const hash=createHmac('sha256',salt).update(date+':'+ip).digest('hex');
 for(let attempt=0;attempt<12;attempt++){
  const entry=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
  const data=entry?.data || {count:0,ips:{}};
  if(!Number.isInteger(data.count)||data.count<0||!data.ips||typeof data.ips!=='object')throw new ApiError('RESTING');
  if(data.count>=dailyCap)throw new ApiError('RESTING');
  for(const [id,value] of Object.entries(data.ips))if(value.window!==window)delete data.ips[id];
  const client=data.ips[hash]||{window,count:0};
  if(client.count>=ipCap)throw new ApiError('RATE_LIMITED',429);
  data.count++;client.count++;data.ips[hash]=client;
  const result=await store.setJSON(key,data,entry?{onlyIfMatch:entry.etag}:{onlyIfNew:true});
  if(result.modified)return;
  await new Promise(resolve=>setTimeout(resolve,Math.min(30,attempt*3)));
 }
 throw new ApiError('RESTING');
}
export async function reserveAttempt(request,context){
 const controller=AbortSignal.timeout(2000);
 try{
  const store=await Promise.race([quotaStore(request),new Promise((_,reject)=>controller.addEventListener('abort',()=>reject(new ApiError('RESTING')),{once:true}))]);
  if(request.signal.aborted)throw new ApiError('CANCELLED',499);
  await Promise.race([reserve(store,context.ip,{dailyCap:bounded(process.env.AI_DAILY_CAP,200,1000),ipCap:bounded(process.env.AI_IP_PER_MINUTE,8,30)}),new Promise((_,reject)=>controller.addEventListener('abort',()=>reject(new ApiError('RESTING')),{once:true}))]);
  const day=new Date().toISOString().slice(0,10);
  if(cleanedDay!==day){cleanedDay=day; // Best-effort removal on activity; no automatic Blobs TTL is claimed.
   void store.list({prefix:'day-'}).then(({blobs})=>Promise.all(blobs.filter(b=>b.key<'day-'+new Date(Date.now()-86400000).toISOString().slice(0,10)).map(b=>store.delete(b.key)))).catch(()=>{});
  }
 }catch(error){if(error instanceof ApiError)throw error;throw new ApiError('RESTING');}
}
