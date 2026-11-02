import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {randomBytes} from 'node:crypto';
import {sign} from '@/lib/auth/crypto';
import {cookieOptions} from '@/lib/auth/session';
import {appUrl,required} from '@/lib/server/config';
import {store} from '@/lib/database/client';
import type {AuthStage} from '@/lib/auth/errors';
import {SCOPES} from '@/lib/twitch/client';
export const runtime='nodejs';
export async function GET(request:Request){let stage:AuthStage='configuration';try{if(new URL(request.url).origin!==appUrl())return NextResponse.redirect(appUrl()+'/api/twitch/login');if(new URL(required('TWITCH_REDIRECT_URI')).origin!==appUrl())throw new Error('OAuth origin mismatch');stage='database';await store();stage='configuration';const state=sign({nonce:randomBytes(32).toString('hex'),exp:Date.now()+600000},required('SESSION_SECRET'));(await cookies()).set('crowdplay_oauth',state,{...cookieOptions,maxAge:600});const url=new URL('https://id.twitch.tv/oauth2/authorize');url.search=new URLSearchParams({client_id:required('TWITCH_CLIENT_ID'),redirect_uri:required('TWITCH_REDIRECT_URI'),response_type:'code',scope:SCOPES.join(' '),state,force_verify:'true'}).toString();if(new URL(required('TWITCH_REDIRECT_URI')).origin!==appUrl())throw new Error('OAuth redirect must match application origin');return NextResponse.redirect(url)}catch{console.error('Twitch sign-in start failed',{stage});return NextResponse.redirect(appUrl()+'/dashboard?auth_error='+stage)}}
