import type {ChatMessage,Rule,Signal,Classification,Risk,Viewer} from '../../types/domain';
export const defaultRules:Rule[]=[
 {id:'repeat',name:'Repeated messages',kind:'local',description:'Matching messages from one viewer in 30 seconds.',enabled:true,threshold:3,sensitivity:'medium'},
 {id:'flood',name:'Message flooding',kind:'local',description:'Messages from one viewer in five seconds.',enabled:true,threshold:6,sensitivity:'medium'},
 {id:'links',name:'Duplicate links',kind:'local',description:'The same URL repeatedly posted within 60 seconds.',enabled:true,threshold:3,sensitivity:'medium'},
 {id:'caps',name:'Excessive capitals',kind:'local',description:'Capital-letter ratio in messages with at least 20 letters.',enabled:true,threshold:85,sensitivity:'medium'},
 {id:'promotion',name:'Repeated promotions',kind:'local',description:'Repeated promotional requests. A signal, never a verdict.',enabled:true,threshold:3,sensitivity:'medium'},
 ...(['self_promotion','suspicious_link','harassment','toxicity','threat','needs_review'] as const).map(id=>({id,name:({self_promotion:'Self-promotion',suspicious_link:'Potential scams & links',harassment:'Harassment',toxicity:'Toxicity',threat:'Threats',needs_review:'Ambiguous intent'})[id],kind:'jev' as const,description:'Context-aware Jev category; sensitivity controls review threshold.',enabled:true,threshold:.6,sensitivity:'medium' as const}))
];
const normalize=(text:string)=>text.toLocaleLowerCase().replace(/\s+/g,' ').trim();
export function detectSignals(message:ChatMessage,history:ChatMessage[],rules:Rule[]):Signal[]{
 const now=Date.parse(message.at),past=history.filter(m=>m.id!==message.id&&m.channelId===message.channelId&&m.userId===message.userId&&Date.parse(m.at)<=now&&now-Date.parse(m.at)<=60000),signals:Signal[]=[];
 const add=(id:string,count:number,detail:string)=>{const r=rules.find(r=>r.id===id&&r.enabled);if(r&&count>=r.threshold)signals.push({ruleId:id,count,detail})};
 const repeats=past.filter(m=>now-Date.parse(m.at)<=30000&&normalize(m.text)===normalize(message.text)).length+1;
 add('repeat',repeats,`${repeats} matching messages within 30 seconds.`);
 const flood=past.filter(m=>now-Date.parse(m.at)<=5000).length+1;add('flood',flood,`${flood} messages within five seconds.`);
 const urls=(message.text.match(/https?:\/\/[^\s<>]+/gi)||[]).map(normalize);
 if(urls.length){const duplicate=past.filter(m=>urls.some(url=>normalize(m.text).includes(url))).length+1;add('links',duplicate,`${duplicate} messages repeat the same link within 60 seconds.`)}
 const letters=message.text.match(/[a-z]/gi)||[];if(letters.length>=20){const caps=letters.filter(c=>c===c.toUpperCase()).length/letters.length*100;add('caps',caps,`${Math.round(caps)}% capital letters; ${letters.length} letters.`)}
 if(/\b(follow my|check my channel|buy followers|free skins|watch my stream)\b/i.test(message.text))add('promotion',repeats,`${repeats} repeated promotional messages.`);
 return signals;
}
export const POLICY_VERSION='crowdplay/1.0';
export function riskFor(c:Classification|null,signals:Signal[],rules:Rule[]):Risk{
 if(!c)return signals.length?'medium':'low';
 const threshold=(category:string)=>{const rule=rules.find(r=>r.id===(category==='targeted_harassment'?'harassment':category));if(rule?.enabled===false)return 2;return rule?.sensitivity==='high'?.45:rule?.sensitivity==='low'?.8:.6};
 if(['threat','targeted_harassment','harassment','suspicious_link'].some(k=>c.probabilities[k as keyof typeof c.probabilities]>=threshold(k)))return 'high';
 if(signals.length||c.confidence<.25||c.category==='needs_review'||c.attention>=.5||Object.entries(c.probabilities).some(([k,p])=>k!=='normal'&&p>=threshold(k)))return 'medium';
 return 'low';
}
export const needsReview=(m:ChatMessage)=>m.risk!=='low'||m.classification?.category==='needs_review'||m.signals.length>0;
export function aggregateViewers(messages:ChatMessage[]):Viewer[]{const map=new Map<string,Viewer>();for(const m of messages){const v=map.get(m.userId)||{id:m.userId,username:m.username,messageCount:0,flaggedCount:0,reviewedCount:0,lastActivity:m.at};v.messageCount++;v.flaggedCount+=Number(needsReview(m));v.reviewedCount+=Number(needsReview(m)&&m.status!=='pending');if(m.at>v.lastActivity)v.lastActivity=m.at;map.set(m.userId,v)}return [...map.values()].sort((a,b)=>b.lastActivity.localeCompare(a.lastActivity))}
