import 'server-only';
import {cookies} from 'next/headers';
import {store} from '../database/client';
import {digest} from './crypto';
import {HttpError} from '../server/http';
import {readiness} from '../server/config';
export const SESSION_COOKIE='crowdplay_session';
export const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
export interface Actor {userId:string;channelId:string;twitchId:string;login:string;name:string;role:'owner'|'moderator'}
export async function actor():Promise<Actor> {
 if(!readiness().database)throw new HttpError(401,'Sign in with Twitch to use a live workspace');
 const token=(await cookies()).get(SESSION_COOKIE)?.value;
 if(!token||!/^[a-f0-9]{64}$/.test(token))throw new HttpError(401,'Sign in with Twitch');
 const identity=await (await store()).sessionActor(digest(token));
 if(!identity)throw new HttpError(401,'Session expired or no authorized channel');
 return {userId:identity.user.id,channelId:identity.member.channel_id,twitchId:identity.user.twitch_id,login:identity.user.login,name:identity.user.display_name,role:identity.member.role};
}
export async function rateLimit(key:string,limit=30,seconds=60) {
 if(!await (await store()).checkRate(key,limit,seconds))throw new HttpError(429,'Too many requests. Please wait before trying again.');
}
