'use client';
import {useEffect,useState,useRef} from 'react';
import {createClient,type Model} from '@surakshaai/contracts/client';
import {Shell} from '../../components/Shell';
import {SignIn,useIdentity,Logout} from '../../components/Auth';
import {browserAuth} from '../../lib/auth';
export default function ContactLocation(){
 const {user}=useIdentity(),[invitations,setInvitations]=useState<Model<'ContactConsent'>[]>([]),[selected,setSelected]=useState(''),[session,setSession]=useState<{session_id:string,expires_at:string}|null>(null),[status,setStatus]=useState('Location sharing is off.'),[error,setError]=useState('');const watch=useRef<number|null>(null);
 const api=createClient('',async()=>await browserAuth().currentUser?.getIdToken()??null);
 useEffect(()=>{if(user)void api<Model<'ContactConsents'>>('/contact-consents').then(r=>setInvitations(r.items)).catch(()=>setError('Could not load contact relationships.'));},[user?.uid]);
 useEffect(()=>()=>{if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);},[]);
 async function start(){
  setError('');
  try{
   const s=await api<Model<'ContactSession'>>('/contact-location/sessions',{method:'POST',key:crypto.randomUUID(),body:{contact_id:selected,consent_version:'consent-v1',duration_minutes:30}});
   setSession(s);setStatus('Waiting for browser location permission. This page must stay active.');
   watch.current=navigator.geolocation.watchPosition(p=>{
    if(Date.now()>Date.parse(s.expires_at)){if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);setSession(null);setStatus('Session expired.');return;}
    void api('/contact-location/sessions/'+s.session_id+'/position',{method:'PUT',body:{sample_id:crypto.randomUUID(),location:{lat:p.coords.latitude,lon:p.coords.longitude,accuracy_m:p.coords.accuracy,captured_at:new Date(p.timestamp).toISOString(),source:'gps'}}}).then(()=>setStatus('Sharing a temporary latest fix for responder priority. Hidden or locked browser updates are not guaranteed.')).catch(()=>setStatus('Update failed. A stale position will not be used for ranking.'));
   },()=>setStatus('Location unavailable. Stop this session or enable browser permission.'),{enableHighAccuracy:true,maximumAge:10000,timeout:15000});
  }catch{setError('Could not start sharing. Accept the contact invitation first and select its relationship.');}
 }
 async function stop(){if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);try{if(session)await api('/contact-location/sessions/'+session.session_id,{method:'DELETE',key:crypto.randomUUID()});setSession(null);setStatus('Sharing ended; stored GPS revoked.');}catch{setStatus('Capture stopped locally. Server stop is unconfirmed; session will expire.');}}
 return <Shell compact>{!user?<SignIn initialPhone="+16505550501"/>:<section className="panel"><h1>Your location.<br/>Your choice.</h1><p>Sharing is separate from accepting alerts. Only your latest fix is stored, for at most30 minutes; the owner cannot directly read your coordinates.</p><label>Contact relationship<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select a relationship</option>{invitations.map(i=><option key={i.contact_id} value={i.contact_id}>{i.owner_display_name} · {i.status}</option>)}</select></label><div className="actions"><button disabled={!selected||!!session} onClick={start}>Share for 30 minutes</button><button className="secondary" disabled={!session} onClick={stop}>Stop sharing</button></div><p role="status">{status}</p>{error&&<p className="error">{error}</p>}<button className="text-button danger" disabled={!selected} onClick={async()=>{await stop();try{await api('/contact-consents/'+selected,{method:'DELETE',key:crypto.randomUUID()});setStatus('Emergency contact consent withdrawn.');}catch{setError('Consent withdrawal unconfirmed. Retry when connected.');}}}>Withdraw emergency-contact consent</button><Logout/></section>}</Shell>;
}
