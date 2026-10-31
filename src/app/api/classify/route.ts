import {actor,rateLimit} from '@/lib/auth/session';
import {failure,noStore,sameOrigin} from '@/lib/server/http';
import {processChannel} from '@/lib/ai/processor';
import {store} from '@/lib/database/client';
export const maxDuration=60;
export async function POST(request:Request){try{sameOrigin(request);const a=await actor();await rateLimit('process:'+a.userId,10);await (await store()).recoverJobs(a.channelId);return noStore(await processChannel(a.channelId))}catch(e){return failure(e)}}
