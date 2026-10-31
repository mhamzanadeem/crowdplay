import {z} from 'zod';
import {actor,rateLimit} from '@/lib/auth/session';
import {createConfirmation} from '@/lib/auth/confirmation';
import {messageFor} from '@/lib/database/repository';
import {required} from '@/lib/server/config';
import {failure,jsonBody,noStore,HttpError} from '@/lib/server/http';
export async function POST(request:Request){try{const body=await jsonBody(request,z.object({messageId:z.uuid()})),a=await actor();await rateLimit('prepare:'+a.userId,20);const m=await messageFor(a.channelId,body.messageId);if(!m)throw new HttpError(404,'Message unavailable');if(Date.now()-Date.parse(m.sent_at)>6*3600000)throw new HttpError(400,'Twitch only allows deletion within six hours');if(m.user_id===a.twitchId)throw new HttpError(400,'The broadcaster’s own messages cannot be deleted with this endpoint');const confirmation=createConfirmation({userId:a.userId,channelId:a.channelId,messageId:m.id,twitchMessageId:m.twitch_id,text:m.body},required('SESSION_SECRET'));return noStore({confirmation,expiresIn:120})}catch(e){return failure(e)}}
