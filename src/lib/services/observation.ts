import type {ServiceState} from './checks.ts';
const shared=globalThis as typeof globalThis&{crowdplayJevHealth?:{until:number;status:ServiceState}};
export function recordJevHealth(connected:boolean){shared.crowdplayJevHealth={until:Date.now()+300000,status:{name:'Jev',status:connected?'connected':'unavailable',message:connected?'Classification response verified':'Jev request failed. Check API key, credits and provider availability.'}}}
export function observedJevHealth():ServiceState{return shared.crowdplayJevHealth&&shared.crowdplayJevHealth.until>Date.now()?shared.crowdplayJevHealth.status:{name:'Jev',status:'unverified',message:'Connection not yet verified. Sign in, enable processing consent and run the connection test in Settings.'}}
