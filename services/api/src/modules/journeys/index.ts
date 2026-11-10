import type {DB,Row} from '../../platform/db/index.ts';
import {lock} from '../../platform/db/index.ts';
import {id,requireCondition} from '../../platform/security.ts';
import {after,iso,metadata,age,validateLocation} from '../common.ts';
import {createSos,grant,enqueue,schedule} from '../sos/index.ts';
import {config} from '../../platform/config.ts';
export async function ownJourney(db:DB,user:Row,key:string){
 const r=await db.query('SELECT j.*,(SELECT location FROM journey_locations WHERE journey_id=j.id ORDER BY observed_at DESC,received_at DESC LIMIT 1) AS position FROM journeys j WHERE j.id=$1 AND j.user_id=$2 FOR UPDATE OF j',[key,user.id]);
 requireCondition(r.rowCount,404,'NOT_FOUND');return r.rows[0];
}
export function journeyView(j:Row){
 return {...metadata(j),journey_id:j.id,status:j.status,origin:j.origin,destination:j.destination,selected_route_id:j.selected_route_id,expected_arrival_at:iso(j.expected_arrival_at),checkin_due_at:iso(j.checkin_due_at),escalate_at:iso(j.escalate_at),auto_escalate:j.auto_escalate,share_with_contacts:j.share_with_contacts,contact_ids:j.contact_ids,deadline_version:j.deadline_version,sos_event_id:j.linked_sos_id,expires_at:iso(j.expires_at)};
}
export async function shareJourney(db:DB,user:Row,j:Row,enabled:boolean,contactIds:string[]){
 requireCondition(['ACTIVE','OVERDUE'].includes(j.status),409,'INVALID_TRANSITION');
 requireCondition(enabled||contactIds.length===0,400,'VALIDATION_ERROR');
 requireCondition(new Set(contactIds).size===contactIds.length,400,'VALIDATION_ERROR');
 const contacts=await db.query("SELECT * FROM emergency_contacts WHERE owner_user_id=$1 AND id=ANY($2::uuid[]) AND revoked_at IS NULL AND invite_status='VERIFIED'",[user.id,contactIds]);
 requireCondition(contacts.rowCount===contactIds.length,403,'FORBIDDEN');
 await db.query('UPDATE tracking_grants SET revoked_at=now(),recovery_ciphertext=NULL WHERE journey_id=$1 AND revoked_at IS NULL',[j.id]);
 await db.query('DELETE FROM journey_recipients WHERE journey_id=$1',[j.id]);
 for(const c of contacts.rows){
  await db.query('INSERT INTO journey_recipients(journey_id,contact_id) VALUES($1,$2)',[j.id,c.id]);
  const g=await grant(db,c,null,null,j.id,iso(j.expires_at));
  await enqueue(db,null,null,'JOURNEY_SHARE',{to:c.phone_e164,kind:'JOURNEY',url:config.trackingBase+'/track#token='+g.token,grant_id:g.id},'JOURNEY:'+j.id+':'+c.id+':'+g.id,g.expires_at);
 }
 const r=await db.query('UPDATE journeys SET share_with_contacts=$2,contact_ids=$3,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *',[j.id,enabled,contactIds]);
 return r.rows[0];
}
export async function createJourney(db:DB,user:Row,b:Row){
 await lock(db,'journey-user:'+user.id);
 const now=new Date(),eta=new Date(b.expected_arrival_at);
 requireCondition(eta>now&&eta.getTime()-now.getTime()<=43200000,400,'VALIDATION_ERROR');
 validateLocation(b.origin??null,true);
 const active=await db.query("SELECT 1 FROM journeys WHERE user_id=$1 AND status IN ('ACTIVE','OVERDUE')",[user.id]);
 requireCondition(!active.rowCount,409,'ACTIVE_JOURNEY_EXISTS');
 if(b.selected_route_id){const r=await db.query('SELECT 1 FROM route_candidates c JOIN route_evaluations e ON e.id=c.evaluation_id WHERE c.id=$1 AND e.user_id=$2 AND e.expires_at>now()',[b.selected_route_id,user.id]);requireCondition(r.rowCount,404,'NOT_FOUND');}
 const key=id(),expires=after(43200000);
 const r=await db.query('INSERT INTO journeys(id,user_id,origin,destination,selected_route_id,expected_arrival_at,checkin_due_at,escalate_at,expires_at,auto_escalate,share_with_contacts,escalation_client_id) VALUES($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,false,$10) RETURNING *',[key,user.id,b.origin??null,b.destination,b.selected_route_id??null,iso(eta),after(120000,eta),expires,b.auto_escalate,id()]);
 let j=r.rows[0];
 j=await shareJourney(db,user,j,b.share_with_contacts,b.contact_ids);
 await schedule(db,'JOURNEY_CHECKIN',key,iso(eta),1);
 await schedule(db,'JOURNEY_ESCALATE',key,after(120000,eta),1);
 return journeyView(j);
}
export async function finishJourney(db:DB,j:Row,status:string){
 if(['ARRIVED','CANCELLED'].includes(j.status))return j;
 // Once escalated the SOS lifecycle is independent. Do not silently close it.
 const newStatus=j.status==='ESCALATED'?'ESCALATED':status;
 await db.query("UPDATE scheduled_jobs SET status='SUPPRESSED' WHERE aggregate_id=$1 AND status IN ('PENDING','LEASED')",[j.id]);
 await db.query('UPDATE tracking_grants SET revoked_at=now(),recovery_ciphertext=NULL WHERE journey_id=$1',[j.id]);
 return (await db.query('UPDATE journeys SET status=$2,completed_at=now(),revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *',[j.id,newStatus])).rows[0];
}
export async function escalateJourney(db:DB,j:Row){
 if(j.linked_sos_id)return j;
 const user=(await db.query('SELECT * FROM app_users WHERE id=$1',[j.user_id])).rows[0];
 const position=(await db.query('SELECT location FROM journey_locations WHERE journey_id=$1 ORDER BY observed_at DESC LIMIT 1',[j.id])).rows[0]?.location??j.origin??null;
 const {event}=await createSos(db,user,{trigger_type:'JOURNEY_OVERDUE',client_request_id:j.escalation_client_id,triggered_at:new Date().toISOString(),location:position,location_status:position?'STALE':'UNAVAILABLE'},true);
 await db.query('UPDATE tracking_grants SET revoked_at=now(),recovery_ciphertext=NULL WHERE journey_id=$1',[j.id]);
 return (await db.query("UPDATE journeys SET status='ESCALATED',linked_sos_id=$2,completed_at=now(),revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *",[j.id,event.id])).rows[0];
}
export async function checkIn(db:DB,j:Row,b:Row){
 requireCondition(j.deadline_version===b.expected_deadline_version,409,'CONFLICT');
 requireCondition(['ACTIVE','OVERDUE'].includes(j.status),409,'INVALID_TRANSITION');
 if(b.answer==='NEED_HELP')return journeyView(await escalateJourney(db,j));
 if(b.answer==='SAFE')return journeyView(await finishJourney(db,j,'ARRIVED'));
 requireCondition(b.extend_minutes,400,'VALIDATION_ERROR');
 const eta=new Date(Math.max(Date.now(),new Date(j.expected_arrival_at).getTime())+b.extend_minutes*60000);
 requireCondition(eta<=j.expires_at,409,'INVALID_TRANSITION');
 const version=j.deadline_version+1;
 const r=await db.query("UPDATE journeys SET status='ACTIVE',expected_arrival_at=$2,checkin_due_at=$2,escalate_at=$3,deadline_version=$4,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *",[j.id,iso(eta),after(120000,eta),version]);
 await schedule(db,'JOURNEY_CHECKIN',j.id,iso(eta),version);
 await schedule(db,'JOURNEY_ESCALATE',j.id,after(120000,eta),version);
 return journeyView(r.rows[0]);
}
export async function journeyTracking(db:DB,g:Row){
 const r=await db.query('SELECT j.*,u.display_name,(SELECT location FROM journey_locations WHERE journey_id=j.id ORDER BY observed_at DESC LIMIT 1) AS position FROM journeys j JOIN app_users u ON u.id=j.user_id WHERE j.id=$1',[g.journey_id]);
 const j=r.rows[0];
 return {...metadata(j),journey_id:j.id,status:j.status,shared_name:j.display_name,position:j.position??j.origin,location_age_s:age(j.position??j.origin),expected_arrival_at:iso(j.expected_arrival_at),expires_at:iso(g.expires_at)};
}
