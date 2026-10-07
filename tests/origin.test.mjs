import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedOrigin,guard} from '../netlify/lib/common.mjs';
const deployed=new URL('https://deploy-preview-9--pokelearnz.netlify.app/api/chat');
test('production, this site previews and branch deploys work without runtime build variables',()=>{
 for(const origin of ['https://pokelearnz.netlify.app','https://deploy-preview-9--pokelearnz.netlify.app','https://deploy-preview-123--pokelearnz.netlify.app','https://redesign-kid-friendly-v3--pokelearnz.netlify.app','https://staging--pokelearnz.netlify.app'])assert.equal(allowedOrigin(origin,deployed,{}),true,origin);
});
test('same-origin local development supports loopback hosts and ports',()=>{
 for(const origin of ['http://localhost:4178','http://127.0.0.1:4178','http://[::1]:4178'])assert.equal(allowedOrigin(origin,new URL(origin+'/api/chat'),{}),true);
 assert.equal(allowedOrigin('http://localhost:9999',new URL('http://localhost:4178'),{}),false);
 assert.equal(allowedOrigin('http://localhost:4178',deployed,{}),false);
});
test('missing, malformed, insecure and lookalike origins fail even with unrelated env URLs',()=>{
 for(const origin of [null,'null','garbage','http://pokelearnz.netlify.app','https://deploy-preview-9--other.netlify.app','https://staging--other.netlify.app','https://pokelearnz.netlify.app.evil.test','https://staging--pokelearnz.netlify.app.evil.test','https://pokelearnz.netlify.app:444','https://user@pokelearnz.netlify.app','https://pokelearnz.netlify.app/','https://pokelearnz.netlify.app/?x','https://--pokelearnz.netlify.app','https://foo.bar--pokelearnz.netlify.app'])assert.equal(allowedOrigin(origin,deployed,{URL:origin,DEPLOY_PRIME_URL:origin,ALLOWED_ORIGINS:origin}),false,String(origin));
});
test('guard still rejects cross-site fetches and missing consent on otherwise allowed hosts',()=>{
 const make=headers=>new Request(deployed,{method:'POST',headers:{Origin:deployed.origin,'X-PokeLearn-Consent':'1',...headers}});
 assert.doesNotThrow(()=>guard(make({})));
 assert.throws(()=>guard(make({'Sec-Fetch-Site':'cross-site'})),e=>e.code==='FORBIDDEN');
 assert.throws(()=>guard(make({'X-PokeLearn-Consent':'0'})),e=>e.code==='CONSENT_REQUIRED');
});
