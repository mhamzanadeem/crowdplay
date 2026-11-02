import {cacheProbe} from './cache.ts';
import {jevEnabled} from './config.ts';
import {observedJevHealth} from './observation.ts';
import {DatabaseConnectionError} from '../database/diagnostics.ts';
import {getMongoStore} from '../database/connection.ts';
import {buildRequest} from '../ai/contract.ts';
import {requestJev} from '../ai/transport.ts';
import {checkServices,ServiceCheckError} from './checks.ts';
const twitchProbe=cacheProbe(async()=>{
   const id=process.env.TWITCH_CLIENT_ID,secret=process.env.TWITCH_CLIENT_SECRET;
   if(!id||!secret)throw new ServiceCheckError('Twitch client ID or secret is missing.');
   const res=await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',body:new URLSearchParams({client_id:id,client_secret:secret,grant_type:'client_credentials'}),signal:AbortSignal.timeout(10000),redirect:'error',cache:'no-store'});
   if(!res.ok)throw new ServiceCheckError(`Twitch application authentication failed (HTTP ${res.status}). Check the client ID and secret.`);
   const token=await res.json();if(typeof token.access_token!=='string')throw new ServiceCheckError('Twitch returned an invalid application token.');
   const valid=await fetch('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${token.access_token}`},signal:AbortSignal.timeout(10000),redirect:'error',cache:'no-store'});
   if(!valid.ok||(await valid.json()).client_id!==id)throw new ServiceCheckError('Twitch application token validation failed.');

});
export async function serviceHealth(probeJev=false){
 const value=checkServices({
  MongoDB:async()=>{try{await (await getMongoStore()).database.command({ping:1},{timeoutMS:5000})}catch(e){throw new ServiceCheckError(e instanceof DatabaseConnectionError?e.message:'MongoDB configuration or connection failed. Check DB_URL and MONGODB_DB.')}},
  Twitch:twitchProbe,
  Jev:async()=>{
   if(!jevEnabled(process.env.JEV_ENABLED))return;
   if(!process.env.TYPESAFE_API_KEY)throw new ServiceCheckError('Jev / TypeSafe API key is missing. Classification is unavailable.');
   if(!probeJev)return;
   // Explicit CLI diagnostic only: never trigger paid inference from public polling.
   const request=buildRequest([{id:'connection-check',author:'system',text:'Hello, have a good stream.',at:new Date().toISOString()}],[],process.env.JEV_MODEL||'jev-1.13.0');
   try{await requestJev(request,1,{apiKey:process.env.TYPESAFE_API_KEY})}catch{throw new ServiceCheckError('Jev connection or classification validation failed. Check the API key, credits and provider availability.')}
  }
 });
 return (await value).map(s=>s.name==='Jev'?(!jevEnabled(process.env.JEV_ENABLED)?{name:'Jev',status:'deferred',message:'Optional integration deferred. No API key or connection test is required.'}:!probeJev&&process.env.TYPESAFE_API_KEY?observedJevHealth():s):s);
}
