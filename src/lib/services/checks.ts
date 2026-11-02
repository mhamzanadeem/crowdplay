export type ServiceState={name:'MongoDB'|'Twitch'|'Jev';status:'connected'|'unavailable'|'unverified'|'deferred';message:string};
export async function checkServices(probes:Record<ServiceState['name'],()=>Promise<void>>):Promise<ServiceState[]> {
 return Promise.all((Object.keys(probes) as ServiceState['name'][]).map(async name=>{
  try {await probes[name]();return {name,status:'connected' as const,message:'Connection verified'};}
  catch(error){return {name,status:'unavailable' as const,message:error instanceof ServiceCheckError?error.message:'Connection failed or timed out. Check server configuration and network access.'};}
 }));
}
export class ServiceCheckError extends Error {}
