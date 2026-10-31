import {actor,rateLimit} from '@/lib/auth/session';
import {sameOrigin,failure,noStore,HttpError} from '@/lib/server/http';
import {store} from '@/lib/database/client';
import {buildRequest} from '@/lib/ai/contract';
import {askJev,pricing} from '@/lib/ai/client';
export async function POST(request:Request) {
 try {
  sameOrigin(request);
  const a=await actor();
  await rateLimit('jev-test:'+a.userId,3,3600);
  const database=await store(),price=pricing(),model=process.env.JEV_MODEL||'jev-1.13.0';
  const payload=buildRequest([{id:'health-test',author:'synthetic',text:'Hello, enjoying the stream!',at:new Date().toISOString()}],[],model);
  const reservation=await database.reserveUsage(a.channelId,Math.max(.001,(Buffer.byteLength(JSON.stringify(payload))*2*price.input+3000*price.output)/1e6));
  if(!reservation)throw new HttpError(400,'Enable classification and TypeSafe consent, and ensure budget remains.');
  const start=Date.now();
  try {
   const result=await askJev(payload,1),cost=result.usage?(result.usage.input_tokens*price.input+result.usage.output_tokens*price.output)/1e6:null;
   await database.settleUsage(a.channelId,reservation,cost,result.usage,Date.now()-start);
   return noStore({ok:true,model:result.model,elapsedMs:Date.now()-start,usage:result.usage,estimatedUSD:cost});
  } catch(error) {await database.uncertainUsage(a.channelId,reservation);throw error}
 } catch(error) {return failure(error)}
}
