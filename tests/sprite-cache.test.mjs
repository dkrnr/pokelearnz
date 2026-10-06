import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs/promises';
test('sprite cache measures bytes, evicts before insert, survives worker restart and rejects oversized pictures',async()=>{
 const scope={self:{},Response,URL};vm.runInNewContext(await fs.readFile('sprite-cache.js','utf8'),scope);
 const data=new Map(),url=p=>new URL(typeof p==='string'?p:p.url,'https://app.test').href;
 const cache={match:async p=>data.get(url(p))?.clone(),put:async(p,r)=>data.set(url(p),r.clone()),delete:async p=>data.delete(url(p)),keys:async()=>[...data.keys()].map(url=>({url}))};
 scope.self.SPRITE_BUDGET=15;scope.self.SPRITE_MAX_ENTRY=10;
 const put=(id,n)=>scope.self.storeSprite(cache,new Request('https://cdn.jsdelivr.net/'+id+'.png'),new Response(new Uint8Array(n)));
 await put(1,9);await put(2,9);assert.equal(data.has('https://cdn.jsdelivr.net/1.png'),false);await put(3,11);assert.equal(data.has('https://cdn.jsdelivr.net/3.png'),false);
 vm.runInNewContext(await fs.readFile('sprite-cache.js','utf8'),{self:scope.self,Response,URL});scope.self.SPRITE_BUDGET=15;scope.self.SPRITE_MAX_ENTRY=10;await put(4,8);
 assert.equal(data.has('https://cdn.jsdelivr.net/2.png'),false);const index=await (await cache.match('/__public_sprite_sizes__')).json();assert.ok(Object.values(index).reduce((a,b)=>a+b,0)<=15);
});
