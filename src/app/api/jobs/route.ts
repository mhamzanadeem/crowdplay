import {store} from '@/lib/database/client';
import {required} from '@/lib/server/config';
import {safeEqual} from '@/lib/auth/crypto';
import {failure,noStore,HttpError} from '@/lib/server/http';
import {processChannel} from '@/lib/ai/processor';
export const maxDuration=60;
export async function GET(request:Request) {
 try {
  if(!safeEqual(request.headers.get('authorization')||'','Bearer '+required('CRON_SECRET')))throw new HttpError(401,'Unauthorized');
  const database=await store();
  await database.cleanup();
  const start=Date.now();let processed=0;
  for(const channelId of await database.pendingChannels()) {
   if(Date.now()-start>35000)break;
   await database.recoverJobs(channelId);
   processed+=(await processChannel(channelId)).processed;
  }
  return noStore({processed});
 } catch(error) {return failure(error)}
}
