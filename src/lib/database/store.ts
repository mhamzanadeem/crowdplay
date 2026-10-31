import {randomUUID} from 'node:crypto';
import type {ClientSession,Db,MongoClient} from 'mongodb';
import type {Classification,Rule,Settings,Signal,Risk,ReviewStatus} from '../../types/domain.ts';
import type {UserDocument,ChannelDocument,MemberDocument,TokenDocument,SessionDocument,SettingsDocument,RulesDocument,MessageDocument,ActionDocument,JobDocument,UsageDocument,EventDocument,CacheDocument,LimitDocument} from '../../types/database.ts';

export function duplicateKey(error:unknown):boolean {
 return !!error&&typeof error==='object'&&'code' in error&&error.code===11000;
}
const days=(n:number)=>new Date(Date.now()+n*86400000);
export class AccessDenied extends Error {}
export class MongoStore {
 readonly client:MongoClient;
 readonly database:Db;
 constructor(client:MongoClient,database:Db) {this.client=client;this.database=database}
 get users(){return this.database.collection<UserDocument>('app_users')}
 get channels(){return this.database.collection<ChannelDocument>('channels')}
 get members(){return this.database.collection<MemberDocument>('channel_members')}
 get tokens(){return this.database.collection<TokenDocument>('oauth_tokens')}
 get sessions(){return this.database.collection<SessionDocument>('app_sessions')}
 get settings(){return this.database.collection<SettingsDocument>('application_settings')}
 get rules(){return this.database.collection<RulesDocument>('channel_rules')}
 get messages(){return this.database.collection<MessageDocument>('messages')}
 get actions(){return this.database.collection<ActionDocument>('moderation_actions')}
 get jobs(){return this.database.collection<JobDocument>('classification_jobs')}
 get usage(){return this.database.collection<UsageDocument>('usage_reservations')}
 get events(){return this.database.collection<EventDocument>('webhook_events')}
 get cache(){return this.database.collection<CacheDocument>('classification_cache')}
 get limits(){return this.database.collection<LimitDocument>('request_limits')}

