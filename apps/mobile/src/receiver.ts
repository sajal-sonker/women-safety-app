import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {api,type Model} from './api';

export function useForeground(){
 const [active,setActive]=useState((AppState.currentState??'active')==='active');
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>setActive(state==='active'));return()=>sub.remove();},[]);
 return active;
}
export function useReceiver(uid:string|null,onContacts:(items:Model<'Contact'>[])=>void){
 const foreground=useForeground();
 const [version,reload]=useState(0),[snapshot,setSnapshot]=useState<{uid:string;invitations:Model<'InvitationItem'>[];alerts:Model<'ReceivedAlert'>[];consents:Model<'ContactConsent'>[];updated:number}|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!uid||!foreground)return;
  let stopped=false,timer:ReturnType<typeof setTimeout>;
  async function load(){
   try{
    const [i,a,c,own]=await Promise.all([api<Model<'Invitations'>>('/contacts/invitations'),api<Model<'ReceivedAlerts'>>('/received-alerts'),api<Model<'ContactConsents'>>('/contact-consents'),api<Model<'Contacts'>>('/contacts')]);
    if(!stopped){setSnapshot({uid:uid!,invitations:i.items.filter(x=>x.status==='PENDING'),alerts:a.items,consents:c.items,updated:Date.now()});onContacts(own.items);setError('');}
   }catch{if(!stopped){setSnapshot(null);setError('Connection lost. Reconnecting automatically…');}}
   finally{if(!stopped)timer=setTimeout(()=>{void load();},2000);}
  }
  void load();return()=>{stopped=true;clearTimeout(timer);};
 },[uid,foreground,version,onContacts]);
 const current=foreground&&snapshot?.uid===uid?snapshot:null;
 return {invitations:current?.invitations??[],alerts:current?.alerts??[],consents:current?.consents??[],updated:current?.updated??null,error:foreground?error:'Updates resume when you return to the app.',reload:()=>reload(n=>n+1)};
}
export type ReceiverState=ReturnType<typeof useReceiver>;
