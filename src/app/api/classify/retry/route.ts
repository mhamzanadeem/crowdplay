import {z} from 'zod';
import {after} from 'next/server';
import {actor,rateLimit} from '@/lib/auth/session';
import {store} from '@/lib/database/client';
import {failure,jsonBody,noStore,HttpError} from '@/lib/server/http';
import {processChannel} from '@/lib/ai/processor';
export const maxDuration=60;
export async function POST(request:Request){try{const body=await jsonBody(request,z.object({messageId:z.uuid()})),a=await actor();await rateLimit('retry:'+a.userId,10);const queued=await (await store()).retryMessage(a.channelId,a.userId,body.messageId);if(!queued)throw new HttpError(409,'Message is unavailable or already processing.');after(async()=>{try{await processChannel(a.channelId)}catch{console.error('Explicit retry wake failed')}});return noStore({ok:true})}catch(e){return failure(e)}}
