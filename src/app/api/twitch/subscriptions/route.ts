import {actor,rateLimit} from '@/lib/auth/session';
import {sameOrigin,failure,noStore,HttpError} from '@/lib/server/http';
import {appUrl,required} from '@/lib/server/config';
import {appToken,helix,userToken} from '@/lib/twitch/client';
import {store} from '@/lib/database/client';

interface Subscription {
 id:string;
 type:string;
 status:string;
 condition:{broadcaster_user_id:string;user_id?:string};
 transport:{method:string;callback?:string};
}
async function existingSubscriptions(token:string):Promise<Subscription[]> {
 const all:Subscription[]=[];
 let cursor='';
 for(let page=0;page<5;page++) {
  const response=await helix('eventsub/subscriptions?'+new URLSearchParams({first:'100',...(cursor?{after:cursor}:{})}),token);
  if(!response.ok)throw new HttpError(502,'Could not check existing Twitch subscriptions');
  const result=await response.json();
  all.push(...(result.data||[]));
  cursor=result.pagination?.cursor||'';
  if(!cursor)return all;
 }
 throw new HttpError(409,'Subscription list exceeds the inspection limit. Inspect subscriptions in Twitch developer tools.');
}
export async function POST(request:Request) {
 try {
  sameOrigin(request);
  const a=await actor();
  await rateLimit('subscribe:'+a.userId,5);
  const grant=await userToken(a.userId,a.twitchId);
  if(!['user:read:chat','user:bot','channel:bot'].every(s=>grant.scopes.includes(s)))throw new HttpError(403,'Reconnect Twitch to grant chat reading permissions');
  if(new URL(appUrl()).protocol!=='https:')throw new HttpError(400,'EventSub requires a public HTTPS callback. Deploy to Vercel first.');
  const secret=required('TWITCH_EVENTSUB_SECRET');
  if(secret.length<10||secret.length>100)throw new Error('EventSub secret must be 10–100 characters');
  const token=await appToken(),client=await store(),existing=await existingSubscriptions(token);
  const statuses:Record<string,string>={};
  for(const type of ['channel.chat.message','channel.chat.message_delete']) {
   const match=existing.find(s=>s.type===type&&s.condition.broadcaster_user_id===a.twitchId&&s.condition.user_id===a.twitchId&&s.transport.method==='webhook');
   if(match) {
    if(match.transport.callback!==appUrl()+'/api/eventsub')throw new HttpError(409,'An existing chat subscription points to another callback. Remove it through Twitch developer tools before connecting this deployment.');
    if(match.status==='enabled'||match.status==='webhook_callback_verification_pending') {
     statuses[type]=match.status;
     continue;
    }
    const removed=await helix('eventsub/subscriptions?'+new URLSearchParams({id:match.id}),token,{method:'DELETE'});
    if(removed.status!==204)throw new HttpError(502,'Could not replace a revoked Twitch subscription');
   }
   const response=await helix('eventsub/subscriptions',token,{method:'POST',body:JSON.stringify({type,version:'1',condition:{broadcaster_user_id:a.twitchId,user_id:a.twitchId},transport:{method:'webhook',callback:appUrl()+'/api/eventsub',secret}})});
   if(!response.ok) {
    await client.subscriptionStatus(a.channelId,'subscription_failed');
    throw new HttpError(502,`Twitch subscription failed (HTTP ${response.status}). Check authorization and callback settings.`);
   }
   const result=await response.json();
   statuses[type]=result.data?.[0]?.status||'webhook_callback_verification_pending';
  }
  const status=Object.values(statuses).every(s=>s==='enabled')?'enabled':'webhook_callback_verification_pending';
  await client.subscriptionStatus(a.channelId,status);
  return noStore({status,subscriptions:statuses});
 } catch(error) {
  return failure(error);
 }
}
