import {jevEnabled} from '../services/config';
import 'server-only';
import {store} from '../database/client';
import {channelRules,channelSettings,mapMessage} from '../database/repository';
import {detectSignals,riskFor} from '../moderation/rules';
import {buildRequest,type AIMessage} from './contract';
import {askJev,pricing,ProviderError} from './client';
import {digest} from '../auth/crypto';
import type {Classification,ChatMessage} from '@/types/domain';

export async function processChannel(channelId:string) {
 const database=await store(),settings=await channelSettings(channelId),rules=await channelRules(channelId);
 const jobs=await database.claimJobs(channelId,settings.batchSize);
 if(!jobs.length)return {processed:0};
 const rows=await database.batchMessages(channelId,jobs.map(j=>j.message_id));
 const messages=rows.map(mapMessage);
 if(!messages.length)return {processed:0};
 const history=(await database.history(channelId,messages[messages.length-1].at)).map(mapMessage);
 const signals=messages.map(m=>detectSignals(m,history,rules));
 async function pause(reason:string) {
  for(let i=0;i<messages.length;i++) {
   const job=jobs.find(j=>j.message_id===messages[i].id)!;
   await database.pauseJob(job,signals[i],riskFor(null,signals[i],rules),reason);
  }
  return {processed:0,paused:reason};
 }
 if(!jevEnabled(process.env.JEV_ENABLED))return pause('Jev integration deferred');
 if(!settings.classificationEnabled||!settings.thirdPartyConsent)return pause('AI paused: enable classification and authorize TypeSafe processing in Settings.');
 if(!process.env.TYPESAFE_API_KEY)return pause('Jev key not configured.');
 let price:ReturnType<typeof pricing>;
 try {price=pricing()}catch{return pause('AI paused: confirm provider account pricing in server configuration.')}
 const shape=(message:ChatMessage):AIMessage=>({id:message.id,author:digest(channelId+':'+message.userId).slice(0,12),text:message.text.slice(0,500),at:message.at});
 const model=process.env.JEV_MODEL||'jev-1.13.0';
 const request=buildRequest(messages.map(shape),history.filter(m=>m.at<messages[0].at).sort((a,b)=>a.at.localeCompare(b.at)).slice(-12).map(shape),model);
 const body={...request,state:{...request.state,channelRules:rules.filter(r=>r.enabled).map(r=>({id:r.id,sensitivity:r.sensitivity,threshold:r.threshold}))}};
 const bytes=Buffer.byteLength(JSON.stringify(body));
 if(bytes>58000)return pause('Batch too large. Reduce batch size in Settings.');
 async function complete(results:Classification[]) {
  for(let i=0;i<messages.length;i++) {
   const job=jobs.find(j=>j.message_id===messages[i].id)!;
   await database.completeJob(job,results[i],signals[i],riskFor(results[i],signals[i],rules));
  }
 }
 const requestHash=digest(JSON.stringify(body)),cached=await database.cached(channelId,requestHash);
 if(cached){await complete(cached.results);return {processed:messages.length}}
 // Estimated reservations are serialized per channel, not a guaranteed provider billing cap.
 const reservation=await database.reserveUsage(channelId,Math.max(.001,((bytes*2*price.input)+(jobs.length*3000*price.output))/1e6));
 if(!reservation)return pause('Hourly estimated budget reached. Classification paused; local signals remain visible.');
 const start=Date.now();
 try {
  const result=await askJev(body,messages.length);
  const cost=result.usage?(result.usage.input_tokens*price.input+result.usage.output_tokens*price.output)/1e6:null;
  await database.settleUsage(channelId,reservation,cost,result.usage,Date.now()-start);
  await database.cacheResults(channelId,requestHash,result.results);
  await complete(result.results);
  console.info('Classification batch complete',{count:messages.length,inputTokens:result.usage?.input_tokens,outputTokens:result.usage?.output_tokens});
  return {processed:messages.length};
 } catch(error) {
  const retryable=error instanceof ProviderError&&error.retryable;
  const reason=error instanceof ProviderError?error.message:'Classification failed; no result substituted.';
  await database.uncertainUsage(channelId,reservation);
  for(const job of jobs)await database.failJob(job,retryable,reason);
  return {processed:0,error:reason};
 }
}
