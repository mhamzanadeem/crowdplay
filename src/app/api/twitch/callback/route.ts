import type {AuthStage} from '@/lib/auth/errors';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {digest,safeEqual,verify} from '@/lib/auth/crypto';
import {cookieOptions,SESSION_COOKIE} from '@/lib/auth/session';
import {appUrl,required} from '@/lib/server/config';
import {HttpError} from '@/lib/server/http';
import {store} from '@/lib/database/client';
import {exchangeCode,validateToken,storeTokens,helix,SCOPES} from '@/lib/twitch/client';
import {defaultRules} from '@/lib/moderation/rules';
export const runtime='nodejs';
export async function GET(request:Request){let stage:AuthStage='state';try{const url=new URL(request.url),state=url.searchParams.get('state'),code=url.searchParams.get('code'),jar=await cookies(),expected=jar.get('crowdplay_oauth')?.value;jar.delete('crowdplay_oauth');if(!state||!expected||!safeEqual(state,expected))throw new HttpError(400,'OAuth state did not match. Start sign-in again.');verify(state,required('SESSION_SECRET'));stage='authorization';if(url.searchParams.has('error')||!code||code.length>1000)throw new HttpError(400,'Twitch authorization was not completed');stage='token';const tokens=await exchangeCode(code),identity=await validateToken(tokens.access_token);stage='permissions';if(!SCOPES.every(scope=>identity.scopes.includes(scope)))throw new HttpError(403,'Required Twitch permissions were not granted');stage='profile';const response=await helix('users',tokens.access_token);if(!response.ok)throw new HttpError(502,'Could not read Twitch account');const profile=(await response.json()).data?.[0];if(!profile||profile.id!==identity.user_id)throw new HttpError(401,'Twitch identity mismatch');stage='database';const database=await store();const account=await database.bootstrap({id:profile.id,login:profile.login,display_name:profile.display_name},defaultRules);stage='session';await storeTokens(account.userId,tokens);const session=randomBytes(32).toString('hex');await database.createSession(digest(session),account.userId);jar.set(SESSION_COOKIE,session,{...cookieOptions,maxAge:7*86400});return NextResponse.redirect(appUrl()+'/dashboard')}catch{console.error('Twitch sign-in failed',{stage});return NextResponse.redirect(appUrl()+'/dashboard?auth_error='+stage)}}
