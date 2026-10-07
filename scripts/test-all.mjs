/** All offline/fixture regressions; never load .env or call live AI providers. */
import {spawn} from 'node:child_process';
import {access} from 'node:fs/promises';
const env={...process.env,HOST:'127.0.0.1',PORT:process.env.CI_TEST_PORT||'4198'};
for(const key of ['OPENROUTER_KEY','VALSEA_KEY','RATE_LIMIT_SALT','DEMO_MODE','AI_PROVIDER','AI_PRIVACY','OPENROUTER_MODELS','NODE_OPTIONS'])delete env[key];
env.POKELEARN_TEST_URL='http://127.0.0.1:'+env.PORT;
const exists=async path=>access(new URL('../'+path,import.meta.url)).then(()=>true,()=>false);
async function run(args){
 const child=spawn(process.execPath,args,{env,stdio:'inherit'});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
 if(code!==0)throw Error('Regression command failed: '+args.join(' '));
}
const server=spawn(process.execPath,['server.mjs'],{env,stdio:'inherit'});
let exited=false;server.once('exit',()=>{exited=true;});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  if(exited)throw Error('Regression server exited before readiness');
  try{ready=(await fetch(env.POKELEARN_TEST_URL,{signal:AbortSignal.timeout(1000)})).ok;}catch{}
  if(ready)break;await new Promise(resolve=>setTimeout(resolve,100));
 }
 if(!ready)throw Error('Regression server did not become ready');
 const units=['tests/server.test.mjs','tests/policy.test.mjs','tests/sprite-cache.test.mjs','tests/backend.test.mjs'];
 await run(['--test',...(await Promise.all(units.map(async path=>(await exists(path))?path:null))).filter(Boolean)]);
 for(const path of ['tests/browser.mjs','tests/v3-errors.mjs','tests/v3-voice.mjs','tests/v3-animation.mjs','tests/stage4-browser.mjs','tests/stage5-browser.mjs','tests/final-qa.mjs']){
  if(await exists(path))await run([path]);
 }
 console.log('PASS all available deterministic regressions; no live providers');
}finally{
 if(!exited){const stopped=new Promise(resolve=>server.once('exit',resolve));server.kill('SIGTERM');await stopped;}
}
