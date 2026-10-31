import {actor,rateLimit} from '@/lib/auth/session';
import {getWorkspace} from '@/lib/database/repository';
import {failure,noStore} from '@/lib/server/http';
import {after} from 'next/server';
import {store} from '@/lib/database/client';
import {processChannel} from '@/lib/ai/processor';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(){try{const a=await actor();await rateLimit('workspace:'+a.userId,60);const workspace=await getWorkspace(a);if(workspace.settings.classificationEnabled&&workspace.settings.thirdPartyConsent&&workspace.messages.some(m=>m.processing!=='complete')){const wake=await (await store()).checkRate('wake:'+a.channelId,1,10);if(wake)after(async()=>{try{await (await store()).recoverJobs(a.channelId);await processChannel(a.channelId)}catch{console.error('Workspace processing wake failed')}})}return noStore(workspace)}catch(e){return failure(e)}}
