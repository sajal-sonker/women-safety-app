import type {DB,Row} from '../../platform/db/index.ts';
import {lock} from '../../platform/db/index.ts';
import {id,token,hash,bodyHash,encrypt,requireCondition,ApiError} from '../../platform/security.ts';
import {config} from '../../platform/config.ts';
import {iso,after,age,freshness,validateLocation,metadata,contextView} from '../common.ts';
import {evidenceList} from '../evidence/index.ts';
export const terminal=(event:Row)=>['RESOLVED','CANCELLED'].includes(event.status);
export async function ownEvent(db:DB,eventId:string,userId:string,forUpdate=false):Promise<Row>{
 const r=await db.query('SELECT * FROM sos_events WHERE id=$1 AND user_id=$2'+(forUpdate?' FOR UPDATE':''),[eventId,userId]);
 requireCondition(r.rowCount,404,'NOT_FOUND');return r.rows[0];
}
export async function eventChange(db:DB,eventId:string,type:string){
 const r=await db.query('UPDATE sos_events SET revision=revision+1,updated_at=now() WHERE id=$1 RETURNING revision',[eventId]);
 await db.query('INSERT INTO domain_events(aggregate_id,revision,type) VALUES($1,$2,$3)',[eventId,r.rows[0].revision,type]);
}
export async function schedule(db:DB,kind:string,aggregateId:string,due:string,version=1){
 await db.query('INSERT INTO scheduled_jobs(id,kind,aggregate_id,due_at,version,dedupe_key) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(dedupe_key) DO NOTHING',[id(),kind,aggregateId,due,version,[kind,aggregateId,version].join(':')]);
}
export async function grant(db:DB,contact:Row,eventId:string|null,recipientId:string|null,journeyId:string|null,expiresAt:string){
 const raw=token(),grantId=id(),kind=journeyId?'JOURNEY_READ':'SOS_READ',expires=iso(new Date(Math.min(Date.parse(expiresAt),Date.now()+7200000)));
 await db.query('INSERT INTO tracking_grants(id,sos_event_id,journey_id,recipient_id,contact_id,kind,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[grantId,eventId,journeyId,recipientId,contact.id,kind,hash(raw),expires]);
 return {id:grantId,token:raw,expires_at:expires};
}
export async function enqueue(db:DB,eventId:string|null,recipientId:string|null,purpose:string,material:Row,logicalKey:string,expires:string){
 const intentId=id(),outboxId=id();
 const inserted=await db.query("INSERT INTO delivery_intents(id,event_id,recipient_id,channel,purpose,logical_key) VALUES($1,$2,$3,'SMS',$4,$5) ON CONFLICT(logical_key) DO NOTHING RETURNING id",[intentId,eventId,recipientId,purpose,logicalKey]);
 if(inserted.rowCount)await db.query('INSERT INTO notification_outbox(id,intent_id,material_ciphertext,deadline) VALUES($1,$2,$3,$4)',[outboxId,intentId,encrypt(material),iso(new Date(Math.min(Date.parse(expires),Date.now()+600000)))]);
}
export async function createSos(db:DB,user:Row,body:Row,serverGenerated=false):Promise<{event:Row,replayed:boolean}>{
 requireCondition(serverGenerated||['MANUAL','DURESS_PIN'].includes(body.trigger_type)||(config.env==='local'&&body.trigger_type==='VOLUME_CODE'),503,'FEATURE_DISABLED');
 validateLocation(body.location,true);
 const digest=bodyHash(body),key=body.client_request_id;
 await lock(db,'intent:'+user.id+':'+key);
 const old=await db.query('SELECT * FROM sos_intents WHERE user_id=$1 AND client_request_id=$2',[user.id,key]);
 if(old.rowCount){
  const intent=old.rows[0];requireCondition(intent.state!=='TERMINATED',409,'INTENT_TERMINATED');
  requireCondition(intent.request_hash===digest,409,'IDEMPOTENCY_MISMATCH');
  return {event:await ownEvent(db,intent.event_id,user.id),replayed:true};
 }
 const eventId=id(),expires=after(86400000);
 const r=await db.query("INSERT INTO sos_events(id,user_id,client_request_id,request_hash,trigger_type,status,triggered_at,expires_at,position,initial_location_at,context) VALUES($1,$2,$3,$4,$5,'CREATED',$6,$7,$8,$9,$10) RETURNING *",[eventId,user.id,key,digest,body.trigger_type,body.triggered_at,expires,body.location,body.location?.captured_at??null,body.device_context??{}]);
 await db.query("INSERT INTO sos_intents(user_id,client_request_id,request_hash,state,event_id,expires_at) VALUES($1,$2,$3,'ACCEPTED',$4,$5)",[user.id,key,digest,eventId,after(30*86400000)]);
 const contacts=await db.query("SELECT c.*,l.location AS contact_location FROM emergency_contacts c LEFT JOIN LATERAL (SELECT location FROM contact_location_sessions WHERE contact_id=c.id AND revoked_at IS NULL AND expires_at>now() AND location_at>now()-interval '5 minutes' AND (location->>'accuracy_m')::float8<=100 ORDER BY location_at DESC LIMIT 1) l ON true WHERE c.owner_user_id=$1 AND c.invite_status='VERIFIED' AND c.revoked_at IS NULL ORDER BY c.priority,c.id",[user.id]);
 const sorted=contacts.rows;
 if(freshness(body.location)==='CURRENT'){
  const usable=sorted.filter(c=>c.contact_location);
  if(usable.length){
   const d=await db.query("SELECT candidate.id FROM jsonb_to_recordset($1::jsonb) AS candidate(id uuid,lon float8,lat float8,priority integer) ORDER BY ST_Distance(ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,ST_SetSRID(ST_MakePoint(candidate.lon,candidate.lat),4326)::geography),candidate.priority,candidate.id",[JSON.stringify(usable.map(c=>({id:c.id,lon:c.contact_location.lon,lat:c.contact_location.lat,priority:c.priority}))),body.location.lon,body.location.lat]);
   const first=sorted.findIndex(c=>c.id===d.rows[0]?.id);if(first>0)sorted.unshift(...sorted.splice(first,1));
  }
 }
 for(const [i,c] of sorted.entries()){
  const recipientId=id();
  await db.query('INSERT INTO sos_recipients(id,sos_event_id,contact_id,priority_rank,role,consent_version,promoted) VALUES($1,$2,$3,$4,$5,$6,$7)',[recipientId,eventId,c.id,i+1,i===0?'PRIMARY':'ALTERNATE',c.consent_version,i===0]);
  const g=await grant(db,c,eventId,recipientId,null,expires);
  await enqueue(db,eventId,recipientId,'INITIAL',{to:c.phone_e164,kind:'SOS',url:config.trackingBase+'/track#token='+g.token,grant_id:g.id},[eventId,recipientId,'SMS','INITIAL',1].join(':'),g.expires_at);
 }
 await schedule(db,'SOS_EXPIRE',eventId,expires);
 if(sorted.length)await schedule(db,'PROMOTE',eventId,after(30000));
 await db.query("INSERT INTO domain_events(aggregate_id,revision,type) VALUES($1,1,'SOS_CREATED')",[eventId]);
 return {event:r.rows[0],replayed:false};
}
export async function sosView(db:DB,event:Row,replayed=false,detail=true){
 const rs=await db.query('SELECT * FROM sos_recipients WHERE sos_event_id=$1 ORDER BY priority_rank',[event.id]);
 const channels=await db.query('SELECT * FROM delivery_intents WHERE event_id=$1 ORDER BY sequence',[event.id]);
 const state=terminal(event)?'STOPPED':!rs.rowCount?'NO_ELIGIBLE_RECIPIENTS':channels.rows.some(c=>c.status==='QUEUED'||c.status==='PENDING')?'QUEUED':event.status==='DISPATCHING'?'IN_PROGRESS':'ATTEMPTED';
 const locStatus=freshness(event.position);
 const warnings:string[]=[];
 if(locStatus!=='CURRENT')warnings.push('LOCATION_'+locStatus);
 if(!rs.rowCount)warnings.push('NO_ELIGIBLE_RECIPIENTS');
 warnings.push('PUSH_UNAVAILABLE');
 const basic={...metadata(event),event_id:event.id,status:event.status,dispatch_status:state,created_at:iso(event.created_at),initial_location_at:event.initial_location_at?iso(event.initial_location_at):null,eligible_recipient_count:rs.rowCount,expires_at:iso(event.expires_at),replayed,emergency_call_number:'112',warnings};
 if(!detail)return basic;
 return {...basic,trigger_type:event.trigger_type,resolution:event.resolution,position:event.position,location_age_s:age(event.position),context:contextView(event.context),recipients:rs.rows.map(r=>({id:r.id,contact_id:r.contact_id,priority_rank:r.priority_rank,role:r.role,acknowledgement:r.acknowledgement,acknowledged_at:r.acknowledged_at?iso(r.acknowledged_at):null,eta_minutes:r.eta_minutes,channels:['SMS','PUSH'].flatMap(channel=>{const c=channels.rows.filter(c=>c.recipient_id===r.id&&c.channel===channel).at(-1);return c?[{channel,status:c.status,last_attempt_at:c.last_attempt_at?iso(c.last_attempt_at):null}]:[];})})),evidence:await evidenceList(db,event.id)};
}
export async function resolveSos(db:DB,event:Row,resolution:string,cancel=false){
 if(terminal(event))return event;
 if(cancel){
  const leased=await db.query("SELECT 1 FROM notification_outbox o JOIN delivery_intents d ON d.id=o.intent_id WHERE d.event_id=$1 AND (o.status='LEASED' OR o.attempts>0)",[event.id]);
  if(event.status!=='CREATED'||leased.rowCount)throw new ApiError(409,'INVALID_TRANSITION','Use resolve after dispatch begins','RESOLVE_EVENT');
 }
 const recipients=await db.query("SELECT DISTINCT r.id,c.phone_e164 FROM sos_recipients r JOIN emergency_contacts c ON c.id=r.contact_id JOIN delivery_intents d ON d.recipient_id=r.id WHERE r.sos_event_id=$1 AND d.last_attempt_at IS NOT NULL AND c.revoked_at IS NULL AND c.invite_status='VERIFIED'",[event.id]);
 await db.query('UPDATE sos_events SET status=$2,resolution=$3,ended_at=now() WHERE id=$1',[event.id,cancel?'CANCELLED':'RESOLVED',resolution]);
 await db.query('UPDATE tracking_grants SET revoked_at=now(),recovery_ciphertext=NULL WHERE sos_event_id=$1 AND revoked_at IS NULL',[event.id]);
 await db.query("UPDATE notification_outbox SET status='SUPPRESSED',material_ciphertext=NULL FROM delivery_intents d WHERE d.id=intent_id AND d.event_id=$1 AND notification_outbox.status IN ('PENDING','RETRY')",[event.id]);
 await db.query("UPDATE delivery_intents SET status='SUPPRESSED' WHERE event_id=$1 AND status IN ('PENDING','QUEUED')",[event.id]);
 await db.query("UPDATE scheduled_jobs SET status='SUPPRESSED' WHERE aggregate_id=$1 AND status IN ('PENDING','LEASED')",[event.id]);
 await eventChange(db,event.id,'SOS_RESOLVED');
 if(resolution==='FALSE_ALARM')for(const r of recipients.rows)await enqueue(db,event.id,r.id,'CORRECTION',{to:r.phone_e164,kind:'CORRECTION'},[event.id,r.id,'CORRECTION'].join(':'),after(600000));
 return (await db.query('SELECT * FROM sos_events WHERE id=$1',[event.id])).rows[0];
}
export async function terminateIntent(db:DB,user:Row,key:string,reason:string){
 await lock(db,'intent:'+user.id+':'+key);
 const old=await db.query('SELECT * FROM sos_intents WHERE user_id=$1 AND client_request_id=$2',[user.id,key]);
 let event:Row|null=null;
 if(old.rows[0]?.event_id){event=await ownEvent(db,old.rows[0].event_id,user.id,true);event=await resolveSos(db,event,reason);}
 await db.query("INSERT INTO sos_intents(user_id,client_request_id,state,expires_at,terminated_at) VALUES($1,$2,'TERMINATED',$3,now()) ON CONFLICT(user_id,client_request_id) DO UPDATE SET state='TERMINATED',terminated_at=now()",[user.id,key,after(30*86400000)]);
 return {intent_state:'TERMINATED',event_id:event?.id??null,status:event?.status??null};
}
export async function appendLocation(db:DB,event:Row,body:Row,journey=false){
 requireCondition(journey?['ACTIVE','OVERDUE'].includes(event.status):!terminal(event),409,'INVALID_TRANSITION');
 requireCondition(new Date(event.expires_at)>new Date(),409,'INVALID_TRANSITION');
 validateLocation(body.location);
 const table=journey?'journey_locations':'sos_locations',fk=journey?'journey_id':'sos_event_id';
 const previous=await db.query('SELECT location FROM '+table+' WHERE '+fk+'=$1 AND sample_id=$2',[event.id,body.sample_id]);
 if(previous.rowCount){requireCondition(bodyHash(previous.rows[0].location)===bodyHash(body.location),409,'IDEMPOTENCY_MISMATCH');return {sample_id:body.sample_id,accepted:true,is_latest:bodyHash(event.position??{})===bodyHash(body.location)};}
 const recent=await db.query('SELECT received_at FROM '+table+' WHERE '+fk+"=$1 AND received_at>now()-interval '5 seconds' LIMIT 1",[event.id]);
 requireCondition(!recent.rowCount,429,'RATE_LIMITED');
 await db.query('INSERT INTO '+table+'(id,'+fk+',sample_id,location,observed_at) VALUES($1,$2,$3,$4,$5)',[id(),event.id,body.sample_id,body.location,body.location.captured_at]);
 const latest=!event.position||Date.parse(body.location.captured_at)>Date.parse(event.position.captured_at);
 if(latest&&!journey){await db.query('UPDATE sos_events SET position=$2 WHERE id=$1',[event.id,body.location]);await eventChange(db,event.id,'POSITION_UPDATED');}
 if(journey)await db.query('UPDATE journeys SET revision=revision+1,updated_at=now() WHERE id=$1',[event.id]);
 return {sample_id:body.sample_id,accepted:true,is_latest:latest};
}
