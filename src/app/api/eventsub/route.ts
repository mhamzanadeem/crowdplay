import {after} from 'next/server';
import {z} from 'zod';
import {verifyEvent} from '@/lib/twitch/eventsub';
import {required} from '@/lib/server/config';
import {limitedBody,failure,HttpError} from '@/lib/server/http';
import {store} from '@/lib/database/client';
import {processChannel} from '@/lib/ai/processor';
export const runtime='nodejs';
export const maxDuration=60;
const envelope=z.object({subscription:z.object({type:z.string(),version:z.string(),status:z.string().optional(),condition:z.object({broadcaster_user_id:z.string(),user_id:z.string().optional()})}),challenge:z.string().max(1000).optional(),event:z.unknown().optional()});
const chat=z.object({broadcaster_user_id:z.string().regex(/^\d+$/),chatter_user_id:z.string().regex(/^\d+$/),chatter_user_name:z.string().min(1).max(100),message_id:z.string().min(1).max(128),message:z.object({text:z.string().max(2000),fragments:z.array(z.unknown()).max(500)})});
export async function POST(request:Request) {
 try {
  const raw=await limitedBody(request,262144);
  if(!verifyEvent(raw,request.headers,required('TWITCH_EVENTSUB_SECRET')))throw new HttpError(403,'Invalid EventSub signature or timestamp');
  const parsed=envelope.safeParse(JSON.parse(raw));
  if(!parsed.success)throw new HttpError(400,'Malformed EventSub envelope');
  const body=parsed.data,type=request.headers.get('twitch-eventsub-message-type'),eventId=request.headers.get('twitch-eventsub-message-id')!;
  if(body.subscription.version!=='1')throw new HttpError(400,'Unsupported subscription version');
  if(type==='webhook_callback_verification') {
   if(!body.challenge)throw new HttpError(400,'Missing challenge');
   return new Response(body.challenge,{status:200,headers:{'Content-Type':'text/plain'}});
  }
  const database=await store(),channel=await database.channelForTwitch(body.subscription.condition.broadcaster_user_id);
  if(!channel)return new Response(null,{status:204});
  if(type==='revocation') {
   await database.subscriptionStatus(channel.id,body.subscription.status||'revoked');
   return new Response(null,{status:204});
  }
  if(type!=='notification')throw new HttpError(400,'Unsupported EventSub message type');
  if(body.subscription.type==='channel.chat.message') {
   const event=chat.safeParse(body.event);
   if(!event.success||event.data.broadcaster_user_id!==channel.twitch_id)throw new HttpError(400,'Invalid chat payload');
   const e=event.data;
   await database.ingest(eventId,channel.id,{twitchId:e.message_id,userId:e.chatter_user_id,username:e.chatter_user_name,text:e.message.text,at:request.headers.get('twitch-eventsub-message-timestamp')!,fragments:e.message.fragments});
   after(async()=>{try{await processChannel(channel.id)}catch{console.error('Classification wake failed',{channelId:channel.id})}});
  } else if(body.subscription.type==='channel.chat.message_delete') {
   const event=z.object({broadcaster_user_id:z.string(),message_id:z.string()}).safeParse(body.event);
   if(!event.success||event.data.broadcaster_user_id!==channel.twitch_id)throw new HttpError(400,'Invalid deletion payload');
   await database.observedDeletion(eventId,channel.id,event.data.message_id);
  }
  return new Response(null,{status:204});
 } catch(error) {return failure(error)}
}
