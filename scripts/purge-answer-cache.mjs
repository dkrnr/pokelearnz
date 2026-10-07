/** Deletes answer-cache blobs only. Never quota counts or provider-limit state. */
import {pathToFileURL} from 'node:url';
import {getStore} from '@netlify/blobs';
export async function purgeAnswerCache(store,{apply=false}={}){
 const keys=[];
 for await(const page of store.list({prefix:'answer-cache-',paginate:true})){
  for(const blob of page.blobs)if(/^answer-cache-v\d+$/.test(blob.key))keys.push(blob.key);
 }
 const unique=[...new Set(keys)].sort();
 if(apply)for(const key of unique)await store.delete(key);
 return {apply,keys:unique};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const args=process.argv.slice(2),apply=args.includes('--apply');
  if(args.some(arg=>!['--apply','--dry-run'].includes(arg))||args.includes('--apply')&&args.includes('--dry-run'))throw Error('Usage: npm run cache:purge -- [--dry-run|--apply]');
  if(!process.env.NETLIFY_SITE_ID||!process.env.NETLIFY_AUTH_TOKEN)throw Error('Set NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN privately for the pokelearnz site.');
  const store=getStore({name:'pokelearn-ai-budget',siteID:process.env.NETLIFY_SITE_ID,token:process.env.NETLIFY_AUTH_TOKEN,consistency:'strong'});
  console.log(JSON.stringify(await purgeAnswerCache(store,{apply})));
 }catch{console.error('CACHE_PURGE_FAILED: check private site/token configuration and arguments; no credentials logged.');process.exitCode=1;}
}
