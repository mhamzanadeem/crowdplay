'use client';

import {createContext,useContext,useEffect,useState,useCallback,useRef} from 'react';

import Link from 'next/link';
import {authErrorMessage} from '@/lib/auth/errors';

import {usePathname} from 'next/navigation';

import {LayoutDashboard,Inbox,Users,SlidersHorizontal,ChartNoAxesColumn,Settings,ShieldCheck,ArrowUpRight,Clock,Check,AlertTriangle,LogOut,RefreshCw} from 'lucide-react';

import type {Workspace,ReviewStatus,Rule,Settings as SettingsType} from '@/types/domain';

import type {ServiceState} from '@/lib/services/checks';

import {needsReview} from '@/lib/moderation/rules';

import {Button} from './ui/button';

type ReviewInput={messageId:string;kind:ReviewStatus|'delete';note:string;confirmation?:string};

type Store={data:Workspace;loading:boolean;error:string;notice:string;refresh:()=>Promise<void>;review:(input:ReviewInput)=>Promise<void>;saveRules:(rules:Rule[])=>Promise<void>;saveSettings:(settings:SettingsType)=>Promise<void>;prepareDelete:(messageId:string)=>Promise<string>;notify:(message:string)=>void};

const Context=createContext<Store|null>(null);

export function useWorkspace(){const ctx=useContext(Context);if(!ctx)throw new Error('Workspace provider missing');return ctx}

async function api(path:string,body?:unknown){const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'Request failed');return result}

const emptyWorkspace:Workspace={mode:'live',channel:{id:'',twitchId:'',login:'',displayName:'',subscriptionStatus:'disconnected',lastEventAt:null},messages:[],rules:[],actions:[],settings:{retentionDays:7,hourlyCap:1,classificationEnabled:false,thirdPartyConsent:false,batchSize:10},moderator:{id:'',name:''},aiStatus:'Not connected',budgetSpent:0,hasMore:false};

export function WorkspaceProvider({children}:{children:React.ReactNode}){

 const [data,setData]=useState<Workspace>(emptyWorkspace),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');

 const pendingRefresh=useRef(false);

 const notify=useCallback((message:string)=>setNotice(message),[]);

 const refresh=useCallback(async()=>{

  if(pendingRefresh.current)return;pendingRefresh.current=true;

  try{const response=await fetch('/api/workspace',{cache:'no-store'});

   if(response.status===401){setData(emptyWorkspace);setError('');return}

   const result=await response.json();if(!response.ok)throw new Error(result.error||'Workspace connection failed.');

   if(result.mode!=='live')throw new Error('Invalid workspace response.');setData(result);setError('');

  }catch(e){setError(e instanceof Error?e.message:'Workspace unavailable.')}finally{setLoading(false);pendingRefresh.current=false}

 },[]);

 useEffect(()=>{const startup=setTimeout(()=>void refresh(),0);const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},15000);return()=>{clearTimeout(startup);clearInterval(timer)}},[refresh]);

 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(timer)},[notice]);

 const review=async(input:ReviewInput)=>{await api('/api/moderation/review',input);await refresh();notify('Moderator decision recorded.')};

 const saveRules=async(rules:Rule[])=>{await api('/api/rules',{rules});await refresh();notify('Review rules saved.')};

 const saveSettings=async(settings:SettingsType)=>{await api('/api/settings',settings);await refresh();notify('Settings saved.')};

 return <Context.Provider value={{data,loading,error,notice,refresh,review,saveRules,saveSettings,prepareDelete:async(messageId)=>(await api('/api/moderation/prepare',{messageId})).confirmation,notify}}>{children}</Context.Provider>

}

export function ServiceStatus(){

 const [services,setServices]=useState<ServiceState[]>([]),[failed,setFailed]=useState(false);

 useEffect(()=>{let active=true,checking=false;const check=async()=>{if(checking)return;checking=true;try{const response=await fetch('/api/health',{cache:'no-store'});if(!response.ok)throw new Error();const result=await response.json();if(!Array.isArray(result.services))throw new Error();if(active){setServices(result.services);setFailed(false)}}catch{if(active)setFailed(true)}finally{checking=false}};const focus=()=>{if(document.visibilityState==='visible')void check()};void check();const timer=setInterval(focus,15000);window.addEventListener('focus',focus);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focus)}},[]);

 return <section className="service-status" aria-label="Service connections" aria-live="polite">{failed&&<div className="error-banner" role="alert">Service status could not be checked. Check your connection and retry.</div>}{services.map(service=><div key={service.name} className={service.status==='unavailable'?'error-banner':service.status==='deferred'?'service-deferred':service.status==='unverified'?'service-pending':'service-connected'} role={service.status==='unavailable'?'alert':undefined}><strong>{service.name}: {service.status==='connected'?'Connected':service.status==='deferred'?'Deferred':service.status==='unverified'?'Not verified':'Connection unavailable'}</strong><span>{service.message}</span></div>)}</section>

}

function SignIn({loading,error}:{loading:boolean;error:string}){

 const [oauthError,setOauthError]=useState('');

 useEffect(()=>{const code=new URLSearchParams(location.search).get('auth_error');if(code)queueMicrotask(()=>setOauthError(authErrorMessage(code)))},[]);



 return <main className="signin"><div className="signin-card"><span className="brand">CrowdPlay</span><h1>Your community. Your decisions.</h1><p>Connect your Twitch account to view your channel’s live chat, review messages and track moderation activity.</p><p className="signin-security">You authorize access securely on Twitch. CrowdPlay never asks for your Twitch password. Every deletion requires your confirmation.</p>{(error||oauthError)&&<div className="error-banner" role="alert">{error||oauthError}</div>}{loading?<p role="status">Checking your session…</p>:<a className="btn btn-primary" href="/api/twitch/login">Sign in with Twitch</a>}<ServiceStatus/></div></main>

}



