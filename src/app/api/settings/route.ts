import {z} from 'zod';
import {after} from 'next/server';
import {actor,rateLimit} from '@/lib/auth/session';
import {store} from '@/lib/database/client';
import {failure,jsonBody,noStore} from '@/lib/server/http';
import {processChannel} from '@/lib/ai/processor';
const schema=z.object({retentionDays:z.number().int().min(1).max(30),hourlyCap:z.number().min(.01).max(50),classificationEnabled:z.boolean(),thirdPartyConsent:z.boolean(),batchSize:z.number().int().min(1).max(20)});
export const maxDuration=60;
export async function POST(request:Request){try{const settings=await jsonBody(request,schema),a=await actor();await rateLimit('settings:'+a.userId,15);await (await store()).configure(a.channelId,a.userId,{settings});after(async()=>{try{await processChannel(a.channelId)}catch{console.error('Settings processing wake failed')}});return noStore({ok:true})}catch(e){return failure(e)}}
