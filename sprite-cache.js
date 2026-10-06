/* Classic service-worker helper. Measured CORS bytes, FIFO eviction; private data never enters this cache. */
self.SPRITE_BUDGET=12*1024*1024;
self.SPRITE_MAX_ENTRY=1024*1024;
const sizeIndex='/__public_sprite_sizes__';
self.storeSprite=async function(cache,request,response){
  const bytes=(await response.clone().arrayBuffer()).byteLength;
  if(!bytes || bytes>self.SPRITE_MAX_ENTRY)return;
  const index=await cache.match(sizeIndex);
  let sizes=index?await index.json():{};
  if(!index){
    // Migrate a partial/old index once, measuring existing public image responses.
    for(const key of await cache.keys()){
      if(new URL(key.url).pathname===sizeIndex)continue;
      const stored=await cache.match(key);
      if(stored.type==='opaque'){await cache.delete(key);continue;}
      sizes[key.url]=(await stored.arrayBuffer()).byteLength;
    }
  }
  const url=typeof request==='string'?request:request.url;
  delete sizes[url];sizes[url]=bytes;
  let total=Object.values(sizes).reduce((sum,n)=>sum+n,0);
  for(const key of Object.keys(sizes)){
    if(total<=self.SPRITE_BUDGET)break;
    total-=sizes[key];delete sizes[key];await cache.delete(key);
  }
  // Evict BEFORE adding, and refuse opaque/oversized responses rather than guessing their cost.
  if(sizes[url])await cache.put(request,response);
  await cache.put(sizeIndex,new Response(JSON.stringify(sizes),{headers:{'Content-Type':'application/json'}}));
};
