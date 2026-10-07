/** Word-level edit distance; absent transcripts count as reference-word deletions. */
export function wordError(expected,actual){
 const words=text=>text.toLowerCase().replace(/[^a-z0-9\s]/g,'').trim().split(/\s+/).filter(Boolean);
 const a=words(expected),b=words(actual);let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;
 }
 return {errors:row[b.length],words:a.length,wer:row[b.length]/a.length,exact:row[b.length]===0};
}
