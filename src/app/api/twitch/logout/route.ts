import {cookies} from 'next/headers';
import {store} from '@/lib/database/client';
import {digest} from '@/lib/auth/crypto';
import {SESSION_COOKIE} from '@/lib/auth/session';
import {sameOrigin,failure,noStore} from '@/lib/server/http';
export async function POST(request:Request){try{sameOrigin(request);const jar=await cookies(),token=jar.get(SESSION_COOKIE)?.value;if(token)await (await store()).deleteSession(digest(token));jar.delete(SESSION_COOKIE);return noStore({ok:true})}catch(e){return failure(e)}}
