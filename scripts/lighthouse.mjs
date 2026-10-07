import fs from 'node:fs/promises';import path from 'node:path';import lighthouse from 'lighthouse';import {launch} from 'chrome-launcher';import {chromium} from 'playwright';import {createServer} from '../server.mjs';
const supplied=process.argv[2];let server;let base=supplied;
if(!base){server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;}
const directory=process.env.LIGHTHOUSE_DIR||'qa/artifacts/lighthouse';await fs.mkdir(directory,{recursive:true});const summary=[];let chrome;
try{
 chrome=await launch({chromePath:chromium.executablePath(),chromeFlags:['--headless=new','--no-sandbox','--disable-dev-shm-usage']});
 for(const route of ['/','/parents']){
  const url=new URL(route==='/'?route:'/parents/',base).href;const result=await lighthouse(url,{port:chrome.port,output:['json','html'],logLevel:'error',onlyCategories:['performance','accessibility','best-practices','seo'],formFactor:'mobile'});
  const name=route==='/'?'main':'parents';await fs.writeFile(path.join(directory,name+'.json'),result.report[0]);await fs.writeFile(path.join(directory,name+'.html'),result.report[1]);
  summary.push({page:route,url,scores:Object.fromEntries(Object.entries(result.lhr.categories).map(([id,c])=>[id,Math.round(c.score*100)])),remaining:Object.entries(result.lhr.audits).filter(([_,a])=>typeof a.score==='number'&&a.score<1&&a.scoreDisplayMode!=='manual').map(([id,a])=>({id,title:a.title,displayValue:a.displayValue||null})),warnings:result.lhr.runWarnings});
 }
 const report={checkedAt:new Date().toISOString(),mobile:true,lighthouseVersion:JSON.parse(await fs.readFile(new URL('../node_modules/lighthouse/package.json',import.meta.url))).version,results:summary};await fs.writeFile(path.join(directory,'summary.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await chrome?.kill();if(server)await new Promise(resolve=>server.close(resolve));}