 async initialize() {
  // Index creation is idempotent and completes before any multi-document transaction.
  await Promise.all([
   this.users.createIndex({twitch_id:1},{unique:true}),
   this.channels.createIndex({twitch_id:1},{unique:true}),
   this.members.createIndex({user_id:1,role:1}),
   this.members.createIndex({channel_id:1,user_id:1},{unique:true}),
   this.settings.createIndex({channel_id:1},{unique:true}),
   this.rules.createIndex({channel_id:1},{unique:true}),
   this.tokens.createIndex({user_id:1},{unique:true}),
   this.messages.createIndex({channel_id:1,twitch_id:1},{unique:true}),
   this.messages.createIndex({channel_id:1,sent_at:-1}),
   this.messages.createIndex({channel_id:1,user_id:1,sent_at:-1}),
   this.jobs.createIndex({channel_id:1,status:1,available_at:1}),
   this.actions.createIndex({request_id:1,result:1},{unique:true}),
   this.actions.createIndex({channel_id:1,created_at:-1}),
   this.usage.createIndex({channel_id:1,created_at:-1}),
   ...[this.messages,this.jobs,this.actions,this.usage,this.events,this.cache,this.sessions,this.limits].map(c=>c.createIndex({expires_at:1},{expireAfterSeconds:0})),
  ]);
 }
 async transaction<T>(fn:(session:ClientSession)=>Promise<T>):Promise<T> {
  const session=this.client.startSession();
  try {
   return await session.withTransaction(()=>fn(session),{
    readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:10000,
   });
  } finally {await session.endSession()}
 }
 async requireOwner(userId:string,channelId:string,session?:ClientSession) {
  const member=await this.members.findOne({user_id:userId,channel_id:channelId,role:'owner'},{session});
  if(!member)throw new AccessDenied('Channel access denied');
  return member;
 }
 async bootstrap(profile:{id:string;login:string;display_name:string},rules:Rule[]) {
  // Unique Twitch indexes serialize concurrent first logins; retry a duplicate insert once.
  for(let attempt=0;attempt<2;attempt++) {
   try {return await this.transaction(async session=>{
    let user=await this.users.findOne({twitch_id:profile.id},{session});
    if(!user) {
     const id=randomUUID();user={_id:id,id,twitch_id:profile.id,login:profile.login,display_name:profile.display_name,created_at:new Date()};
     await this.users.insertOne(user,{session});
    } else {
     await this.users.updateOne({_id:user._id},{$set:{login:profile.login,display_name:profile.display_name}},{session});
    }
    let channel=await this.channels.findOne({twitch_id:profile.id},{session});
    if(!channel) {
     const id=randomUUID();channel={_id:id,id,twitch_id:profile.id,login:profile.login,display_name:profile.display_name,subscription_status:'not_subscribed',last_event_at:null,created_at:new Date()};
     await this.channels.insertOne(channel,{session});
    } else {
     await this.channels.updateOne({_id:channel._id},{$set:{login:profile.login,display_name:profile.display_name}},{session});
    }
    await this.members.updateOne({_id:channel.id+':'+user.id},{$set:{channel_id:channel.id,user_id:user.id,role:'owner'}},{upsert:true,session});
    await this.settings.updateOne({_id:channel.id},{$setOnInsert:{channel_id:channel.id,retention_days:7,hourly_cap:.5,classification_enabled:false,third_party_consent:false,batch_size:20,budget_version:0}},{upsert:true,session});
    await this.rules.updateOne({_id:channel.id},{$setOnInsert:{channel_id:channel.id,rules,updated_at:new Date()}},{upsert:true,session});
    return {userId:user.id,channelId:channel.id};
   })} catch(error) {if(attempt===1||!duplicateKey(error))throw error}
  }
  throw new Error('Account initialization failed');
 }
 async createSession(hash:string,userId:string) {
  await this.sessions.insertOne({_id:hash,token_hash:hash,user_id:userId,expires_at:days(7),created_at:new Date()});
 }
 async sessionActor(hash:string) {
  const session=await this.sessions.findOne({_id:hash,expires_at:{$gt:new Date()}});
  if(!session)return null;
  const member=await this.members.findOne({user_id:session.user_id,role:'owner'});
  if(!member)return null;
  const user=await this.users.findOne({_id:session.user_id});
  return user?{user,member}:null;
 }
 async deleteSession(hash:string){await this.sessions.deleteOne({_id:hash})}
 async saveTokens(row:TokenDocument,lockToken?:string){const result=await this.tokens.replaceOne({_id:row._id,...(lockToken?{refresh_lock_token:lockToken}:{})},row,{upsert:!lockToken});if(lockToken&&!result.matchedCount)throw new Error('Twitch token refresh lease changed; reconnect or retry.');}
 async tokenFor(userId:string){return this.tokens.findOne({_id:userId})}
 async lockToken(userId:string,lockToken:string) {
  return this.tokens.findOneAndUpdate({_id:userId,refresh_lock_until:{$lt:new Date()}},{$set:{refresh_lock_until:new Date(Date.now()+30000),refresh_lock_token:lockToken}},{returnDocument:'after'});
 }
 async unlockToken(userId:string,lockToken:string){await this.tokens.updateOne({_id:userId,refresh_lock_token:lockToken},{$set:{refresh_lock_until:new Date(0)},$unset:{refresh_lock_token:''}})}
 async tokenValidated(userId:string,scopes:string[]){await this.tokens.updateOne({_id:userId},{$set:{validated_at:new Date(),scopes}})}
 async channelForTwitch(twitchId:string){return this.channels.findOne({twitch_id:twitchId})}
 async subscriptionStatus(channelId:string,status:string){await this.channels.updateOne({_id:channelId},{$set:{subscription_status:status}})}
 async settingsFor(channelId:string){const row=await this.settings.findOne({_id:channelId});if(!row)throw new Error('Channel settings missing');return row}
 async rulesFor(channelId:string){return (await this.rules.findOne({_id:channelId}))?.rules||[]}
 async messageFor(channelId:string,messageId:string){const settings=await this.settingsFor(channelId);return this.messages.findOne({_id:messageId,channel_id:channelId,sent_at:{$gt:new Date(Date.now()-settings.retention_days*86400000).toISOString()},expires_at:{$gt:new Date()}})}
 async ownedMessage(userId:string,channelId:string,messageId:string){await this.requireOwner(userId,channelId);return this.messageFor(channelId,messageId)}

