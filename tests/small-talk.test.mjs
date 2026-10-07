import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {smallTalk} from '../netlify/lib/small-talk.mjs';import {createChat} from '../netlify/functions/chat.mjs';
import {outputRiskRules,outputHasRisk,safeOutput,strictRetryPrompt,inputDecision} from '../netlify/lib/child-safety.mjs';
import {ApiError} from '../netlify/lib/common.mjs';
import {readAnswer,validAnswer} from '../answer-contract.js';import catalog from '../buddy-catalog.json' with {type:'json'};
const corpus=JSON.parse(await fs.readFile('tests/fixtures/small-talk.json','utf8')),buddy=catalog.find(b=>b.id===25);
const request=question=>new Request('http://127.0.0.1:4178/api/chat',{method:'POST',headers:{Origin:'http://127.0.0.1:4178','Content-Type':'application/json','X-PokeLearn-Consent':'1'},body:JSON.stringify({question,buddyId:25})});
test('greeting false positive is FOLLOW_UP; one approved question only in greeting context',()=>{
 assert.deepEqual(outputRiskRules('Hi there! How are you?'),['FOLLOW_UP']);
 assert.equal(safeOutput('Hi there! How are you?'),false);
 assert.equal(safeOutput('Hi there! How are you?',{greeting:true}),true);
 assert.throws(()=>readAnswer({answer:'Hi! How are you?',source:'ai',kind:'greeting'}));
 for(const output of corpus.blockedOutputs)assert.equal(safeOutput(output,{greeting:true}),false,output);
});
test('authored corpus bypasses models and upstream quota; sensitive/mixed utterances cannot match',async()=>{
 let calls=0;const h=createChat({provider:{configured:()=>{calls++;return true;}},reserve:async()=>calls++});
 for(const question of corpus.allowed){const response=await h(request(question)),body=await response.json();assert.equal(body.source,'authored');assert.equal(body.model,'none');assert.equal(body.lastError,null);assert.equal(readAnswer(body),body.answer);assert.equal(safeOutput(body.answer,{greeting:body.kind==='greeting'}),true,body.answer);}
 assert.equal(calls,0);
 for(const question of corpus.mixed)assert.equal(smallTalk(question,buddy),null,question);
 for(const question of corpus.mixed.filter(q=>inputDecision(q))){const body=await(await h(request(question))).json();assert.equal(body.source,'safety');}
 assert.equal(calls,0);
});
test('all catalog names and type voices yield valid authored transport and no risky hooks',()=>{
 for(const b of catalog)for(const question of ['hi',"what's your name",'thanks','bye',"I'm bored",'how are you']){
  const body=smallTalk(question,b),options={greeting:body.kind==='greeting'};
  assert.equal(validAnswer(body.answer,options),true,b.name+': '+body.answer);
  // Catalog names are trusted authored identities (e.g. Bombirdier), not model advice.
  const checked=question==="what's your name"?body.answer.replace(b.name.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' '),'Buddy'):body.answer;
  assert.equal(outputHasRisk(checked,options),false,b.name+': '+body.answer);
 }
 assert.match(smallTalk("what's your name",catalog.find(b=>b.id===7)).answer,/Squirtle/);
 assert.match(smallTalk('hi',buddy).answer,/Pika/);
});
test('blocked output retries once on same model with strict prompt, quota charged and safe output recovered',async()=>{
 const calls=[];let quota=0;const provider={configured:()=>true,models:()=>['fixture'],complete:async args=>{calls.push(args);return {answer:calls.length===1?'Hi! What else can we learn?':'Earth pulls things toward its center.'};}};
 const body=await(await createChat({provider,reserve:async()=>quota++})(request('What is gravity?'))).json();
 assert.equal(body.source,'ai');assert.equal(calls.length,2);assert.equal(quota,2);assert.equal(calls[0].model,calls[1].model);assert.ok(calls[1].system.endsWith(strictRetryPrompt));assert.equal(calls[0].question,calls[1].question);assert.doesNotMatch(body.answer,/What else/);
});
test('second blocked output falls back kindly with no model cascade; safety input never retries',async()=>{
 let calls=0;const provider={configured:()=>true,models:()=>['one','two','three'],complete:async()=>{calls++;return {answer:'Tell me your address.'};}};
 const h=createChat({provider,reserve:async()=>{}}),body=await(await h(request('Why do rocks shine?'))).json();
 assert.equal(calls,2);assert.equal(body.source,'fallback');assert.equal(body.lastError,'OUTPUT_BLOCKED');assert.match(body.answer,/stumped/);assert.equal(safeOutput(body.answer),true);
 const safety=await(await h(request('hi I want to die'))).json();assert.equal(safety.source,'safety');assert.equal(calls,2);
});
test('strict retry remains deadline bounded and quota errors do not bypass limits',async()=>{
 let calls=0,quota=0;const provider={configured:()=>true,models:()=>['fixture'],complete:async()=>++calls===1?{answer:'Hi! What else?'}:new Promise(()=>{})};
 const began=Date.now(),body=await(await createChat({provider,reserve:async()=>{},deadlineMs:40,timeoutMs:100})(request('Why do rocks shine?'))).json();assert.ok(Date.now()-began<300);assert.equal(body.lastError,'REQUEST_TIMEOUT');assert.equal(calls,2);
 calls=0;const response=await createChat({provider,reserve:async()=>{if(++quota===2)throw new ApiError('RATE_LIMITED',429);}})(request('Why do rocks shine?'));assert.equal(response.status,429);assert.equal(calls,1);
});
