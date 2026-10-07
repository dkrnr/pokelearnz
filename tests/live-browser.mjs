/** Exercise the complete live-gate harness against synthetic responses, with no provider calls. */
import assert from 'node:assert/strict';import http from 'node:http';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createServer} from '../server.mjs';
const server=createServer(),requests=[];server.prependListener('request',(req,res)=>{
 if(!/^\/(api|\.netlify\/functions)\/(health|chat)$/.test(req.url))return;
 if(req.url.endsWith('/health')){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({groq:true,openrouter:true,valsea:true}));return;}
 let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{requests.push(JSON.parse(raw));const first=requests.length===1;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({code:'OK',answer:first?'Axolotls eat worms, bugs, and small fish. They suck food into their mouths.':'A quasar is a bright galaxy core. Hot gas near a black hole shines.',source:first?'authored':requests.length===2?'ai':'cache',model:first?'none':'fixture',provider:first?null:'groq'}));});
});
// Avoid dispatching fixture routes to the actual function handlers.
const original=server.listeners('request')[1];server.removeListener('request',original);server.on('request',(req,res)=>{if(!/^\/(api|\.netlify\/functions)\/(health|chat)$/.test(req.url))original(req,res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const folder=await fs.mkdtemp(path.join(os.tmpdir(),'pokelearn-live-fixture-'));
try{
 const file=path.join(folder,'report.json');const child=spawn(process.execPath,['scripts/test-live.mjs','http://127.0.0.1:'+server.address().port],{env:{...process.env,LIVE_REPORT:file},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});assert.equal(code,0,output);const report=JSON.parse(await fs.readFile(file));assert.equal(requests.length,3);assert.equal(report.pass,true);assert.equal(report.gateAutoSent,true);assert.equal(report.cacheVerified,true);assert.equal(report.groqVerified,true);assert.deepEqual(report.cspViolations,[]);assert.deepEqual(report.views,['scene','typing','chooser','activity']);console.log('PASS three-question live harness against fixtures, gate auto-send, model/cache evidence and all CSP views; no live providers');
}finally{await new Promise(resolve=>server.close(resolve));await fs.rm(folder,{recursive:true,force:true});}
