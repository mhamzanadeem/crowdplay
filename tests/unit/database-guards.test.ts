import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Db,MongoClient} from 'mongodb';
import {MongoStore,AccessDenied} from '../../src/lib/database/store.ts';
import type {JobDocument,TokenDocument} from '../../src/types/database.ts';
test('channel authorization rejects a missing owner membership before reading a message',async()=>{
 let messageReads=0;
 const database={collection:(name:string)=>({findOne:async()=>{if(name==='messages')messageReads++;return null}})} as unknown as Db;
 const store=new MongoStore({} as MongoClient,database);
 await assert.rejects(store.ownedMessage('user-b','channel-a','message-a'),AccessDenied);
 assert.equal(messageReads,0);
});
test('stale job completion cannot write a classification after another worker takes the lease',async()=>{
 let writes=0;
 const client={startSession:()=>({withTransaction:async(fn:()=>Promise<unknown>)=>fn(),endSession:async()=>{}})} as unknown as MongoClient;
 const database={collection:(name:string)=>({updateOne:async()=>{if(name==='messages')writes++;return {matchedCount:0}}})} as unknown as Db;
 const store=new MongoStore(client,database);
 const job={id:'message-a',message_id:'message-a',channel_id:'channel-a',lease_token:'old-lease'} as JobDocument;
 assert.equal(await store.completeJob(job,null,[],'low'),false);
 assert.equal(writes,0);
});
test('expired token-refresh lease cannot overwrite a newer encrypted token record',async()=>{
 const database={collection:()=>({replaceOne:async()=>({matchedCount:0})})} as unknown as Db;
 const store=new MongoStore({} as MongoClient,database);
 await assert.rejects(store.saveTokens({_id:'user-a'} as TokenDocument,'stale-lock'),/lease changed/);
});
