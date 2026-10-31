import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {randomBytes} from 'node:crypto';
import {sign} from '@/lib/auth/crypto';
import {cookieOptions} from '@/lib/auth/session';
import {appUrl,required} from '@/lib/server/config';
import {failure} from '@/lib/server/http';
import {SCOPES} from '@/lib/twitch/client';
export const runtime='nodejs';
export async function GET(){try{const state=sign({nonce:randomBytes(32).toString('hex'),exp:Date.now()+600000},required('SESSION_SECRET'));(await cookies()).set('crowdplay_oauth',state,{...cookieOptions,maxAge:600});const url=new URL('https://id.twitch.tv/oauth2/authorize');url.search=new URLSearchParams({client_id:required('TWITCH_CLIENT_ID'),redirect_uri:required('TWITCH_REDIRECT_URI'),response_type:'code',scope:SCOPES.join(' '),state,force_verify:'true'}).toString();if(new URL(required('TWITCH_REDIRECT_URI')).origin!==appUrl())throw new Error('OAuth redirect must match application origin');return NextResponse.redirect(url)}catch(e){return failure(e)}}
