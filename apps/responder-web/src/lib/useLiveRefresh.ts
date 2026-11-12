'use client';
import {useEffect,useRef,useState} from 'react';

// One request batch at a time. Visibility/network events wake a paused session;
// account changes dispose the old loop rather than keeping private pages alive.
export function useLiveRefresh(task:(signal:AbortSignal)=>Promise<void>,sessionKey:string|null,intervalMs=1500){
 const latest=useRef(task);latest.current=task;
 const wake=useRef<()=>void>(()=>{});
 const [state,setState]=useState<'CONNECTING'|'LIVE'|'RETRYING'|'OFFLINE'|'PAUSED'>('CONNECTING');
 const [updatedAt,setUpdatedAt]=useState<number|null>(null);
 useEffect(()=>{
  setUpdatedAt(null);setState('CONNECTING');
  if(!sessionKey){wake.current=()=>{};return;}
  let disposed=false,inFlight=false,failures=0,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|null=null;
  const clear=()=>{if(timer!==undefined)clearTimeout(timer);timer=undefined;};
  async function tick(){
   clear();if(disposed)return;
   if(document.hidden){controller?.abort();setState('PAUSED');return;}
   if(!isOnline()){controller?.abort();setState('OFFLINE');return;}
   if(inFlight)return;
   inFlight=true;
   controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),8000);
   try{await latest.current(controller.signal);if(!disposed){failures=0;setUpdatedAt(Date.now());setState(!isOnline()?'OFFLINE':document.hidden?'PAUSED':'LIVE');}}
   catch{if(!disposed){if(document.hidden)setState('PAUSED');else if(!isOnline())setState('OFFLINE');else{failures++;setState('RETRYING');}}}
   finally{clearTimeout(timeout);inFlight=false;controller=null;if(!disposed&&!document.hidden&&isOnline())timer=setTimeout(()=>{void tick();},Math.min(intervalMs*2**Math.min(failures,3),12000));}
  }
  const resume=()=>{void tick();};
  wake.current=resume;
  document.addEventListener('visibilitychange',resume);window.addEventListener('focus',resume);window.addEventListener('online',resume);window.addEventListener('offline',resume);
  void tick();
  return()=>{disposed=true;clear();controller?.abort();wake.current=()=>{};document.removeEventListener('visibilitychange',resume);window.removeEventListener('focus',resume);window.removeEventListener('online',resume);window.removeEventListener('offline',resume);};
 },[sessionKey,intervalMs]);
 return {state,updatedAt,refreshNow:()=>wake.current()};
}
function isOnline(){return navigator.onLine!==false;}
