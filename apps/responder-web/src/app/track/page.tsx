'use client';
import {useEffect,useRef,useState} from 'react';
import {createClient,ClientError,type Model} from '@surakshaai/contracts/client';
import {Shell} from '../../components/Shell';
import {useLiveRefresh} from '../../lib/useLiveRefresh';
export default function Tracking(){
 const [pending,setPending]=useState<{token:string,exchange_id:string}|null>(null),[session,setSession]=useState<Model<'Exchanged'>|null>(null);
 const [event,setEvent]=useState<Model<'TrackingView'>|Model<'JourneyTracking'>|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[eta,setEta]=useState(15),[now,setNow]=useState(Date.now());
 const [media,setMedia]=useState<{url:string;mime:string;id:string}|null>(null),[navigation,setNavigation]=useState('');
 const api=createClient('',async()=>null);
 const currentSession=useRef(session);currentSession.current=session;
 function clearSession(){currentSession.current=null;setEvent(null);setSession(null);setMedia(null);sessionStorage.removeItem('tracking_session');}
 useEffect(()=>()=>{if(media)URL.revokeObjectURL(media.url);},[media?.url]);
 useEffect(()=>{setMedia(null);setNavigation('');},[event&&('event_id'in event?event.event_id:event.journey_id),event&&'evidence'in event?event.evidence.map(a=>a.id).join(','):'']);
 useEffect(()=>{
  const raw=new URLSearchParams(window.location.hash.slice(1)).get('token');
  history.replaceState(null,'',window.location.pathname);
  if(raw){const p={token:raw,exchange_id:crypto.randomUUID()};sessionStorage.setItem('pending_tracking',JSON.stringify(p));setPending(p);setSession(null);sessionStorage.removeItem('tracking_session');}
  else{const saved=sessionStorage.getItem('tracking_session'),p=sessionStorage.getItem('pending_tracking');if(saved)setSession(JSON.parse(saved));else if(p)setPending(JSON.parse(p));}
 },[]);
 const headers:Record<string,string>=session?{'X-Tracking-Grant-ID':session.grant_id,'X-CSRF-Token':session.csrf_token}:{};
 async function load(signal?:AbortSignal){
  if(!session)return;const expected=session.grant_id;
  try{const value=await api<Model<'TrackingView'>|Model<'JourneyTracking'>>(session.grant_kind==='JOURNEY_READ'?'/tracking/journey':'/tracking/event',{headers,signal});if(currentSession.current?.grant_id===expected)setEvent(value);}
  catch(e){if(currentSession.current?.grant_id!==expected)return;if(e instanceof ClientError&&[401,403,410].includes(e.status)){clearSession();setError('This tracking session expired or was revoked. Ask the sender for a new link.');}else throw e;}
 }
 const live=useLiveRefresh(load,session?.grant_id??null);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 async function open(){
  if(!pending)return;setBusy(true);setError('');
  try{const s=await api<Model<'Exchanged'>>('/tracking/exchange',{method:'POST',body:pending});sessionStorage.setItem('tracking_session',JSON.stringify(s));sessionStorage.removeItem('pending_tracking');setPending(null);currentSession.current=s;setSession(s);}
  catch{setError('The link could not be opened. Retry within two minutes if the response was lost, otherwise ask for a new link.');}
  finally{setBusy(false);}
 }
 async function acknowledge(can_assist:boolean){
  setBusy(true);try{await api('/tracking/acknowledge',{method:'POST',body:{can_assist,...(can_assist?{eta_minutes:eta}:{})},key:crypto.randomUUID(),headers});setError('');await load();}catch{setError('Acknowledgement unconfirmed. Retry while the session is active.');}finally{setBusy(false);}
 }
 const position=event?.position;
 const age=position?Math.max(0,(now-Date.parse(position.captured_at))/1000):null;
 return <Shell compact><div className="eyebrow">PRIVATE EMERGENCY TRACKING</div>{error&&<div className="error" role="alert">{error}</div>}{session&&<p className="small" role="status">{live.state==='LIVE'?'Live updates':live.state==='OFFLINE'?'Offline — displaying last known information':live.state==='RETRYING'?'Connection lost — retrying automatically':live.state==='PAUSED'?'Updates resume when you return':'Connecting…'}</p>}
 {!event?<section className="panel tracking-start"><span className="mini-symbol">◎</span><h1>A trusted person<br/>has shared an alert.</h1><p>Open only if you are the intended recipient. Access is limited to this alert and ends when resolved or expired.</p>{pending?<button disabled={busy} onClick={open}>Open private tracking</button>:<p>No active tracking link. Open the link sent to your phone.</p>}</section>:<>
 <div className="section-heading"><div><div className="eyebrow">SHARED WITH YOU</div><h1>{event.shared_name||'Your trusted person'}</h1></div><span className="pill">{'event_status'in event?event.event_status:event.status}</span></div>
 <section className="panel"><div className="section-heading"><h2>Latest shared location</h2><span className={'pill '+(age!==null&&age!==undefined&&age<=60?'':'stale')}>{!position?'UNAVAILABLE':age!>60?'STALE':position.accuracy_m!==null&&position.accuracy_m<=100?'CURRENT':'APPROXIMATE'}</span></div>
 {position?<><div className="coordinate-map"><span className="position-marker">◎</span><strong>{position.lat.toFixed(6)}, {position.lon.toFixed(6)}</strong><span>Coordinate view · no external map loaded</span></div><p>Captured {new Date(position.captured_at).toLocaleString()} · {Math.round(age??0)} seconds ago</p><p>Accuracy: {position.accuracy_m===null?'unknown':Math.round(position.accuracy_m)+' metres'}. The person may have moved since this update.</p><a className="button-link" href={'https://www.google.com/maps/dir/?api=1&destination='+position.lat+','+position.lon} target="_blank" rel="noreferrer">Open directions ↗</a><p className="small">Opening directions shares this destination with your map provider.</p></>:<div className="empty">No location available. The alert still exists; contact the person if possible.</div>}</section>
 {'own_acknowledgement'in event&&<section className="panel"><h2>Can you assist?</h2><p>Current response: {event.own_acknowledgement.replaceAll('_',' ')} · {event.assisting_count} contact(s) indicated they can help. This is not confirmation of safety.</p><label>Estimated arrival in minutes<input type="number" min="0" max="240" value={eta} onChange={e=>setEta(Number(e.target.value))}/></label><div className="actions"><button disabled={busy} onClick={()=>acknowledge(true)}>I can help</button><button className="secondary" disabled={busy} onClick={()=>acknowledge(false)}>I cannot assist</button></div></section>}
 {'evidence'in event&&<section className="panel"><h2>Shared context & evidence</h2><p>Battery: {event.context.battery_pct??'unavailable'} � motion: {event.context.motion_context} � {event.context.stale?'context is stale or unavailable':'context observed '+new Date(event.context.observed_at!).toLocaleTimeString()}</p><p className="small">Only separately selected assets appear here. Shared media cannot be recalled after someone saves it.</p>{event.evidence.map(a=><button key={a.id} className="secondary" onClick={async()=>{try{const r=await fetch('/v1/evidence/'+a.id+'/content',{headers,cache:'no-store'});if(!r.ok)throw Error();const blob=await r.blob();setMedia({url:URL.createObjectURL(blob),mime:a.mime,id:a.id});}catch{setMedia(null);setError('Evidence unavailable or access revoked.');}}}>Open {a.kind.toLowerCase()} � {new Date(a.captured_at).toLocaleTimeString()}</button>)}{media&&(media.mime.startsWith('audio/')?<audio controls src={media.url}/>:<img src={media.url} alt="User-consented evidence" style={{maxWidth:'100%'}}/>)}<button className="text-button" onClick={()=>setMedia(null)}>Close media</button><hr/><button className="secondary" onClick={()=>{navigator.geolocation.getCurrentPosition(async p=>{try{const n=await api<Model<'Navigation'>>('/tracking/navigation',{method:'POST',headers,key:crypto.randomUUID(),body:{origin:{lat:p.coords.latitude,lon:p.coords.longitude},consent:true}});setNavigation(n.eta_seconds===null?n.warning:Math.round(n.eta_seconds/60)+' min estimated, '+Math.round(n.distance_m!)+' metres. '+n.warning);}catch{setNavigation('Estimate unavailable. Tracking remains usable.');}},()=>setNavigation('Location declined or unavailable. Tracking remains usable.'),{timeout:7000,maximumAge:0});}}>Use my location once for an arrival estimate</button><p className="small">Your origin is optional and is not stored. {navigation}</p></section>}
 <div className="actions"><a className="button-link secondary" href="tel:112">Open dialer · 112</a><button className="text-button" onClick={async()=>{const closingHeaders={...headers};clearSession();try{await api('/tracking/logout',{method:'POST',body:{},headers:closingHeaders});}finally{clearSession();}}}>Close this session</button></div><p className="small">Access expires {new Date(event.expires_at).toLocaleString()}. No direct police dispatch is performed by this app.</p></>}</Shell>;
}
