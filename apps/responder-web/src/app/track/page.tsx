'use client';
import {useEffect,useState} from 'react';
import {createClient,ClientError,type Model} from '@surakshaai/contracts/client';
import {Shell} from '../../components/Shell';
export default function Tracking(){
 const [pending,setPending]=useState<{token:string,exchange_id:string}|null>(null),[session,setSession]=useState<Model<'Exchanged'>|null>(null);
 const [event,setEvent]=useState<Model<'TrackingView'>|Model<'JourneyTracking'>|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[eta,setEta]=useState(15),[now,setNow]=useState(Date.now());
 const api=createClient('',async()=>null);
 useEffect(()=>{
  const raw=new URLSearchParams(window.location.hash.slice(1)).get('token');
  history.replaceState(null,'',window.location.pathname);
  if(raw){const p={token:raw,exchange_id:crypto.randomUUID()};sessionStorage.setItem('pending_tracking',JSON.stringify(p));setPending(p);setSession(null);sessionStorage.removeItem('tracking_session');}
  else{const saved=sessionStorage.getItem('tracking_session'),p=sessionStorage.getItem('pending_tracking');if(saved)setSession(JSON.parse(saved));else if(p)setPending(JSON.parse(p));}
 },[]);
 const headers:Record<string,string>=session?{'X-Tracking-Grant-ID':session.grant_id,'X-CSRF-Token':session.csrf_token}:{};
 async function load(){
  if(!session)return;
  try{setEvent(await api<Model<'TrackingView'>|Model<'JourneyTracking'>>(session.grant_kind==='JOURNEY_READ'?'/tracking/journey':'/tracking/event',{headers}));setError('');}
  catch(e){if(e instanceof ClientError&&[401,403,410].includes(e.status)){setEvent(null);setSession(null);sessionStorage.removeItem('tracking_session');setError('This tracking session expired or was revoked. Ask the sender for a new link.');}else setError('Connection lost. The displayed position is last known; its age continues to increase.');}
 }
 useEffect(()=>{if(!session)return;void load();const timer=setInterval(()=>{if(!document.hidden)void load();},10000);return()=>clearInterval(timer);},[session?.grant_id]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 async function open(){
  if(!pending)return;setBusy(true);setError('');
  try{const s=await api<Model<'Exchanged'>>('/tracking/exchange',{method:'POST',body:pending});sessionStorage.setItem('tracking_session',JSON.stringify(s));sessionStorage.removeItem('pending_tracking');setPending(null);setSession(s);}
  catch{setError('The link could not be opened. Retry within two minutes if the response was lost, otherwise ask for a new link.');}
  finally{setBusy(false);}
 }
 async function acknowledge(can_assist:boolean){
  setBusy(true);try{await api('/tracking/acknowledge',{method:'POST',body:{can_assist,...(can_assist?{eta_minutes:eta}:{})},key:crypto.randomUUID(),headers});await load();}catch{setError('Acknowledgement unconfirmed. Retry while the session is active.');}finally{setBusy(false);}
 }
 const position=event?.position;
 const age=position?Math.max(0,(now-Date.parse(position.captured_at))/1000):null;
 return <Shell compact><div className="eyebrow">PRIVATE EMERGENCY TRACKING</div>{error&&<div className="error" role="alert">{error}</div>}
 {!event?<section className="panel tracking-start"><span className="mini-symbol">◎</span><h1>A trusted person<br/>has shared an alert.</h1><p>Open only if you are the intended recipient. Access is limited to this alert and ends when resolved or expired.</p>{pending?<button disabled={busy} onClick={open}>Open private tracking</button>:<p>No active tracking link. Open the link sent to your phone.</p>}</section>:<>
 <div className="section-heading"><div><div className="eyebrow">SHARED WITH YOU</div><h1>{event.shared_name||'Your trusted person'}</h1></div><span className="pill">{'event_status'in event?event.event_status:event.status}</span></div>
 <section className="panel"><div className="section-heading"><h2>Latest shared location</h2><span className={'pill '+(age!==null&&age!==undefined&&age<=60?'':'stale')}>{!position?'UNAVAILABLE':age!>60?'STALE':position.accuracy_m!==null&&position.accuracy_m<=100?'CURRENT':'APPROXIMATE'}</span></div>
 {position?<><div className="coordinate-map"><span className="position-marker">◎</span><strong>{position.lat.toFixed(6)}, {position.lon.toFixed(6)}</strong><span>Coordinate view · no external map loaded</span></div><p>Captured {new Date(position.captured_at).toLocaleString()} · {Math.round(age??0)} seconds ago</p><p>Accuracy: {position.accuracy_m===null?'unknown':Math.round(position.accuracy_m)+' metres'}. The person may have moved since this update.</p><a className="button-link" href={'https://www.google.com/maps/dir/?api=1&destination='+position.lat+','+position.lon} target="_blank" rel="noreferrer">Open directions ↗</a><p className="small">Opening directions shares this destination with your map provider.</p></>:<div className="empty">No location available. The alert still exists; contact the person if possible.</div>}</section>
 {'own_acknowledgement'in event&&<section className="panel"><h2>Can you assist?</h2><p>Current response: {event.own_acknowledgement.replaceAll('_',' ')} · {event.assisting_count} contact(s) indicated they can help. This is not confirmation of safety.</p><label>Estimated arrival in minutes<input type="number" min="0" max="240" value={eta} onChange={e=>setEta(Number(e.target.value))}/></label><div className="actions"><button disabled={busy} onClick={()=>acknowledge(true)}>I can help</button><button className="secondary" disabled={busy} onClick={()=>acknowledge(false)}>I cannot assist</button></div></section>}
 <div className="actions"><a className="button-link secondary" href="tel:112">Open dialer · 112</a><button className="text-button" onClick={async()=>{try{await api('/tracking/logout',{method:'POST',body:{},headers});}finally{setEvent(null);setSession(null);sessionStorage.removeItem('tracking_session');}}}>Close this session</button></div><p className="small">Access expires {new Date(event.expires_at).toLocaleString()}. No direct police dispatch is performed by this app.</p></>}</Shell>;
}
