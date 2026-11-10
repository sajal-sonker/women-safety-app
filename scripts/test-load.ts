import 'dotenv/config';
import {performance} from 'node:perf_hooks';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {mkdir,writeFile} from 'node:fs/promises';
const url=new URL(process.env.DATABASE_URL!);if(!['127.0.0.1','localhost'].includes(url.hostname)||process.env.APP_ENV!=='local')throw Error('Load test is isolated local/fake only');
const adminUrl=new URL(url);adminUrl.pathname='/postgres';const admin=new pg.Pool({connectionString:adminUrl.toString()});if(!(await admin.query("SELECT 1 FROM pg_database WHERE datname='suraksha_load_test'")).rowCount)await admin.query('CREATE DATABASE suraksha_load_test');await admin.end();url.pathname='/suraksha_load_test';process.env.DATABASE_URL=url.toString();
const {pool,routePool}=await import('../services/api/src/platform/db/index.ts');const {migrate}=await import('../services/api/src/platform/db/migrate.ts');const {createApp}=await import('../services/api/src/app.ts');await migrate();
const server=createApp(async uid=>{if(!/^load-[a-f0-9-]+$/.test(uid))throw Error('Test token rejected');return {uid,phone_number:'+16505550999',auth_time:Date.now()/1000};}).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',()=>r()));const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
const profile=process.argv.includes('--soak')?'SOAK_100_ACTIVE_10_CREATES_PER_MIN':'LOCAL_BURST_500';
const durations:number[]=[],active:{uid:string;id:string}[]=[];let errors=0,polls=0;
const recipients=[] as {id:string;phone:string}[];
for(let i=0;i<5;i++){const phone='+1650555060'+i,id=randomUUID();const r=await pool.query('INSERT INTO app_users(id,auth_uid,phone_e164) VALUES($1,$2,$3) ON CONFLICT(auth_uid) DO UPDATE SET auth_uid=EXCLUDED.auth_uid RETURNING id',[id,'load-contact-'+i,phone]);recipients.push({id:r.rows[0].id,phone});}
async function create(){const uid='load-'+randomUUID(),key=randomUUID(),owner=randomUUID();await pool.query('INSERT INTO app_users(id,auth_uid,phone_e164) VALUES($1,$2,$3)',[owner,uid,'+16505550999']);for(const [i,c] of recipients.entries())await pool.query("INSERT INTO emergency_contacts(id,owner_user_id,principal_id,name,phone_e164,priority,invite_status,consent_at,consent_version) VALUES($1,$2,$3,'Synthetic load contact',$4,$5,'VERIFIED',now(),'consent-v1')",[randomUUID(),owner,c.id,c.phone,i+1]);const started=performance.now();const r=await fetch(base+'/v1/sos',{method:'POST',headers:{Authorization:'Bearer '+uid,'Idempotency-Key':key,'Content-Type':'application/json'},body:JSON.stringify({trigger_type:'MANUAL',client_request_id:key,triggered_at:new Date().toISOString(),location:null,location_status:'UNAVAILABLE'})});durations.push(performance.now()-started);if(r.status!==201){errors++;return;}const data=await r.json() as {event_id:string};active.push({uid,id:data.event_id});if(profile!=='LOCAL_BURST_500'&&active.length>100){const old=active.shift()!;const ended=await fetch(base+'/v1/sos/'+old.id+'/resolve',{method:'POST',headers:{Authorization:'Bearer '+old.uid,'Idempotency-Key':randomUUID(),'Content-Type':'application/json'},body:JSON.stringify({resolution:'SAFE'})});if(!ended.ok)errors++;await ended.arrayBuffer();}}
const started=Date.now();
try{
 for(let i=0;i<(profile==='LOCAL_BURST_500'?500:100);i+=10)await Promise.all(Array.from({length:10},create));
 const seconds=profile==='LOCAL_BURST_500'?10:1800,end=Date.now()+seconds*1000;let nextCreate=Date.now()+6000,nextPoll=0;
 while(Date.now()<end){
  if(profile!=='LOCAL_BURST_500'&&Date.now()>=nextCreate){await create();nextCreate+=6000;}
  if(Date.now()>=nextPoll){await Promise.all(active.slice(-100).map(async a=>{const r=await fetch(base+'/v1/sos/'+a.id,{headers:{Authorization:'Bearer '+a.uid}});if(!r.ok)errors++;await r.arrayBuffer();polls++;}));nextPoll=Date.now()+10000;}
  await new Promise<void>(r=>setTimeout(r,100));
 }
 const sorted=[...durations].sort((a,b)=>a-b),p=(q:number)=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*q))];
 const report={profile,environment:'Windows local PostGIS; injected identity; 5 verified fictional contacts per owner; fake delivery; no external requests',creates:durations.length,concurrency:10,polls,errors,p50_ms:p(.5),p95_ms:p(.95),elapsed_s:(Date.now()-started)/1000,sos_queue_target_ms:3000,device_latency:'NOT_MEASURED',provider_delivery:'NOT_MEASURED',full_staging_gate:profile==='LOCAL_BURST_500'?'NOT_RUN':'NOT_CERTIFIED'};
 await mkdir('.local/reports',{recursive:true});await writeFile('.local/reports/load.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(errors||p(.95)>=3000)process.exitCode=1;
}finally{
 await new Promise<void>(r=>server.close(()=>r()));await pool.query("UPDATE sos_events SET status='RESOLVED',resolution='SAFE',ended_at=now() WHERE ended_at IS NULL");await Promise.all([pool.end(),routePool.end()]);
}
