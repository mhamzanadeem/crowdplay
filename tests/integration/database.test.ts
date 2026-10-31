import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {defaultRules} from '../../src/lib/moderation/rules.ts';
const enabled=process.env.CROWDPLAY_RUN_DATABASE_TESTS==='1';
test('MongoDB: channel isolation, atomic duplicate ingestion, budget contention, lease fencing and confirmation replay',{skip:!enabled},async()=>{
 const name=process.env.MONGODB_TEST_DB||'';
 assert.match(name,/^crowdplay_test_[a-zA-Z0-9_-]+$/,'Use a separate MONGODB_TEST_DB named crowdplay_test_<suffix>, never the application database.');
 assert.notEqual(name,process.env.MONGODB_DB||'crowdplay');
 const {connectStore}=await import('../../src/lib/database/connection.ts');
 const database=await connectStore(process.env.DB_URL||'',name);
 const run=randomUUID(),accounts:{userId:string;channelId:string}[]=[];
 try {
  const a=await database.bootstrap({id:'test-a-'+run,login:'test_a',display_name:'Test A'},defaultRules);accounts.push(a);
  const b=await database.bootstrap({id:'test-b-'+run,login:'test_b',display_name:'Test B'},defaultRules);accounts.push(b);
  await database.configure(a.channelId,a.userId,{settings:{retentionDays:1,hourlyCap:.5,classificationEnabled:true,thirdPartyConsent:true,batchSize:20}});
  const input={twitchId:'test-message-'+run,userId:'viewer',username:'synthetic',text:'Harmless synthetic database fixture',at:new Date().toISOString(),fragments:[]};
  const accepted=await Promise.all([database.ingest(run+'-event',a.channelId,input),database.ingest(run+'-event',a.channelId,input)]);
  assert.equal(accepted.filter(Boolean).length,1);
  assert.equal(await database.messages.countDocuments({channel_id:a.channelId}),1);
  assert.equal(await database.jobs.countDocuments({channel_id:a.channelId}),1);
  const message=await database.messages.findOne({channel_id:a.channelId});assert.ok(message);
  await assert.rejects(database.ownedMessage(b.userId,a.channelId,message.id),/access denied/i);
  assert.equal(await database.messageFor(b.channelId,message.id),null);
  const reservations=await Promise.all([database.reserveUsage(a.channelId,.3),database.reserveUsage(a.channelId,.3)]);
  assert.equal(reservations.filter(Boolean).length,1,'Concurrent estimates must not exceed .5 cap');
  await database.jobs.updateMany({channel_id:a.channelId},{$set:{available_at:new Date(0)}});
  const [first,second]=await Promise.all([database.claimJobs(a.channelId,1),database.claimJobs(a.channelId,1)]);
  assert.equal(first.length+second.length,1,'One worker owns a job');
  const old=first[0]||second[0];
  await database.jobs.updateOne({_id:old.id},{$set:{lease_until:new Date(0)}});
  const [fresh]=await database.claimJobs(a.channelId,1);assert.ok(fresh);
  assert.notEqual(old.lease_token,fresh.lease_token);
  assert.equal(await database.completeJob(old,null,[],'low'),false);
  assert.equal(await database.completeJob(fresh,null,[],'low'),true);
  const intent={request_id:run+'-intent',channel_id:a.channelId,message_id:message.id,moderator_id:a.userId,kind:'delete',result:'pending' as const,note:'Synthetic intent only; no Twitch request.'};
  await database.audit(intent);await assert.rejects(database.audit(intent));
 } finally {
  // Only remove documents created by this test, and only in the separately named test DB.
  for(const account of accounts) {
   for(const collection of ['messages','classification_jobs','moderation_actions','usage_reservations','webhook_events','classification_cache','channel_members','application_settings','channel_rules'])await database.database.collection(collection).deleteMany({channel_id:account.channelId});
   await database.channels.deleteOne({_id:account.channelId});await database.users.deleteOne({_id:account.userId});
  }
  await database.client.close();
 }
});
