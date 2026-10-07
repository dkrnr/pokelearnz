import {createHmac} from 'node:crypto';
import {quotaStore} from './quota.mjs';
import {safeOutput,inputDecision,personalData} from './child-safety.mjs';
import {answerBank} from './answer-bank.mjs';
const TTL=30*86400000,MAX=256,BYTES=256*1024;
const vocabulary=new Set(('why how what when where can do does is are a an the it its to of in on for from and or with without have has get gets make makes move moves come comes work works happen happens hot cold big small light water air food eat eats need needs breathe sleep grow turn earth sun moon space stars sky cloud rain weather plant plants animal animals body bones heart blood brain eyes ears nose teeth skin quasar quasars comet comets universe dinosaurs dinosaur fossil fossils volcano volcanoes lava stone rocks sand sound waves ocean oceans tide tides oxygen carbon gas gases rainbow lightning thunder ice snow wind season seasons sunflowers sunflower cactus cacti penguin penguins elephant elephants dolphin dolphins turtle turtles snail snails zebra zebras giraffe giraffes whale whales octopus octopuses axolotl axolotls bees bee butterfly butterflies caterpillar caterpillars bird birds fish frogs frog insects insect worm worms feathers fur scales wings legs tail tails trunk roots leaves leaf flower flowers seed seeds tree trees grass green blue red yellow white black reflect reflects float floats fly flies three two four plus s').split(' '));
for(const item of answerBank)for(const word of (item.question||'').toLowerCase().match(/[a-z]+/g)||[])vocabulary.add(word);
export function normalizeQuestion(question,buddy={}){
 let text=question.normalize('NFKC').toLowerCase().trim().replace(/\s+/g,' ');
 const name=(buddy.name||'').replace(/-/g,' ').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 if(name)text=text.replace(new RegExp('^(?:(?:hey|hi|hello) +)?'+name+'[ ,!:-]+(?=(?:why|how|what|when|where|can|do|does|is|are)\\b)','i'),'');
 return text.replace(/^[\s.,!?;:]+|[\s.,!?;:]+$/g,'').replace(/\s+/g,' ');
}
export function cacheable(question,buddy){
 const text=normalizeQuestion(question,buddy),words=text.match(/[a-z]+/g)||[];
 return !inputDecision(question)&&/^(why|how|what|when|where|can|do|does|is|are)\b/.test(text)&&words.length<=35&&words.length>=3&&words.every(w=>vocabulary.has(w))&&!/\b(i|my|me|our|we|you|your|name|school|address|phone|email|friend)\b/.test(text);
}
export function createAnswerCache({storeFor=quotaStore,now=Date.now,env=process.env}={}){
 let warmUntil=0;
 const key=(q,b)=>typeof env.RATE_LIMIT_SALT==='string'&&env.RATE_LIMIT_SALT.length>=32&&cacheable(q,b)?createHmac('sha256',env.RATE_LIMIT_SALT).update('answer-v1:'+normalizeQuestion(q,b)).digest('hex'):null;
 const bounded=async fn=>{let timer;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('store timeout')),500);})]);}finally{clearTimeout(timer);}};
 const entries=data=>Object.fromEntries(Object.entries(data||{}).filter(([k,v])=>/^[a-f0-9]{64}$/.test(k)&&v&&Number.isFinite(v.expires)&&v.expires>now()&&v.expires<=now()+TTL&&safeOutput(v.answer)&&!personalData(v.answer)&&['groq','openrouter'].includes(v.provider)&&/^[-a-zA-Z0-9_./:]{1,120}$/.test(v.model||'')).sort((a,b)=>b[1].expires-a[1].expires).slice(0,MAX));
 async function change(request,blob,edit){return bounded(async()=>{const store=await storeFor(request);for(let i=0;i<5;i++){const old=await store.getWithMetadata(blob,{type:'json',consistency:'strong'});const data=edit(old?.data);if(Buffer.byteLength(JSON.stringify(data))>BYTES)return;const result=await store.setJSON(blob,data,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(result.modified)return;} });}
 return {
  async get(q,b,request){const id=key(q,b);if(!id)return null;try{return await bounded(async()=>{const store=await storeFor(request),raw=await store.getWithMetadata('answer-cache-v1',{type:'json',consistency:'strong'}),data=entries(raw?.data);if(raw&&Object.keys(data).length!==Object.keys(raw.data||{}).length)await change(request,'answer-cache-v1',current=>entries(current));return data[id]||null;});}catch{return null;}},
  async put(q,b,value,request){const id=key(q,b);if(!id||!safeOutput(value.answer)||personalData(value.answer)||!['groq','openrouter'].includes(value.provider))return;try{await change(request,'answer-cache-v1',data=>entries({...data,[id]:{answer:value.answer,model:value.model,provider:value.provider,expires:now()+TTL}}));}catch{}},
  async status(request){try{const stored=await bounded(async()=>{const store=await storeFor(request);return (await store.getWithMetadata('provider-state-v1',{type:'json',consistency:'strong'}))?.data?.openrouterUntil;});if(Number.isFinite(stored)&&stored<=now()+86400000)warmUntil=Math.max(warmUntil,stored);}catch{}return warmUntil>now()?warmUntil:0;},
  async markLimit(request){const d=new Date(now());warmUntil=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+1);try{await change(request,'provider-state-v1',()=>({openrouterUntil:warmUntil}));}catch{}return warmUntil;}
 };
}
