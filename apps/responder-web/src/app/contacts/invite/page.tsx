'use client';
import {useEffect,useState} from 'react';
import {createClient} from '@surakshaai/contracts/client';
import {Shell} from '../../../components/Shell';
import {SignIn,useIdentity,Logout} from '../../../components/Auth';
import {browserAuth} from '../../../lib/auth';
export default function Invite(){
 const {user,ready}=useIdentity(),[token,setToken]=useState(''),[error,setError]=useState(''),[done,setDone]=useState('');
 useEffect(()=>{const t=new URLSearchParams(location.hash.slice(1)).get('token');history.replaceState(null,'',location.pathname);if(t){sessionStorage.setItem('contact_invite',t);setToken(t);}else setToken(sessionStorage.getItem('contact_invite')??'');},[]);
 const api=createClient('',async()=>await browserAuth().currentUser?.getIdToken()??null);
 async function decide(accept:boolean){
  try{
   await api(accept?'/contacts/invitations/accept':'/contacts/invitations/decline',{method:'POST',key:crypto.randomUUID(),body:accept?{token,consent_version:'consent-v1'}:{token,block_future_invites:true}});
   sessionStorage.removeItem('contact_invite');setToken('');setDone(accept?'You accepted future alerts from this person. Location sharing remains off.':'You declined and blocked future invitations.');setError('');
  }catch{setError('Could not decide this invitation. Sign in using the invited phone number, or request a new invitation if expired.');}
 }
 return <Shell compact>{!ready?<p>Loading…</p>:!user?<SignIn initialPhone="+16505550501"/>:<section className="panel"><div className="eyebrow">TRUSTED CONTACT INVITATION</div><h1>Be part of their circle.</h1><p>Signed in as {user.phoneNumber}. Phone verification must match the invitation.</p><p>Accepting allows emergency messages during their SOS or explicitly shared journey. It does not share your location, and you can withdraw consent.</p>{done?<p className="notice">{done}</p>:token?<div className="actions"><button onClick={()=>decide(true)}>Accept emergency alerts</button><button className="secondary" onClick={()=>decide(false)}>Decline and block</button></div>:<p>No invitation token.</p>}{error&&<p className="error" role="alert">{error}</p>}<a href="/contact-location">Manage location consent ↗</a><Logout/></section>}</Shell>;
}
