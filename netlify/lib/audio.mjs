import {parseBuffer} from 'music-metadata';import {ApiError} from './common.mjs';
export const audioLimits={bytes:2*1024*1024,minDuration:.7,duration:30};
function invalid(){throw new ApiError('TYPE_INSTEAD',422);}
function uint(bytes){if(bytes.length>8)invalid();let n=0;for(const b of bytes)n=n*256+b;if(!Number.isSafeInteger(n))invalid();return n;}
function vint(buffer,offset,keep=false){let width=1,mask=128;while(width<=8&&!(buffer[offset]&mask)){width++;mask>>=1;}if(width>8||offset+width>buffer.length)invalid();const bytes=buffer.subarray(offset,offset+width);const unknown=!keep&&(bytes[0]&~mask)===mask-1&&bytes.subarray(1).every(b=>b===255);return {width,value:unknown?0:uint(keep?bytes:Buffer.from([bytes[0]&~mask,...bytes.subarray(1)])),unknown};}
export function webmDuration(buffer){
 let scale=1e6,cluster=0,max=0,total=0,blocks=0,declared=0;
 const containers=new Set([0x1a45dfa3,0x18538067,0x1549a966,0x1654ae6b,0xae,0x1f43b675,0xa0]);
 function walk(start,end,depth=0){if(depth>10)invalid();while(start<end){
  const id=vint(buffer,start,true);start+=id.width;const size=vint(buffer,start);start+=size.width;
  const stop=size.unknown?end:start+size.value;if(stop>end||stop<start)invalid();
  if(id.value===0x2ad7b1)scale=uint(buffer.subarray(start,stop));
  if(id.value===0x4489){declared=stop-start===8?buffer.readDoubleBE(start):stop-start===4?buffer.readFloatBE(start):0;}
  if(id.value===0xe7)cluster=uint(buffer.subarray(start,stop));
  if(id.value===0xa3||id.value===0xa1){
   const track=vint(buffer,start);const payload=start+track.width+3;if(payload>=stop)invalid();
   const flags=buffer[start+track.width+2];if(flags&6)invalid(); // Laced packets are not guessed.
   const relative=buffer.readInt16BE(start+track.width),toc=buffer[payload],mode=toc>>3;
   const frames=(toc&3)===0?1:(toc&3)===3?(buffer[payload+1]&63):2;
   const frameMs=mode>=16?2.5*2**(mode&3):mode>=12?10*2**(mode&1):(mode&3)===3?60:10*2**(mode&3);
   if(!frames||frames*frameMs>120)invalid();const seconds=frames*frameMs/1000;
   max=Math.max(max,(cluster+relative)*scale/1e9+seconds);total+=seconds;blocks++;
  }
  if(containers.has(id.value))walk(start,stop,depth+1);start=stop;
 }}
 walk(0,buffer.length);if(!blocks||!scale)invalid();return Math.max(max,total,declared*scale/1e9);
}
export function mp4Duration(buffer){
 let scale=0,tableDuration=0,fragmentDuration=0;const tracks=[];
 function boxes(start,end,visit){while(start<end){if(start+8>end)invalid();let size=buffer.readUInt32BE(start),head=8;const type=buffer.toString('ascii',start+4,start+8);if(size===1){if(start+16>end)invalid();size=uint(buffer.subarray(start+8,start+16));head=16;}if(size===0)size=end-start;if(size<head||start+size>end)invalid();visit(type,start+head,start+size);start+=size;}}
 boxes(0,buffer.length,(type,start,end)=>{
  if(type==='moov')boxes(start,end,(type,a,b)=>{if(type==='trak'){const track={};boxes(a,b,(type,a,b)=>{if(type==='mdia')boxes(a,b,(type,a,b)=>{
   if(type==='mdhd'){const off=buffer[a]===1?20:12;if(a+off+8>b)invalid();track.scale=buffer.readUInt32BE(a+off);const duration=buffer[a]===1?uint(buffer.subarray(a+off+4,a+off+12)):buffer.readUInt32BE(a+off+4);track.declared=duration/(track.scale||1);}
   if(type==='hdlr'){if(a+12>b)invalid();track.kind=buffer.toString('ascii',a+8,a+12);}
   if(type==='minf')boxes(a,b,(type,a,b)=>{if(type==='stbl')boxes(a,b,(type,a,b)=>{if(type==='stts'){if(a+8>b)invalid();const count=buffer.readUInt32BE(a+4);if(a+8+count*8>b)invalid();track.ticks=0;for(let i=0;i<count;i++)track.ticks+=buffer.readUInt32BE(a+8+i*8)*buffer.readUInt32BE(a+12+i*8);}});});
  });});tracks.push(track);}});
 });
 if(tracks.length!==1||tracks[0].kind!=='soun'||!(scale=tracks[0].scale))invalid();tableDuration=Math.max(tracks[0].declared||0,(tracks[0].ticks||0)/scale);
 boxes(0,buffer.length,(type,start,end)=>{if(type==='moof')boxes(start,end,(type,a,b)=>{if(type==='traf'){
  let defaultDuration=0,ticks=0,base=0;
  boxes(a,b,(type,a,b)=>{
   if(type==='tfhd'){if(a+8>b)invalid();const flags=buffer.readUInt32BE(a)&0xffffff;let off=a+8;if(flags&1)off+=8;if(flags&2)off+=4;if(flags&8){if(off+4>b)invalid();defaultDuration=buffer.readUInt32BE(off);}}
   if(type==='tfdt'){if(a+8>b)invalid();base=buffer[a]===1?uint(buffer.subarray(a+4,a+12)):buffer.readUInt32BE(a+4);}
   if(type==='trun'){if(a+8>b)invalid();const flags=buffer.readUInt32BE(a)&0xffffff,count=buffer.readUInt32BE(a+4);let off=a+8;if(flags&1)off+=4;if(flags&4)off+=4;if(count>100000)invalid();for(let i=0;i<count;i++){let duration=defaultDuration;if(flags&0x100){if(off+4>b)invalid();duration=buffer.readUInt32BE(off);off+=4;}if(!duration)invalid();ticks+=duration;if(flags&0x200)off+=4;if(flags&0x400)off+=4;if(flags&0x800)off+=4;if(off>b)invalid();}}
  });fragmentDuration=Math.max(fragmentDuration,(base+ticks)/scale);
 }});});
 return Math.max(tableDuration,fragmentDuration);
}
export async function validateAudio(buffer,mime){
 if(!buffer.length||buffer.length>audioLimits.bytes)throw new ApiError('REQUEST_TOO_LARGE',413);
 const kind=mime.split(';')[0].toLowerCase();let scanned;
 if(kind==='audio/webm'){if(!buffer.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])))invalid();scanned=webmDuration(buffer);}
 else if(kind==='audio/mp4'){if(buffer.toString('ascii',4,8)!=='ftyp')invalid();scanned=mp4Duration(buffer);}
 else if(kind==='audio/ogg'){if(buffer.toString('ascii',0,4)!=='OggS')invalid();}
 else invalid();
 let data;try{data=await parseBuffer(buffer,{mimeType:kind,size:buffer.length},{duration:true,skipCovers:true});}catch{invalid();}
 if(data.format.hasVideo || data.format.hasAudio===false || (kind==='audio/webm' && !/opus/i.test(data.format.codec||'')) || (kind==='audio/mp4' && !/aac/i.test(data.format.codec||'')) || data.format.trackInfo?.some(track=>track.type===1)||!data.format.codec||!/(opus|aac|mpeg-4|vorbis)/i.test(data.format.codec))invalid();
 const duration=Math.max(scanned||0,data.format.duration||0);
 if(!Number.isFinite(duration)||duration<audioLimits.minDuration||duration>audioLimits.duration)invalid();
 return {duration,kind,filename:kind==='audio/mp4'?'recording.m4a':kind==='audio/ogg'?'recording.ogg':'recording.webm'};
}
