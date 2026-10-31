import type {ChatMessage,Classification,Rule,Settings} from './domain';
export interface UserDocument {_id:string;id:string;twitch_id:string;login:string;display_name:string;created_at:Date}
export interface ChannelDocument {_id:string;id:string;twitch_id:string;login:string;display_name:string;subscription_status:string;last_event_at:string|null;created_at:Date}
export interface MemberDocument {_id:string;channel_id:string;user_id:string;role:'owner'|'moderator'}
export interface TokenDocument {_id:string;user_id:string;access_cipher:string;refresh_cipher:string;expires_at:Date;validated_at:Date;scopes:string[];refresh_lock_until:Date;refresh_lock_token?:string}
export interface SessionDocument {_id:string;token_hash:string;user_id:string;expires_at:Date;created_at:Date}
export interface SettingsDocument {_id:string;channel_id:string;retention_days:number;hourly_cap:number;classification_enabled:boolean;third_party_consent:boolean;batch_size:number;budget_version:number}
export interface RulesDocument {_id:string;channel_id:string;rules:Rule[];updated_at:Date}
export interface MessageDocument {_id:string;id:string;channel_id:string;twitch_id:string;user_id:string;username:string;body:string;sent_at:string;fragments:unknown[];classification:Classification|null;signals:ChatMessage['signals'];risk:ChatMessage['risk'];review_status:ChatMessage['status'];processing:ChatMessage['processing'];error:string|null;expires_at:Date}
export interface ActionDocument {_id:string;id:string;request_id:string;channel_id:string;message_id:string|null;moderator_id:string|null;kind:string;result:'pending'|'recorded'|'success'|'failed';note:string;created_at:Date;expires_at:Date}
export interface JobDocument {_id:string;id:string;channel_id:string;message_id:string;status:'pending'|'leased'|'done'|'failed'|'paused';attempts:number;available_at:Date;lease_until:Date|null;lease_token:string|null;error:string|null;created_at:Date;expires_at:Date}
export interface UsageDocument {_id:string;channel_id:string;reserved_usd:number;actual_usd:number|null;state:'reserved'|'settled'|'uncertain';created_at:Date;expires_at:Date;input_tokens:number|null;output_tokens:number|null;latency_ms:number|null}
export interface EventDocument {_id:string;channel_id:string;event_type:string;received_at:Date;expires_at:Date}
export interface CacheDocument {_id:string;channel_id:string;request_hash:string;results:Classification[];expires_at:Date}
export interface LimitDocument {_id:string;count:number;window_start:Date;expires_at:Date}
export type SettingsInput=Settings;
