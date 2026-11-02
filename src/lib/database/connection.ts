import {DatabaseConnectionError} from './diagnostics.ts';
import {setServers} from 'node:dns';
import {MongoClient} from 'mongodb';
import {connectionUri,databaseName,mongoDnsServers} from './config.ts';
import {MongoStore} from './store.ts';

// A small shared pool per warm Vercel instance; never log URI/driver errors.
const shared=globalThis as typeof globalThis&{crowdplayMongo?:Promise<MongoStore>};
export async function connectStore(uri:string,name:string) {
 // Let the native driver resolve SRV/TXT and perform discovery/retries itself.
 // A separate three-second preflight incorrectly rejected slow but valid DNS.
 const servers=mongoDnsServers(process.env.MONGODB_DNS_SERVERS);
 if(servers.length)setServers(servers);
 let client:MongoClient|undefined;
 try {
 client=new MongoClient(connectionUri(uri),{
  maxPoolSize:5,minPoolSize:0,maxIdleTimeMS:30000,
  serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,
  socketTimeoutMS:20000,appName:'CrowdPlay',
 });
  await client.connect();
  const store=new MongoStore(client,client.db(databaseName(name)));
  await store.initialize();
  return store;
 } catch(error) {
  await client?.close().catch(()=>{});
  throw new DatabaseConnectionError(error);
 }
}
export function getMongoStore():Promise<MongoStore> {
 if(!shared.crowdplayMongo) {
  shared.crowdplayMongo=connectStore(connectionUri(process.env.DB_URL),databaseName(process.env.MONGODB_DB)).catch(error=>{shared.crowdplayMongo=undefined;throw error});
 }
 return shared.crowdplayMongo;
}