const routes=[['/dashboard','Overview',LayoutDashboard],['/inbox','Moderation Inbox',Inbox],['/users','Users',Users],['/rules','Rules & Filters',SlidersHorizontal],['/analytics','Analytics',ChartNoAxesColumn],['/settings','Settings',Settings]] as const;

export function Shell({children}:{children:React.ReactNode}){
 const {data,loading,error,notice,refresh}=useWorkspace(),pathname=usePathname();
 const [loggingOut,setLoggingOut]=useState(false),[logoutError,setLogoutError]=useState('');
 const pending=data.messages.filter(m=>needsReview(m)&&m.status==='pending').length;
 if(!data.channel.id)return <SignIn loading={loading} error={error}/>;
 async function logout(){
  setLoggingOut(true);setLogoutError('');
  try{await api('/api/twitch/logout',{});location.reload()}
  catch(e){setLogoutError(e instanceof Error?e.message:'Logout failed');setLoggingOut(false)}
 }
 return <>
  <a className="skip" href="#main">Skip to content</a>
  <aside className="sidebar">
   <Link href="/dashboard" className="brand"><span className="brand-icon">c<span>p</span></span><span>CrowdPlay<small>MODERATION</small></span></Link>
   <div className="workspace"><span className="avatar channel">{data.channel.displayName[0]?.toUpperCase()}</span><div className="identity"><span className="identity-name" title={data.channel.displayName}>{data.channel.displayName}</span><small>Channel workspace</small></div></div>
   <div className="nav-caption">WORKSPACE</div>
   <nav aria-label="Main navigation">
    {routes.map(([href,label,Icon])=><Link href={href} key={href} className={pathname===href?'active':''} aria-current={pathname===href?'page':undefined}><Icon/>{label}{href==='/inbox'&&<span className="nav-count">{pending}</span>}</Link>)}
    <button type="button" className="sidebar-logout" disabled={loggingOut} onClick={()=>void logout()}><LogOut/>{loggingOut?'Logging out…':'Log out'}</button>
   </nav>
   <div className="sidebar-bottom"><div className="profile"><span className="avatar">{data.moderator.name.slice(0,2).toUpperCase()}</span><div className="identity"><span className="identity-name" title={data.moderator.name}>{data.moderator.name}</span><small>Channel owner</small></div></div></div>
  </aside>
  <div className="app"><main id="main" tabIndex={-1}>
   {(error||logoutError)&&<div className="error-banner" role="alert">{logoutError||error}<Button onClick={()=>{setLogoutError('');void refresh()}}><RefreshCw size={13}/> Retry</Button></div>}
   {loading?<div className="loading" role="status"><div className="skeleton"/><div className="skeleton"/>Loading workspace…</div>:children}
  </main><footer>Made for the people behind the chat.<span>Live channel data · human review required · v0.1</span></footer></div>
  {notice&&<div className="toast show" role="status">{notice}</div>}
 </>
}

export function PageHeading({title,subtitle,children}:{title:string;subtitle:string;children?:React.ReactNode}){return <div className="page-heading"><div><div className="eyebrow">YOUR COMMUNITY, IN FOCUS</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div><div className="heading-actions">{children}</div></div>}

export function Badge({children,kind='neutral'}:{children:React.ReactNode;kind?:string}){return <span className={`badge ${kind}`}>{children}</span>}

export function ViewerName({name}:{name:string}){return <span className="viewer"><span className="avatar">{name.replace(/_/g,' ').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</span><span className="viewer-label"><b title={name}>{name}</b></span></span>}

export function Metrics(){const {data}=useWorkspace(),flagged=data.messages.filter(needsReview);return <div className="metrics">{[{label:'Messages processed',value:data.messages.length,Icon:Inbox,note:data.hasMore?'Latest 500 messages (window)':'Messages in this workspace window',tone:''},{label:'High-risk messages',value:data.messages.filter(m=>m.risk==='high').length,Icon:AlertTriangle,note:'Prioritised for human review',tone:'red'},{label:'Awaiting review',value:flagged.filter(m=>m.status==='pending').length,Icon:Clock,note:'Your next decisions start here',tone:'amber'},{label:'Reviewed messages',value:flagged.filter(m=>m.status!=='pending').length,Icon:Check,note:'Human decisions in this window',tone:''}].map(({label,value,Icon,note,tone})=><div className="metric" key={label}><div className="metric-label">{label}<Icon/></div><div className={`metric-value ${tone}`}>{value.toLocaleString()}</div><div className="metric-note">{note}</div></div>)}</div>}

export function Connection(){const {data}=useWorkspace();return <div className="connection"><span className="connection-icon"><ShieldCheck size={21}/></span><div><strong>{data.channel.login} <span className="muted">/ {data.mode==='demo'?'Demo session':data.channel.subscriptionStatus}</span></strong><small>{data.mode==='demo'?'Synthetic chat · Twitch and Jev are not connected':data.aiStatus}</small></div><span className="pill">{data.mode==='demo'?'PREVIEW MODE':data.channel.lastEventAt?'RECEIVING CHAT':'AWAITING EVENTS'}</span><Link href="/settings">Connection details <ArrowUpRight size={11} style={{display:'inline'}}/></Link></div>}
