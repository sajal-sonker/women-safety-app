'use client';
import {useEffect,useState} from 'react';
import {createClient,type Model} from '@surakshaai/contracts/client';
import {Shell} from '../../components/Shell';
import {SignIn,useIdentity,Logout} from '../../components/Auth';
import {browserAuth} from '../../lib/auth';
type Item=Model<'ReviewQueue'>['items'][number];
export default function Admin(){
 const {user}=useIdentity(),[kind,setKind]=useState('REPORT'),[queue,setQueue]=useState<Item[]>([]),[selected,setSelected]=useState<Model<'Report'>|Model<'Shop'>|null>(null),[reason,setReason]=useState(''),[error,setError]=useState('');
 const api=createClient('',async()=>await browserAuth().currentUser?.getIdToken()??null);
 const refresh=()=>api<Model<'ReviewQueue'>>('/admin/review-queue?kind='+kind).then(r=>setQueue(r.items));
 useEffect(()=>{setSelected(null);if(user)void refresh().catch(()=>setError('Moderator access required. Roles are assigned on the server.'));},[user?.uid,kind]);
 async function moderate(action:string){
  if(!selected)return;
  try{await api('/admin/'+(kind==='REPORT'?'reports/':'shops/')+selected.id+'/'+(kind==='REPORT'?'moderate':'verify'),{method:'POST',key:crypto.randomUUID(),body:{action,reason,expected_revision:selected.revision}});setSelected(null);setReason('');setError('');await refresh();}catch{setError('Moderation failed. Refresh the record and verify permissions.');}
 }
 return <Shell compact>{!user?<SignIn initialPhone="+16505550199"/>:<><div className="eyebrow">SCOPED MODERATION</div><h1>Review with care.</h1><p>Moderators can review reports and shops. This role grants no private SOS, tracking or evidence access.</p>{error&&<p className="error">{error}</p>}<label>Queue<select value={kind} onChange={e=>setKind(e.target.value)}><option value="REPORT">Reports</option><option value="SHOP">Shop applications</option></select></label><section className="panel">{queue.length?queue.map(i=><button className="history-row" key={i.id} onClick={async()=>{try{setSelected(await api('/admin/'+(kind==='REPORT'?'reports/':'shops/')+i.id));}catch{setError('Record unavailable.');}}}><span>{i.label}</span><span className="pill">{i.status}</span></button>):<p>No pending records.</p>}</section>{selected&&<section className="panel"><h2>{'category'in selected?selected.category:selected.name}</h2><p>{'description'in selected?selected.description:'Verification includes ownership, location and listing consent. Do not approve without completing the review.'}</p><label>Review reason<textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={500}/></label><div className="actions"><button disabled={!reason} onClick={()=>moderate(kind==='REPORT'?'APPROVE':'ACTIVATE')}>Approve</button><button className="secondary" disabled={!reason} onClick={()=>moderate('REJECT')}>Reject</button></div></section>}<Logout/></>}</Shell>;
}
