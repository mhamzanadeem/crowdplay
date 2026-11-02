// Coalesce expensive provider probes without retaining a failed result for minutes.
export function cacheProbe(probe:()=>Promise<void>,now:()=>number=Date.now){
 let entry:{promise:Promise<void>;until:number}|undefined;
 return ()=>{
  if(entry&&entry.until>now())return entry.promise;
  const current={promise:Promise.resolve(),until:Infinity};
  current.promise=Promise.resolve().then(probe).then(()=>{current.until=now()+60000},error=>{current.until=now()+5000;throw error});
  entry=current;return current.promise;
 };
}
