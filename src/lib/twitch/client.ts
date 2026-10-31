import 'server-only';
import {required} from '../server/config';
import {store} from '../database/client';
import {randomUUID} from 'node:crypto';
import {encrypt,decrypt} from '../auth/crypto';
import {HttpError} from '../server/http';
export const SCOPES=['user:read:chat','user:bot','channel:bot','moderator:manage:chat_messages'];
export interface TwitchTokens {access_token:string;refresh_token:string;expires_in:number;scope:string[]}
async function tokenRequest(params:Record<string,string>):Promise<TwitchTokens>{const response=await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...params,client_id:required('TWITCH_CLIENT_ID'),client_secret:required('TWITCH_CLIENT_SECRET')}),redirect:'error',signal:AbortSignal.timeout(10000),cache:'no-store'});if(!response.ok)throw new HttpError(502,'Twitch token exchange failed. Reconnect your account.');const result=await response.json();if(typeof result.access_token!=='string'||typeof result.refresh_token!=='string'||typeof result.expires_in!=='number'||!Array.isArray(result.scope))throw new HttpError(502,'Twitch returned an invalid token response');return result}
export const exchangeCode=(code:string)=>tokenRequest({grant_type:'authorization_code',code,redirect_uri:required('TWITCH_REDIRECT_URI')});
export async function validateToken(access:string){const response=await fetch('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${access}`},redirect:'error',signal:AbortSignal.timeout(10000),cache:'no-store'});if(!response.ok)throw new HttpError(401,'Twitch authorization expired. Reconnect your account.');const result=await response.json();if(result.client_id!==required('TWITCH_CLIENT_ID')||typeof result.user_id!=='string'||!Array.isArray(result.scopes))throw new HttpError(401,'Twitch authorization does not match this application');return result as {user_id:string;login:string;scopes:string[];client_id:string}}
export async function storeTokens(userId:string,tokens:TwitchTokens,lockToken?:string) {
 const secret=required('ENCRYPTION_KEY');
 await (await store()).saveTokens({_id:userId,user_id:userId,access_cipher:encrypt(tokens.access_token,secret),refresh_cipher:encrypt(tokens.refresh_token,secret),expires_at:new Date(Date.now()+tokens.expires_in*1000),validated_at:new Date(),scopes:tokens.scope,refresh_lock_until:new Date(0)},lockToken);
}
export async function userToken(userId:string,twitchId:string) {
 const database=await store();
 let row=await database.tokenFor(userId);
 if(!row)throw new HttpError(401,'Reconnect Twitch to authorize this application');
 if(row.expires_at.getTime()<Date.now()+60000) {
  const lockToken=randomUUID(),locked=await database.lockToken(userId,lockToken);
  if(!locked)throw new HttpError(409,'Twitch token refresh in progress. Retry shortly.');
  try {
   const tokens=await tokenRequest({grant_type:'refresh_token',refresh_token:decrypt(locked.refresh_cipher,required('ENCRYPTION_KEY'))});
   const validation=await validateToken(tokens.access_token);
   if(validation.user_id!==twitchId)throw new HttpError(401,'Token identity mismatch');
   await storeTokens(userId,tokens,lockToken);
   row=await database.tokenFor(userId);
   if(!row)throw new HttpError(401,'Reconnect Twitch');
  } catch(error) {await database.unlockToken(userId,lockToken);throw error}
 }
 const access=decrypt(row.access_cipher,required('ENCRYPTION_KEY'));
 if(row.validated_at.getTime()<Date.now()-3600000) {
  const identity=await validateToken(access);
  if(identity.user_id!==twitchId)throw new HttpError(401,'Twitch identity mismatch');
  await database.tokenValidated(userId,identity.scopes);
  row.scopes=identity.scopes;
 }
 return {access,scopes:row.scopes};
}
export async function appToken(){const response=await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:required('TWITCH_CLIENT_ID'),client_secret:required('TWITCH_CLIENT_SECRET'),grant_type:'client_credentials'}),redirect:'error',signal:AbortSignal.timeout(10000),cache:'no-store'});if(!response.ok)throw new HttpError(502,'Twitch application token unavailable');const data=await response.json();if(typeof data.access_token!=='string')throw new HttpError(502,'Invalid Twitch application token');return data.access_token as string}
export async function helix(path:string,token:string,options:RequestInit={}){const response=await fetch('https://api.twitch.tv/helix/'+path,{...options,headers:{Authorization:`Bearer ${token}`,'Client-Id':required('TWITCH_CLIENT_ID'),'Content-Type':'application/json',...options.headers},redirect:'error',signal:AbortSignal.timeout(10000),cache:'no-store'});return response}
