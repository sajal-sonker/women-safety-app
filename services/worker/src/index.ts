import {pool,transaction,type DB,type Row} from '../../api/src/platform/db/index.ts';
import {validateConfig} from '../../api/src/platform/config.ts';
import {id,encrypt,decrypt} from '../../api/src/platform/security.ts';
import {after} from '../../api/src/modules/common.ts';
import {resolveSos,eventChange,enqueue,schedule} from '../../api/src/modules/sos/index.ts';
import {escalateJourney,finishJourney} from '../../api/src/modules/journeys/index.ts';
import type {DeliveryProvider,SendResult} from '../../../packages/contracts/src/provider-interfaces.ts';
export class FakeProvider implements DeliveryProvider{
 name='fake';
 capabilities={idempotency:true,receipts:true,reconciliation:true};
 async send(message:{outbox_id:string,material:Row}):Promise<SendResult>{
  const r=await pool.query('INSERT INTO fake_messages(id,outbox_id,material_ciphertext,expires_at) VALUES($1,$2,$3,$4) ON CONFLICT(outbox_id) DO UPDATE SET outbox_id=EXCLUDED.outbox_id RETURNING id',[id(),message.outbox_id,encrypt(message.material),after(7200000)]);
  return {outcome:'PROVIDER_ACCEPTED',provider_ref:r.rows[0].id};
 }
}
export class Worker{
 owner=id();
 constructor(public provider:DeliveryProvider=new FakeProvider()){}
 async delivery(){
  const leases=await transaction(async db=>{
   const r=await db.query("SELECT id FROM notification_outbox WHERE (status IN ('PENDING','RETRY') AND next_attempt_at<=now()) OR (status='LEASED' AND lease_expires_at<now()) ORDER BY next_attempt_at LIMIT 20 FOR UPDATE SKIP LOCKED");
   if(!r.rowCount)return [];
   return (await db.query("UPDATE notification_outbox SET status='LEASED',lease_owner=$2,lease_expires_at=now()+interval '30 seconds' WHERE id=ANY($1::uuid[]) RETURNING *",[r.rows.map(r=>r.id),this.owner])).rows;
  });
  for(const lease of leases)await this.send(lease);
 }
 async send(lease:Row){
  const message=await transaction(async db=>{
   const d=(await db.query('SELECT * FROM delivery_intents WHERE id=$1',[lease.intent_id])).rows[0];
   let event:Row|null=null;
   if(d.event_id)event=(await db.query('SELECT * FROM sos_events WHERE id=$1 FOR UPDATE',[d.event_id])).rows[0];
   const o=(await db.query("SELECT * FROM notification_outbox WHERE id=$1 AND status='LEASED' AND lease_owner=$2 FOR UPDATE",[lease.id,this.owner])).rows[0];
   if(!o)return null;
   let allowed=new Date(o.deadline)>new Date()&&o.attempts<5&&!!o.material_ciphertext;
   if(event&&d.purpose!=='CORRECTION')allowed=allowed&&!event.ended_at&&event.expires_at>new Date();
   if(d.recipient_id){const c=await db.query("SELECT 1 FROM sos_recipients r JOIN emergency_contacts c ON c.id=r.contact_id WHERE r.id=$1 AND c.invite_status='VERIFIED' AND c.revoked_at IS NULL",[d.recipient_id]);allowed=allowed&&!!c.rowCount;}
   const material=o.material_ciphertext?decrypt<Row>(o.material_ciphertext):null;
   if(material?.grant_id){const g=await db.query('SELECT 1 FROM tracking_grants g JOIN emergency_contacts c ON c.id=g.contact_id WHERE g.id=$1 AND g.revoked_at IS NULL AND g.expires_at>now() AND c.revoked_at IS NULL AND c.invite_status=\'VERIFIED\'',[material.grant_id]);allowed=allowed&&!!g.rowCount;}
   if(material?.kind==='INVITE'){
    const c=await db.query("SELECT 1 FROM emergency_contacts WHERE id=$1 AND revoked_at IS NULL AND invite_status<>'DECLINED'",[material.contact_id]);allowed=allowed&&!!c.rowCount;
   }
   if(!allowed){
    await db.query("UPDATE notification_outbox SET status='SUPPRESSED',material_ciphertext=NULL,lease_owner=NULL,lease_expires_at=NULL WHERE id=$1",[o.id]);
    await db.query("UPDATE delivery_intents SET status='SUPPRESSED' WHERE id=$1",[d.id]);return null;
   }
   const attempt=o.attempts+1;
   await db.query('UPDATE notification_outbox SET attempts=$2 WHERE id=$1',[o.id,attempt]);
   await db.query('INSERT INTO delivery_attempts(id,intent_id,attempt_no,provider) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id(),d.id,attempt,this.provider.name]);
   await db.query('UPDATE delivery_intents SET last_attempt_at=now() WHERE id=$1',[d.id]);
   if(event&&!event.ended_at){await db.query("UPDATE sos_events SET status='DISPATCHING' WHERE id=$1",[event.id]);await eventChange(db,event.id,'DISPATCH_UPDATED');}
   return {material,intent_id:d.id,event_id:d.event_id,attempt,outbox_id:o.id};
  });
  if(!message)return;
  let result:SendResult;
  try{result=await Promise.race([this.provider.send({outbox_id:message.outbox_id,material:message.material!}),new Promise<SendResult>(resolve=>{const timer=setTimeout(()=>resolve({outcome:'UNKNOWN'}),10000);timer.unref();})]);}
  catch{result={outcome:'UNKNOWN'};}
  await transaction(async db=>{
   const event=message.event_id?(await db.query('SELECT * FROM sos_events WHERE id=$1 FOR UPDATE',[message.event_id])).rows[0]:null;
   const o=(await db.query('SELECT * FROM notification_outbox WHERE id=$1 AND lease_owner=$2 FOR UPDATE',[message.outbox_id,this.owner])).rows[0];if(!o)return;
   const accepted=result.outcome==='PROVIDER_ACCEPTED',retryable=result.outcome==='UNKNOWN'?this.provider.capabilities.idempotency||message.attempt<2:result.outcome==='FAILED'&&result.retryable;
   const delay=result.outcome==='FAILED'&&result.retry_after_s?result.retry_after_s:[5,15,45,120,300][message.attempt-1];
   const retry=!accepted&&retryable&&message.attempt<5&&new Date(o.deadline).getTime()>Date.now()+delay*1000;
   await db.query('UPDATE notification_outbox SET status=$2,next_attempt_at=$3,lease_owner=NULL,lease_expires_at=NULL,material_ciphertext=CASE WHEN $4 THEN material_ciphertext ELSE NULL END,last_error=$5 WHERE id=$1',[o.id,accepted?'COMPLETED':retry?'RETRY':'DEAD',after(delay*1000),retry,accepted?null:result.outcome]);
   await db.query("UPDATE delivery_intents SET status=CASE WHEN status IN ('DELIVERED','SUPPRESSED') THEN status ELSE $2 END WHERE id=$1",[message.intent_id,accepted?'PROVIDER_ACCEPTED':result.outcome==='UNKNOWN'?'UNKNOWN':'FAILED']);
   await db.query('UPDATE delivery_attempts SET outcome=$3,finished_at=now(),provider_message_ref=$4 WHERE intent_id=$1 AND attempt_no=$2',[message.intent_id,message.attempt,result.outcome,result.outcome==='PROVIDER_ACCEPTED'?result.provider_ref:null]);
   if(event&&!event.ended_at){await db.query("UPDATE sos_events SET status='ACTIVE' WHERE id=$1",[event.id]);await eventChange(db,event.id,'DISPATCH_UPDATED');}
  });
 }
 async jobs(){
  const jobs=await transaction(async db=>{
   const r=await db.query("SELECT id FROM scheduled_jobs WHERE (status='PENDING' AND due_at<=now()) OR (status='LEASED' AND lease_expires_at<now()) ORDER BY due_at LIMIT 20 FOR UPDATE SKIP LOCKED");
   if(!r.rowCount)return [];
   return (await db.query("UPDATE scheduled_jobs SET status='LEASED',lease_owner=$2,lease_expires_at=now()+interval '30 seconds' WHERE id=ANY($1::uuid[]) RETURNING *",[r.rows.map(r=>r.id),this.owner])).rows;
  });
  for(const job of jobs)await transaction(async db=>{
   if(job.kind.startsWith('JOURNEY')){
    const j=(await db.query('SELECT * FROM journeys WHERE id=$1 FOR UPDATE',[job.aggregate_id])).rows[0];
    if(j&&['ACTIVE','OVERDUE'].includes(j.status)&&j.deadline_version===job.version){
     if(job.kind==='JOURNEY_CHECKIN'){
      await db.query("UPDATE journeys SET status='OVERDUE',revision=revision+1,updated_at=now() WHERE id=$1",[j.id]);
      const user=(await db.query('SELECT * FROM app_users WHERE id=$1',[j.user_id])).rows[0];
      await enqueue(db,null,null,'JOURNEY_CHECKIN',{to:user.phone_e164,kind:'JOURNEY_CHECKIN'},'CHECKIN:'+j.id+':'+j.deadline_version,after(120000));
     }else if(job.kind==='JOURNEY_ESCALATE'&&j.auto_escalate)await escalateJourney(db,j);
    }
   }else{
    const e=(await db.query('SELECT * FROM sos_events WHERE id=$1 FOR UPDATE',[job.aggregate_id])).rows[0];
    if(e&&!e.ended_at){
     if(job.kind==='SOS_EXPIRE')await resolveSos(db,e,'EXPIRED');
     if(job.kind==='PROMOTE')await this.promote(db,e);
    }
   }
   await db.query("UPDATE scheduled_jobs SET status='COMPLETED',lease_owner=NULL,lease_expires_at=NULL WHERE id=$1 AND lease_owner=$2",[job.id,this.owner]);
  });
 }
 async promote(db:DB,event:Row){
  const assisted=await db.query("SELECT 1 FROM sos_recipients WHERE sos_event_id=$1 AND acknowledgement='CAN_ASSIST'",[event.id]);if(assisted.rowCount)return;
  const r=await db.query("SELECT r.*,c.phone_e164 FROM sos_recipients r JOIN emergency_contacts c ON c.id=r.contact_id WHERE r.sos_event_id=$1 AND NOT r.promoted AND c.invite_status='VERIFIED' AND c.revoked_at IS NULL ORDER BY priority_rank LIMIT 1 FOR UPDATE OF r",[event.id]);
  if(!r.rowCount)return;
  const next=r.rows[0];
  await db.query("UPDATE sos_recipients SET role='ALTERNATE' WHERE sos_event_id=$1",[event.id]);
  await db.query("UPDATE sos_recipients SET role='PRIMARY',promoted=true WHERE id=$1",[next.id]);
  // Promotion has no new bearer: the initial authorized portal link remains the recipient's access.
  await enqueue(db,event.id,next.id,'PROMOTION',{to:next.phone_e164,kind:'PROMOTION'},'PROMOTE:'+event.id+':'+next.id,after(600000));
  await eventChange(db,event.id,'PRIMARY_PROMOTED');
  const revision=(await db.query('SELECT revision FROM sos_events WHERE id=$1',[event.id])).rows[0].revision;
  await schedule(db,'PROMOTE',event.id,after(30000),revision);
 }
 async retention(){
  await transaction(async db=>{
   await db.query('UPDATE contact_location_sessions SET location=NULL,location_at=NULL,revoked_at=COALESCE(revoked_at,now()) WHERE expires_at<=now() OR revoked_at IS NOT NULL');
   await db.query('UPDATE tracking_grants SET recovery_ciphertext=NULL WHERE exchange_until<now() OR revoked_at IS NOT NULL OR expires_at<now()');
   await db.query('DELETE FROM fake_messages WHERE expires_at<now()');
   await db.query('DELETE FROM browser_sessions WHERE expires_at<now() OR revoked_at<now()-interval \'1 day\'');
   await db.query('DELETE FROM idempotency_records WHERE expires_at<now()');
   await db.query('DELETE FROM limiter_counters WHERE expires_at<now()');
   await db.query("DELETE FROM sos_locations l USING sos_events e WHERE e.id=l.sos_event_id AND e.ended_at<now()-interval '24 hours'");
   await db.query("UPDATE sos_events SET position=NULL,initial_location_at=NULL,context='{}' WHERE ended_at<now()-interval '24 hours'");
   const expired=await db.query("SELECT * FROM journeys WHERE expires_at<now() AND status IN ('ACTIVE','OVERDUE') FOR UPDATE");
   for(const j of expired.rows)await finishJourney(db,j,'CANCELLED');
   await db.query("DELETE FROM journey_locations l USING journeys j WHERE j.id=l.journey_id AND j.completed_at<now()-interval '24 hours'");
   // Destination is sensitive too; keep a minimal summary point unavailable after retention.
   await db.query("UPDATE journeys SET origin=NULL,destination='null'::jsonb WHERE completed_at<now()-interval '24 hours'");
   await db.query('UPDATE journeys SET selected_route_id=NULL WHERE selected_route_id IN (SELECT c.id FROM route_candidates c JOIN route_evaluations e ON e.id=c.evaluation_id WHERE e.expires_at<now())');
   await db.query('DELETE FROM route_candidates WHERE evaluation_id IN (SELECT id FROM route_evaluations WHERE expires_at<now())');
   await db.query('DELETE FROM route_evaluations WHERE expires_at<now()');
   await db.query("DELETE FROM incident_moderation WHERE report_id IN (SELECT id FROM incident_reports WHERE expires_at<now() OR (moderation_status='PENDING' AND created_at<now()-interval '30 days'))");
   await db.query("DELETE FROM incident_reports WHERE expires_at<now() OR (moderation_status='PENDING' AND created_at<now()-interval '30 days')");
   await db.query("DELETE FROM audit_events WHERE created_at<now()-interval '90 days'");
   const expiredEvents=(await db.query("SELECT id FROM sos_events WHERE ended_at IS NOT NULL AND created_at<now()-interval '30 days' FOR UPDATE")).rows.map(e=>e.id);
   if(expiredEvents.length){
    await db.query('DELETE FROM fake_messages WHERE outbox_id IN (SELECT o.id FROM notification_outbox o JOIN delivery_intents d ON d.id=o.intent_id WHERE d.event_id=ANY($1::uuid[]))',[expiredEvents]);
    await db.query('DELETE FROM provider_receipts WHERE provider_message_ref IN (SELECT a.provider_message_ref FROM delivery_attempts a JOIN delivery_intents d ON d.id=a.intent_id WHERE d.event_id=ANY($1::uuid[]))',[expiredEvents]);
    await db.query('DELETE FROM delivery_attempts WHERE intent_id IN (SELECT id FROM delivery_intents WHERE event_id=ANY($1::uuid[]))',[expiredEvents]);
    await db.query('DELETE FROM notification_outbox WHERE intent_id IN (SELECT id FROM delivery_intents WHERE event_id=ANY($1::uuid[]))',[expiredEvents]);
    await db.query('DELETE FROM delivery_intents WHERE event_id=ANY($1::uuid[])',[expiredEvents]);
    await db.query('DELETE FROM recipient_acknowledgements WHERE recipient_id IN (SELECT id FROM sos_recipients WHERE sos_event_id=ANY($1::uuid[]))',[expiredEvents]);
    await db.query('DELETE FROM browser_sessions WHERE grant_id IN (SELECT id FROM tracking_grants WHERE sos_event_id=ANY($1::uuid[]))',[expiredEvents]);
    await db.query('DELETE FROM tracking_grants WHERE sos_event_id=ANY($1::uuid[])',[expiredEvents]);
    await db.query('DELETE FROM sos_recipients WHERE sos_event_id=ANY($1::uuid[])',[expiredEvents]);
    await db.query('DELETE FROM sos_locations WHERE sos_event_id=ANY($1::uuid[])',[expiredEvents]);
    await db.query('UPDATE journeys SET linked_sos_id=NULL WHERE linked_sos_id=ANY($1::uuid[])',[expiredEvents]);
    await db.query('DELETE FROM sos_intents WHERE event_id=ANY($1::uuid[])',[expiredEvents]);
    await db.query('DELETE FROM domain_events WHERE aggregate_id=ANY($1::uuid[])',[expiredEvents]);
    await db.query('DELETE FROM scheduled_jobs WHERE aggregate_id=ANY($1::uuid[])',[expiredEvents]);
    await db.query('DELETE FROM sos_events WHERE id=ANY($1::uuid[])',[expiredEvents]);
   }
   await db.query('DELETE FROM sos_intents WHERE event_id IS NULL AND expires_at<now()');
  });
 }
 async tick(){await this.jobs();await this.delivery();}
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('services/worker/src/index.ts')){
 validateConfig();const worker=new Worker();let busy=false,lastRetention=0;
 const timer=setInterval(()=>{
  if(busy)return;busy=true;
  void worker.tick().then(async()=>{if(Date.now()-lastRetention>60000){await worker.retention();lastRetention=Date.now();}}).catch(()=>console.error(JSON.stringify({event:'worker_tick_failed'}))).finally(()=>{busy=false;});
 },1000);
 console.log('Worker running with',worker.provider.name,'delivery; no live messages');
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearInterval(timer);const wait=setInterval(()=>{if(!busy){clearInterval(wait);void pool.end().then(()=>process.exit(0));}},100);});
}