 async ingest(eventId:string,channelId:string,input:{twitchId:string;userId:string;username:string;text:string;at:string;fragments:unknown[]}) {
  try {return await this.transaction(async session=>{
   if(await this.events.findOne({_id:eventId},{session}))return false;
   await this.events.insertOne({_id:eventId,channel_id:channelId,event_type:'channel.chat.message',received_at:new Date(),expires_at:days(7)},{session});
   if(await this.messages.findOne({channel_id:channelId,twitch_id:input.twitchId},{session}))return false;
   const settings=await this.settings.findOne({_id:channelId},{session});
   if(!settings)throw new Error('Channel settings missing');
   const id=randomUUID(),expires=days(settings.retention_days);
   await this.messages.insertOne({_id:id,id,channel_id:channelId,twitch_id:input.twitchId,user_id:input.userId,username:input.username,body:input.text,sent_at:new Date(input.at).toISOString(),fragments:input.fragments,classification:null,signals:[],risk:'low',review_status:'pending',processing:'pending',error:null,expires_at:expires},{session});
   await this.jobs.insertOne({_id:id,id,channel_id:channelId,message_id:id,status:'pending',attempts:0,available_at:new Date(Date.now()+800),lease_until:null,lease_token:null,error:null,created_at:new Date(),expires_at:expires},{session});
   await this.channels.updateOne({_id:channelId},{$set:{last_event_at:new Date().toISOString(),subscription_status:'enabled'}},{session});
   return true;
  })} catch(error) {
   // A duplicate index race must roll back the entire transaction, not orphan a job.
   if(duplicateKey(error))return false;
   throw error;
  }
 }
 async audit(input:Omit<ActionDocument,'_id'|'id'|'created_at'|'expires_at'>,session?:ClientSession) {
  const settings=await this.settings.findOne({_id:input.channel_id},{session});
  const id=randomUUID();
  await this.actions.insertOne({...input,_id:id,id,created_at:new Date(),expires_at:days(settings?.retention_days||7)},{session});
 }
 async recordReview(channelId:string,messageId:string,userId:string,decision:ReviewStatus,note:string) {
  await this.transaction(async session=>{
   await this.requireOwner(userId,channelId,session);
   const result=await this.messages.updateOne({_id:messageId,channel_id:channelId,expires_at:{$gt:new Date()}},{$set:{review_status:decision}},{session});
   if(!result.matchedCount)throw new AccessDenied('Message unavailable in this channel');
   await this.audit({request_id:randomUUID(),channel_id:channelId,message_id:messageId,moderator_id:userId,kind:decision,result:'recorded',note},session);
  });
 }
 async observedDeletion(eventId:string,channelId:string,twitchMessageId:string) {
  try {await this.transaction(async session=>{
   if(await this.events.findOne({_id:eventId},{session}))return;
   await this.events.insertOne({_id:eventId,channel_id:channelId,event_type:'channel.chat.message_delete',received_at:new Date(),expires_at:days(7)},{session});
   const message=await this.messages.findOneAndUpdate({channel_id:channelId,twitch_id:twitchMessageId},{$set:{review_status:'action_taken'}},{session,returnDocument:'after'});
   await this.audit({request_id:eventId,channel_id:channelId,message_id:message?.id||null,moderator_id:null,kind:'twitch_message_deleted',result:'recorded',note:'Deletion observed through EventSub; moderator identity is not inferred.'},session);
  })} catch(error) {if(!duplicateKey(error))throw error}
 }
 async configure(channelId:string,userId:string,change:{rules?:Rule[];settings?:Settings}) {
  await this.transaction(async session=>{
   await this.requireOwner(userId,channelId,session);
   if(change.rules)await this.rules.updateOne({_id:channelId},{$set:{rules:change.rules,updated_at:new Date()}},{session});
   if(change.settings) {
    const s=change.settings;
    await this.settings.updateOne({_id:channelId},{$set:{retention_days:s.retentionDays,hourly_cap:s.hourlyCap,classification_enabled:s.classificationEnabled,third_party_consent:s.thirdPartyConsent,batch_size:s.batchSize}},{session});
    await this.jobs.updateMany({channel_id:channelId,status:'paused'},{$set:{status:'pending',attempts:0,available_at:new Date(),error:null}},{session});
    // Shortening retention takes effect on the next read immediately and cleanup/TTL later.
   }
   await this.audit({request_id:randomUUID(),channel_id:channelId,message_id:null,moderator_id:userId,kind:change.rules?'rules_changed':'settings_changed',result:'recorded',note:'Channel configuration updated.'},session);
  });
 }
 async checkRate(key:string,limit:number,seconds:number) {
  const now=new Date(),cutoff=new Date(Date.now()-seconds*1000);
  const update=[{$set:{count:{$cond:[{$lt:[{$ifNull:['$window_start',new Date(0)]},cutoff]},1,{$add:[{$ifNull:['$count',0]},1]}]},window_start:{$cond:[{$lt:[{$ifNull:['$window_start',new Date(0)]},cutoff]},now,'$window_start']},expires_at:days(1)}}];
  let row:LimitDocument|null;
  try{row=await this.limits.findOneAndUpdate({_id:key},update,{upsert:true,returnDocument:'after'})}
  catch(error){if(!duplicateKey(error))throw error;row=await this.limits.findOneAndUpdate({_id:key},update,{returnDocument:'after'})}
  return !!row&&row.count<=limit;
 }
 async reserveUsage(channelId:string,amount:number) {
  if(!Number.isFinite(amount)||amount<=0)return null;
  return this.transaction(async session=>{
   // Writing the same channel document serializes concurrent reservation transactions.
   const settings=await this.settings.findOneAndUpdate({_id:channelId,classification_enabled:true,third_party_consent:true},{$inc:{budget_version:1}},{session,returnDocument:'after'});
   if(!settings)return null;
   const entries=await this.usage.find({channel_id:channelId,created_at:{$gt:new Date(Date.now()-3600000)}},{session}).toArray();
   const spent=entries.reduce((sum,r)=>sum+(r.actual_usd??r.reserved_usd),0);
   if(spent+amount>settings.hourly_cap)return null;
   const id=randomUUID();
   await this.usage.insertOne({_id:id,channel_id:channelId,reserved_usd:amount,actual_usd:null,state:'reserved',created_at:new Date(),expires_at:days(7),input_tokens:null,output_tokens:null,latency_ms:null},{session});
   return id;
  });
 }
 async settleUsage(channelId:string,id:string,cost:number|null,usage:{input_tokens:number;output_tokens:number}|null,latency:number) {
  await this.transaction(async session=>{
   const row=await this.usage.findOne({_id:id,channel_id:channelId},{session});
   if(!row)throw new Error('Usage reservation missing');
   await this.usage.updateOne({_id:id,channel_id:channelId},{$set:{actual_usd:cost,state:cost===null?'uncertain':'settled',input_tokens:usage?.input_tokens??null,output_tokens:usage?.output_tokens??null,latency_ms:latency}},{session});
   if(cost===null||cost>row.reserved_usd)await this.settings.updateOne({_id:channelId},{$set:{classification_enabled:false}},{session});
  });
 }
 async uncertainUsage(channelId:string,id:string){await this.usage.updateOne({_id:id,channel_id:channelId},{$set:{state:'uncertain'}})}
 async claimJobs(channelId:string,limit:number) {
  const result:JobDocument[]=[];
  const settings=await this.settingsFor(channelId),cutoff=new Date(Date.now()-settings.retention_days*86400000);
  for(let i=0;i<Math.min(Math.max(limit,1),20);i++) {
   const now=new Date();
   const job=await this.jobs.findOneAndUpdate({channel_id:channelId,created_at:{$gt:cutoff},attempts:{$lt:5},expires_at:{$gt:now},$or:[{status:'pending',available_at:{$lte:now}},{status:'leased',lease_until:{$lt:now}}]},{$set:{status:'leased',lease_token:randomUUID(),lease_until:new Date(Date.now()+90000)},$inc:{attempts:1}},{sort:{created_at:1},returnDocument:'after'});
   if(!job)break;
   result.push(job);
  }
  return result;
 }
 async batchMessages(channelId:string,ids:string[]) {return this.messages.find({_id:{$in:ids},channel_id:channelId,expires_at:{$gt:new Date()}}).sort({sent_at:1}).toArray()}
 async history(channelId:string,before:string){const settings=await this.settingsFor(channelId);return this.messages.find({channel_id:channelId,sent_at:{$lte:before,$gt:new Date(Date.now()-settings.retention_days*86400000).toISOString()},expires_at:{$gt:new Date()}}).sort({sent_at:-1}).limit(200).toArray()}
 async completeJob(job:JobDocument,result:Classification|null,signals:Signal[],risk:Risk) {
  return this.transaction(async session=>{
   const claimed=await this.jobs.updateOne({_id:job.id,channel_id:job.channel_id,status:'leased',lease_token:job.lease_token},{$set:{status:'done',lease_until:null}},{session});
   if(!claimed.matchedCount)return false;
   await this.messages.updateOne({_id:job.message_id,channel_id:job.channel_id},{$set:{classification:result,signals,risk,processing:'complete',error:null}},{session});
   return true;
  });
 }
 async pauseJob(job:JobDocument,signals:Signal[],risk:Risk,reason:string) {
  await this.transaction(async session=>{
   const claimed=await this.jobs.updateOne({_id:job.id,channel_id:job.channel_id,status:'leased',lease_token:job.lease_token},{$set:{status:'paused',error:reason,lease_until:null}},{session});
   if(claimed.matchedCount)await this.messages.updateOne({_id:job.message_id,channel_id:job.channel_id},{$set:{signals,risk,processing:'paused',error:reason}},{session});
  });
 }
 async failJob(job:JobDocument,retryable:boolean,reason:string) {
  await this.transaction(async session=>{
   const claimed=await this.jobs.updateOne({_id:job.id,channel_id:job.channel_id,status:'leased',lease_token:job.lease_token},{$set:{status:retryable&&job.attempts<5?'pending':'failed',available_at:new Date(Date.now()+Math.min(60000,2000*2**job.attempts)),error:reason,lease_until:null}},{session});
   if(claimed.matchedCount)await this.messages.updateOne({_id:job.message_id,channel_id:job.channel_id},{$set:{processing:'failed',error:reason}},{session});
  });
 }
 async cached(channelId:string,hash:string){return this.cache.findOne({_id:channelId+':'+hash,channel_id:channelId,expires_at:{$gt:new Date()}})}
 async cacheResults(channelId:string,hash:string,results:Classification[]) {await this.cache.replaceOne({_id:channelId+':'+hash},{channel_id:channelId,request_hash:hash,results,expires_at:new Date(Date.now()+3600000)},{upsert:true})}
 async recoverJobs(channelId:string) {
  const exhausted=await this.jobs.find({channel_id:channelId,status:'leased',attempts:{$gte:5},lease_until:{$lt:new Date()}}).toArray();
  for(const job of exhausted)await this.failJob(job,false,'Retry limit reached after worker interruption.');
  const settings=await this.settingsFor(channelId);
  if(!settings.classification_enabled||!settings.third_party_consent)return;
  const entries=await this.usage.find({channel_id:channelId,created_at:{$gt:new Date(Date.now()-3600000)}}).toArray();
  if(entries.reduce((s,r)=>s+(r.actual_usd??r.reserved_usd),0)<settings.hourly_cap)await this.jobs.updateMany({channel_id:channelId,status:'paused',error:{$regex:'^Hourly estimated budget'}},{$set:{status:'pending',available_at:new Date()}});
 }
 async retryMessage(channelId:string,userId:string,messageId:string) {
  return this.transaction(async session=>{
   await this.requireOwner(userId,channelId,session);
   const result=await this.jobs.updateOne({channel_id:channelId,message_id:messageId,status:{$in:['failed','paused']},expires_at:{$gt:new Date()}},{$set:{status:'pending',attempts:0,available_at:new Date(),error:null,lease_until:null}},{session});
   if(!result.matchedCount)return false;
   await this.messages.updateOne({_id:messageId,channel_id:channelId},{$set:{processing:'pending',error:null}},{session});
   await this.audit({request_id:randomUUID(),channel_id:channelId,message_id:messageId,moderator_id:userId,kind:'classification_retry',result:'recorded',note:'Human requested another classification attempt.'},session);
   return true;
  });
 }
 async workspaceData(userId:string,channelId:string) {
  await this.requireOwner(userId,channelId);
  const settings=await this.settingsFor(channelId),cutoff=new Date(Date.now()-settings.retention_days*86400000).toISOString();
  const [channel,messages,actions,rules,usage]=await Promise.all([
   this.channels.findOne({_id:channelId}),
   this.messages.find({channel_id:channelId,sent_at:{$gt:cutoff},expires_at:{$gt:new Date()}}).sort({sent_at:-1}).limit(501).toArray(),
   this.actions.find({channel_id:channelId,created_at:{$gt:new Date(cutoff)},expires_at:{$gt:new Date()}}).sort({created_at:-1}).limit(100).toArray(),
   this.rulesFor(channelId),
   this.usage.find({channel_id:channelId,created_at:{$gt:new Date(Date.now()-3600000)}}).toArray(),
  ]);
  if(!channel)throw new Error('Channel unavailable');
  return {channel,messages,actions,settings,rules,usage};
 }
 async pendingChannels() {const rows=await this.jobs.find({status:{$in:['pending','leased','paused']},expires_at:{$gt:new Date()}}).sort({created_at:1}).limit(100).toArray();return [...new Set(rows.map(j=>j.channel_id))]}
 async cleanup() {
  for await(const settings of this.settings.find({})) {
   const cutoff=new Date(Date.now()-settings.retention_days*86400000);
   await this.messages.deleteMany({channel_id:settings.channel_id,$or:[{expires_at:{$lte:new Date()}},{sent_at:{$lt:cutoff.toISOString()}}]});
   await this.jobs.deleteMany({channel_id:settings.channel_id,$or:[{expires_at:{$lte:new Date()}},{created_at:{$lt:cutoff}}]});
   await this.actions.deleteMany({channel_id:settings.channel_id,$or:[{expires_at:{$lte:new Date()}},{created_at:{$lt:cutoff}}]});
  }
 }
}
