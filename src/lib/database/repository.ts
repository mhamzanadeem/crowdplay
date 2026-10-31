import 'server-only';
import {store} from './client';
import type {Actor} from '../auth/session';
import type {ChatMessage,Settings,Workspace} from '@/types/domain';
import type {MessageDocument} from '@/types/database';
import {defaultRules} from '../moderation/rules';
import {readiness} from '../server/config';
export type MessageRow=MessageDocument;
export function mapMessage(row:MessageDocument):ChatMessage {
 return {id:row.id,channelId:row.channel_id,twitchId:row.twitch_id,userId:row.user_id,username:row.username,text:row.body,at:row.sent_at,fragments:row.fragments,risk:row.risk,status:row.review_status,classification:row.classification,signals:row.signals,processing:row.processing,error:row.error};
}
export async function channelSettings(channelId:string):Promise<Settings> {
 const row=await (await store()).settingsFor(channelId);
 return {retentionDays:row.retention_days,hourlyCap:row.hourly_cap,classificationEnabled:row.classification_enabled,thirdPartyConsent:row.third_party_consent,batchSize:row.batch_size};
}
export async function channelRules(channelId:string) {
 const rules=await (await store()).rulesFor(channelId);
 return rules.length?rules:structuredClone(defaultRules);
}
export async function messageFor(channelId:string,messageId:string) {return (await store()).messageFor(channelId,messageId)}
export async function getWorkspace(actor:Actor):Promise<Workspace> {
 const snapshot=await (await store()).workspaceData(actor.userId,actor.channelId);
 const {channel,settings,messages,actions,rules,usage}=snapshot,config=readiness();
 const aiStatus=!config.jev?'Jev key not configured':!config.pricing?'Classification paused: account pricing not configured':!settings.third_party_consent?'Classification paused: TypeSafe processing consent required':!settings.classification_enabled?'Classification paused by channel owner':'Jev configured · inspect message processing status for failures';
 return {
  mode:'live',channel:{id:channel.id,twitchId:channel.twitch_id,login:channel.login,displayName:channel.display_name,subscriptionStatus:channel.subscription_status,lastEventAt:channel.last_event_at},
  messages:messages.slice(0,500).map(mapMessage),rules:rules.length?rules:structuredClone(defaultRules),
  settings:{retentionDays:settings.retention_days,hourlyCap:settings.hourly_cap,classificationEnabled:settings.classification_enabled,thirdPartyConsent:settings.third_party_consent,batchSize:settings.batch_size},
  moderator:{id:actor.userId,name:actor.name},
  actions:actions.map(a=>({id:a.id,messageId:a.message_id,username:'',moderator:a.moderator_id===actor.userId?actor.name:a.moderator_id?'Moderator':'Twitch / system',kind:a.kind,at:a.created_at.toISOString(),result:a.result,note:a.note})),
  aiStatus,budgetSpent:usage.reduce((sum,r)=>sum+(r.actual_usd??r.reserved_usd),0),hasMore:messages.length>500,
 };
}
