import {MongoClient} from 'mongodb';
import {connectionUri,databaseName} from './config.ts';
import {MongoStore} from './store.ts';

// A small shared pool per warm Vercel instance; never log URI/driver errors.
const shared=globalThis as typeof globalThis&{crowdplayMongo?:Promise<MongoStore>};
export async function connectStore(uri:string,name:string) {
 const client=new MongoClient(connectionUri(uri),{
  maxPoolSize:5,minPoolSize:0,maxIdleTimeMS:30000,
  serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,
  socketTimeoutMS:20000,appName:'CrowdPlay',
 });
 try {
  await client.connect();
  const store=new MongoStore(client,client.db(databaseName(name)));
  await store.initialize();
  return store;
 } catch {
  await client.close().catch(()=>{});
  throw new Error('MongoDB connection/setup failed. Check DB_URL, Atlas network access and the database user permissions.');
 }
}
export function getMongoStore():Promise<MongoStore> {
 if(!shared.crowdplayMongo) {
  shared.crowdplayMongo=connectStore(connectionUri(process.env.DB_URL),databaseName(process.env.MONGODB_DB)).catch(error=>{shared.crowdplayMongo=undefined;throw error});
 }
 return shared.crowdplayMongo;
}
