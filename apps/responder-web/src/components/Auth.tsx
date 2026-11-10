'use client';
import {useEffect,useState} from 'react';
import {onAuthStateChanged,RecaptchaVerifier,signInWithPhoneNumber,type User,type ConfirmationResult,signOut} from 'firebase/auth';
import {browserAuth} from '../lib/auth';
export function useIdentity(){
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>onAuthStateChanged(browserAuth(),u=>{setUser(u);setReady(true);}),[]);
 return {user,ready};
}
export function SignIn({initialPhone='+16505550101'}:{initialPhone?:string}){
 const [phone,setPhone]=useState(initialPhone),[code,setCode]=useState(''),[confirmation,setConfirmation]=useState<ConfirmationResult|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function send(){
  setBusy(true);setError('');
  try{
   const verifier=new RecaptchaVerifier(browserAuth(),'recaptcha',{size:'invisible'});
   try{setConfirmation(await signInWithPhoneNumber(browserAuth(),phone,verifier));}finally{verifier.clear();}
  }catch{setError('Could not request a code. Check the number and authentication service.');}finally{setBusy(false);}
 }
 async function confirm(){setBusy(true);setError('');try{await confirmation?.confirm(code);}catch{setError('The code was not accepted. Request a new code if it has expired.');}finally{setBusy(false);}}
 return <section className="auth-card"><div className="eyebrow">YOUR PRIVATE SAFETY SPACE</div><h1>A little more<br/>peace of mind.</h1><p>Sign in with your phone to manage trusted contacts and journey check-ins.</p>
 <label>Phone number<input aria-label="Phone number" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} /></label>
 {confirmation?<><label>Verification code<input aria-label="Verification code" inputMode="numeric" value={code} onChange={e=>setCode(e.target.value)} /></label><button onClick={confirm} disabled={busy}>Verify and continue</button><button className="text-button" onClick={()=>setConfirmation(null)}>Use another code or number</button></>:<button onClick={send} disabled={busy}>Send verification code</button>}
 <div id="recaptcha"/>{error&&<p role="alert" className="error">{error}</p>}
 <p className="small">Local demo: use the <a href="http://127.0.0.1:4000/auth" target="_blank" rel="noreferrer">Authentication Emulator</a> for the test code. No SMS is sent.</p></section>;
}
export function Logout(){return <button className="text-button" onClick={()=>signOut(browserAuth())}>Sign out</button>;}
