import {z} from 'zod';
import {actor,rateLimit} from '@/lib/auth/session';
import {store} from '@/lib/database/client';
import {defaultRules} from '@/lib/moderation/rules';
import {failure,jsonBody,noStore,HttpError} from '@/lib/server/http';
const schema=z.object({rules:z.array(z.object({id:z.string(),enabled:z.boolean(),threshold:z.number().positive().max(1000),sensitivity:z.enum(['low','medium','high'])})).length(defaultRules.length)});
export async function POST(request:Request){try{const body=await jsonBody(request,schema),a=await actor();await rateLimit('rules:'+a.userId,15);if(new Set(body.rules.map(r=>r.id)).size!==defaultRules.length||!body.rules.every(r=>defaultRules.some(d=>d.id===r.id)))throw new HttpError(400,'Unknown or duplicate rule');const rules=defaultRules.map(d=>{const input=body.rules.find(r=>r.id===d.id)!;if(d.kind==='local'&&(!Number.isInteger(input.threshold)||(d.id==='caps'&&input.threshold>100)))throw new HttpError(400,'Invalid local rule threshold');return {...d,...input}});await (await store()).configure(a.channelId,a.userId,{rules});return noStore({ok:true})}catch(e){return failure(e)}}
