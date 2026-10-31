export const categories=['normal','spam','repeated_spam','self_promotion','suspicious_link','toxicity','harassment','targeted_harassment','threat','other_suspicious','needs_review'] as const;
export type Category=typeof categories[number];
export type Risk='low'|'medium'|'high';
export type ReviewStatus='pending'|'reviewed'|'dismissed'|'confirmed_violation'|'investigate'|'action_taken';
export interface Classification {model:string;category:Category;probabilities:Record<Category,number>;confidence:number;attention:number;targeted:number;policyVersion:string;source:'jev'|'demo'}
export interface Rule {id:string;name:string;kind:'local'|'jev';description:string;enabled:boolean;threshold:number;sensitivity:'low'|'medium'|'high'}
export interface Signal {ruleId:string;detail:string;count:number}
export interface ChatMessage {id:string;channelId:string;twitchId:string|null;userId:string;username:string;text:string;at:string;fragments:unknown[];risk:Risk;status:ReviewStatus;classification:Classification|null;signals:Signal[];processing:'pending'|'complete'|'failed'|'paused';error?:string|null}
export interface Channel {id:string;twitchId:string;login:string;displayName:string;subscriptionStatus:string;lastEventAt:string|null}
export interface ModeratorAction {id:string;messageId:string|null;username:string;moderator:string;kind:string;at:string;result:'success'|'failed'|'recorded'|'pending';note:string}
export interface Viewer {id:string;username:string;messageCount:number;flaggedCount:number;reviewedCount:number;lastActivity:string}
export interface Settings {retentionDays:number;hourlyCap:number;classificationEnabled:boolean;thirdPartyConsent:boolean;batchSize:number}
export interface Workspace {mode:'demo'|'live';channel:Channel;messages:ChatMessage[];rules:Rule[];actions:ModeratorAction[];settings:Settings;moderator:{id:string;name:string};aiStatus:string;budgetSpent:number;hasMore:boolean}
export const categoryLabels:Record<Category,string>={normal:'Normal conversation',spam:'Spam',repeated_spam:'Repeated spam',self_promotion:'Self-promotion',suspicious_link:'Suspicious link',toxicity:'Toxicity',harassment:'Harassment',targeted_harassment:'Targeted harassment',threat:'Threat',other_suspicious:'Other suspicious',needs_review:'Needs human review'};
export const statusLabels:Record<ReviewStatus,string>={pending:'Pending review',reviewed:'Reviewed',dismissed:'Dismissed',confirmed_violation:'Confirmed violation',investigate:'Further investigation',action_taken:'Action taken'};
