import {z} from 'zod';
import {actor,rateLimit} from '@/lib/auth/session';
import {checkConfirmation} from '@/lib/auth/confirmation';
import {messageFor} from '@/lib/database/repository';
import {store} from '@/lib/database/client';
import {duplicateKey} from '@/lib/database/store';
import {required} from '@/lib/server/config';
import {failure,jsonBody,noStore,HttpError} from '@/lib/server/http';
import {userToken,helix} from '@/lib/twitch/client';
const schema=z.object({messageId:z.uuid(),kind:z.enum(['reviewed','dismissed','confirmed_violation','investigate','delete']),note:z.string().max(1000).default(''),confirmation:z.string().max(4096).optional()});
export async function POST(request:Request) {
 try {
  const body=await jsonBody(request,schema),a=await actor();
  await rateLimit('review:'+a.userId,30);
  const database=await store(),message=await messageFor(a.channelId,body.messageId);
  if(!message)throw new HttpError(404,'Message is not available in this channel');
  if(body.kind!=='delete') {
   await database.recordReview(a.channelId,message.id,a.userId,body.kind,body.note);
   return noStore({ok:true});
  }
  if(!body.confirmation)throw new HttpError(400,'Explicit message confirmation is required');
  let nonce:string;
  try {
   nonce=checkConfirmation(body.confirmation,{userId:a.userId,channelId:a.channelId,messageId:message.id,twitchMessageId:message.twitch_id,text:message.body},required('SESSION_SECRET'));
  } catch {throw new HttpError(400,'Message confirmation expired or does not match. Review and confirm again.')}
  if(Date.now()-Date.parse(message.sent_at)>6*3600000||message.user_id===a.twitchId)throw new HttpError(400,'Message is not eligible for Twitch deletion');
  const token=await userToken(a.userId,a.twitchId);
  if(!token.scopes.includes('moderator:manage:chat_messages'))throw new HttpError(403,'Reconnect Twitch to grant message deletion permission');
  const audit={request_id:nonce,channel_id:a.channelId,message_id:message.id,moderator_id:a.userId,kind:'delete'};
  // Unique (request_id,result) consumes this confirmation before any external call.
  try {await database.audit({...audit,result:'pending',note:body.note})}
  catch(error){if(duplicateKey(error))throw new HttpError(409,'This confirmation was already used. Check the audit log.');throw error}
  let response:Response;
  try {
   response=await helix('moderation/chat?'+new URLSearchParams({broadcaster_id:a.twitchId,moderator_id:a.twitchId,message_id:message.twitch_id}),token.access,{method:'DELETE'});
  } catch {
   await database.audit({...audit,result:'failed',note:'Twitch delivery outcome unknown. Inspect Twitch before retrying.'});
   throw new HttpError(502,'Twitch outcome unknown. Check the channel and audit log before retrying.');
  }
  await database.audit({...audit,result:response.status===204?'success':'failed',note:response.status===204?'Twitch confirmed deletion.':`Twitch rejected deletion (HTTP ${response.status}).`});
  if(response.status!==204)throw new HttpError(502,`Twitch rejected deletion (HTTP ${response.status}). The message may be too old, already deleted, or belong to a protected user.`);
  await database.recordReview(a.channelId,message.id,a.userId,'action_taken',body.note);
  return noStore({ok:true});
 } catch(error) {return failure(error)}
}
