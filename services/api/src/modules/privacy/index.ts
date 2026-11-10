import type {DB,Row} from '../../platform/db/index.ts';
import {id,hash,encrypt,decrypt,requireCondition} from '../../platform/security.ts';
import {iso,after,audit} from '../common.ts';
import {resolveSos} from '../sos/index.ts';
import {finishJourney} from '../journeys/index.ts';
import {revokeContact} from '../contacts/index.ts';
export function requireRecentAuth(user:Row){requireCondition(typeof user.auth_time==='number'&&user.auth_time<=Date.now()/1000+60&&Date.now()/1000-user.auth_time<=300,401,'RECENT_AUTH_REQUIRED');}
export async function requestExport(db:DB,user:Row){
 requireRecentAuth(user);const old=await db.query("SELECT id FROM privacy_jobs WHERE user_id=$1 AND kind='EXPORT' AND status IN ('PENDING','PROCESSING')",[user.id]);
 if(old.rowCount)return {job_id:old.rows[0].id,status:'PENDING'};
 const job=id();await db.query("INSERT INTO privacy_jobs(id,user_id,kind) VALUES($1,$2,'EXPORT')",[job,user.id]);await audit(db,user.id,'EXPORT_REQUESTED','PRIVACY',job);return {job_id:job,status:'PENDING'};
}
export async function requestDeletion(db:DB,user:Row,confirmed:boolean){
 if(user.deleted_at){const old=await db.query("SELECT id FROM privacy_jobs WHERE user_id=$1 AND kind='DELETE' ORDER BY requested_at DESC LIMIT 1",[user.id]);requireCondition(old.rowCount,404,'NOT_FOUND');return {deletion_job_id:old.rows[0].id,status:'PENDING'};}
 requireRecentAuth(user);await db.query('SELECT id FROM app_users WHERE id=$1 FOR UPDATE',[user.id]);
 const events=await db.query("SELECT * FROM sos_events WHERE user_id=$1 AND ended_at IS NULL FOR UPDATE",[user.id]);
 const journeys=await db.query("SELECT * FROM journeys WHERE user_id=$1 AND status IN ('ACTIVE','OVERDUE') FOR UPDATE",[user.id]);
 const gps=await db.query('SELECT id FROM contact_location_sessions WHERE principal_id=$1 AND revoked_at IS NULL AND expires_at>now()',[user.id]);
 requireCondition(confirmed||!events.rowCount&&!journeys.rowCount&&!gps.rowCount,409,'ACTIVE_SHARING_REQUIRES_CONFIRMATION');
 for(const e of events.rows)await resolveSos(db,e,'SAFE');for(const j of journeys.rows)await finishJourney(db,j,'CANCELLED');
 const contacts=await db.query('SELECT * FROM emergency_contacts WHERE (owner_user_id=$1 OR principal_id=$1) AND revoked_at IS NULL FOR UPDATE',[user.id]);for(const c of contacts.rows)await revokeContact(db,c,true);
 await db.query('UPDATE browser_sessions SET revoked_at=now() WHERE principal_id=$1',[user.id]);await db.query('UPDATE device_sessions SET revoked_at=now(),token_ciphertext=$2 WHERE user_id=$1',[user.id,'']);
 await db.query('UPDATE app_users SET disabled=true,deleted_at=now() WHERE id=$1',[user.id]);
 await db.query('INSERT INTO deletion_ledger(auth_uid_hash) VALUES($1) ON CONFLICT DO NOTHING',[hash(user.auth_uid)]);
 const job=id();await db.query("INSERT INTO privacy_jobs(id,user_id,kind) VALUES($1,$2,'DELETE')",[job,user.id]);return {deletion_job_id:job,status:'PENDING'};
}
export async function privacyJob(db:DB,user:Row,jobId:string,kind='EXPORT'){
 const job=(await db.query('SELECT * FROM privacy_jobs WHERE id=$1 AND user_id=$2 AND kind=$3',[jobId,user.id,kind])).rows[0];requireCondition(job,404,'NOT_FOUND');return job;
}
export const exportView=(j:Row)=>({job_id:j.id,status:j.expires_at&&j.expires_at<=new Date()?'EXPIRED':j.status,expires_at:j.expires_at?iso(j.expires_at):null});
export async function exportData(db:DB,user:Row){
 const rows=async(sql:string)=>(await db.query(sql,[user.id])).rows;
 return {schema_version:1,exported_at:new Date().toISOString(),profile:{display_name:user.display_name,phone_e164:user.phone_e164,locale:user.locale,consents:user.consents},contacts:await rows('SELECT id,name,phone_e164,priority,invite_status FROM emergency_contacts WHERE owner_user_id=$1 AND revoked_at IS NULL'),alerts:await rows('SELECT id,trigger_type,status,created_at,ended_at,resolution,position,context FROM sos_events WHERE user_id=$1'),journeys:await rows('SELECT id,status,destination,expected_arrival_at,completed_at FROM journeys WHERE user_id=$1'),reports:await rows('SELECT id,category,location,description,moderation_status FROM incident_reports WHERE reporter_user_id=$1'),evidence:await rows('SELECT id,kind,mime,status,captured_at,delete_after FROM evidence_assets WHERE user_id=$1')};
}
export async function purgeEvents(db:DB,events:string[]){
 if(!events.length)return;
 const args=[events];
 for(const sql of [
 'DELETE FROM evidence_access_audit WHERE asset_id IN (SELECT id FROM evidence_assets WHERE sos_event_id=ANY($1::uuid[]))',
 'DELETE FROM evidence_recipient_scopes WHERE asset_id IN (SELECT id FROM evidence_assets WHERE sos_event_id=ANY($1::uuid[]))',
 'DELETE FROM evidence_assets WHERE sos_event_id=ANY($1::uuid[])','DELETE FROM shop_alerts WHERE event_id=ANY($1::uuid[])',
 'DELETE FROM fake_messages WHERE outbox_id IN (SELECT o.id FROM notification_outbox o JOIN delivery_intents d ON d.id=o.intent_id WHERE d.event_id=ANY($1::uuid[]))',
 'DELETE FROM provider_receipts WHERE provider_message_ref IN (SELECT a.provider_message_ref FROM delivery_attempts a JOIN delivery_intents d ON d.id=a.intent_id WHERE d.event_id=ANY($1::uuid[]))',
 'DELETE FROM delivery_attempts WHERE intent_id IN (SELECT id FROM delivery_intents WHERE event_id=ANY($1::uuid[]))',
 'DELETE FROM notification_outbox WHERE intent_id IN (SELECT id FROM delivery_intents WHERE event_id=ANY($1::uuid[]))','DELETE FROM delivery_intents WHERE event_id=ANY($1::uuid[])',
 'DELETE FROM recipient_acknowledgements WHERE recipient_id IN (SELECT id FROM sos_recipients WHERE sos_event_id=ANY($1::uuid[]))',
 'DELETE FROM browser_sessions WHERE grant_id IN (SELECT id FROM tracking_grants WHERE sos_event_id=ANY($1::uuid[]))',
 'DELETE FROM evidence_access_audit WHERE grant_id IN (SELECT id FROM tracking_grants WHERE sos_event_id=ANY($1::uuid[]))',
 'DELETE FROM tracking_grants WHERE sos_event_id=ANY($1::uuid[])','DELETE FROM sos_recipients WHERE sos_event_id=ANY($1::uuid[])','DELETE FROM sos_locations WHERE sos_event_id=ANY($1::uuid[])',
 'UPDATE journeys SET linked_sos_id=NULL WHERE linked_sos_id=ANY($1::uuid[])','DELETE FROM sos_intents WHERE event_id=ANY($1::uuid[])','DELETE FROM domain_events WHERE aggregate_id=ANY($1::uuid[])','DELETE FROM scheduled_jobs WHERE aggregate_id=ANY($1::uuid[])','DELETE FROM sos_events WHERE id=ANY($1::uuid[])'
 ])await db.query(sql,args);
}
export async function eraseUser(db:DB,user:Row){
 const events=(await db.query('SELECT id FROM sos_events WHERE user_id=$1',[user.id])).rows.map(e=>e.id);await purgeEvents(db,events);
 const journeys=(await db.query('SELECT id FROM journeys WHERE user_id=$1',[user.id])).rows.map(e=>e.id);
 await db.query('DELETE FROM browser_sessions WHERE grant_id IN (SELECT id FROM tracking_grants WHERE journey_id=ANY($1::uuid[]))',[journeys]);
 await db.query('DELETE FROM tracking_grants WHERE journey_id=ANY($1::uuid[])',[journeys]);
 for(const table of ['journey_locations','journey_checkins','journey_recipients'])await db.query('DELETE FROM '+table+' WHERE journey_id=ANY($1::uuid[])',[journeys]);
 await db.query('DELETE FROM scheduled_jobs WHERE aggregate_id=ANY($1::uuid[])',[journeys]);await db.query('DELETE FROM journeys WHERE user_id=$1',[user.id]);
 await db.query('DELETE FROM route_candidates WHERE evaluation_id IN (SELECT id FROM route_evaluations WHERE user_id=$1)',[user.id]);await db.query('DELETE FROM route_evaluations WHERE user_id=$1',[user.id]);
 await db.query('DELETE FROM incident_moderation WHERE report_id IN (SELECT id FROM incident_reports WHERE reporter_user_id=$1) OR moderator_id=$1',[user.id]);await db.query('DELETE FROM incident_reports WHERE reporter_user_id=$1',[user.id]);
 await db.query('DELETE FROM shop_audit WHERE shop_id IN (SELECT id FROM safe_shops WHERE owner_user_id=$1) OR actor_id=$1',[user.id]);await db.query('DELETE FROM shop_alerts WHERE shop_id IN (SELECT id FROM safe_shops WHERE owner_user_id=$1)',[user.id]);await db.query('DELETE FROM safe_shops WHERE owner_user_id=$1',[user.id]);await db.query('UPDATE safe_shops SET verified_by=NULL WHERE verified_by=$1',[user.id]);
 const contactIds=(await db.query('SELECT id FROM emergency_contacts WHERE owner_user_id=$1 OR principal_id=$1',[user.id])).rows.map(c=>c.id);
 await db.query('DELETE FROM contact_location_sessions WHERE contact_id=ANY($1::uuid[])',[contactIds]);await db.query('DELETE FROM contact_invitations WHERE contact_id=ANY($1::uuid[]) OR accepted_principal_id=$2',[contactIds,user.id]);
 // Other owners retain only a revoked relationship stub if their event history references it.
 await db.query("UPDATE emergency_contacts SET name='',phone_e164='+10000000000',principal_id=NULL,consent_at=NULL,consent_version=NULL,revoked_at=COALESCE(revoked_at,now()),invite_status='REVOKED' WHERE id=ANY($1::uuid[])",[contactIds]);
 await db.query('DELETE FROM contact_blocks WHERE owner_user_id=$1 OR phone_hash=$2',[user.id,hash(user.phone_e164)]);
 // Remove encrypted delivery copies addressed to this principal (including invitation-only jobs).
 const outbox=await db.query('SELECT id,material_ciphertext FROM notification_outbox WHERE material_ciphertext IS NOT NULL');
 for(const o of outbox.rows)if(decrypt<Row>(o.material_ciphertext).to===user.phone_e164)await db.query("UPDATE notification_outbox SET material_ciphertext=NULL,status=CASE WHEN status='COMPLETED' THEN status ELSE 'SUPPRESSED' END WHERE id=$1",[o.id]);
 const messages=await db.query('SELECT id,material_ciphertext FROM fake_messages');for(const m of messages.rows)if(decrypt<Row>(m.material_ciphertext).to===user.phone_e164)await db.query('DELETE FROM fake_messages WHERE id=$1',[m.id]);
 for(const table of ['device_sessions','browser_sessions','role_assignments','user_consents'])await db.query('DELETE FROM '+table+' WHERE '+(table==='browser_sessions'?'principal_id':'user_id')+'=$1',[user.id]);
 await db.query('DELETE FROM idempotency_records WHERE principal=$1',[user.id]);await db.query('DELETE FROM sos_intents WHERE user_id=$1',[user.id]);await db.query('UPDATE audit_events SET actor_id=NULL WHERE actor_id=$1',[user.id]);await db.query('UPDATE evidence_access_audit SET actor_id=NULL WHERE actor_id=$1',[user.id]);
 await db.query("UPDATE privacy_jobs SET artifact_ciphertext=NULL,expires_at=now(),status='EXPIRED' WHERE user_id=$1 AND kind='EXPORT'",[user.id]);
 const authHash=user.auth_uid.startsWith('deleted:')?user.auth_uid.slice(8):hash(user.auth_uid);
 await db.query("UPDATE app_users SET auth_uid=$2,phone_e164='+10000000000',display_name='',consents=$3,disabled=true,deleted_at=COALESCE(deleted_at,now()) WHERE id=$1",[user.id,'deleted:'+authHash,{version:'consent-v1',monitoring:false,evidence:false,shop_alerts:false}]);
}
export async function processPrivacy(db:DB){
 const jobs=await db.query("SELECT * FROM privacy_jobs WHERE status IN ('PENDING','FAILED') ORDER BY requested_at LIMIT 2 FOR UPDATE SKIP LOCKED");
 for(const j of jobs.rows){
  const user=(await db.query('SELECT * FROM app_users WHERE id=$1 FOR UPDATE',[j.user_id])).rows[0];
  await db.query('SAVEPOINT privacy_job');
  try{
   if(j.kind==='EXPORT'){requireCondition(!user.deleted_at,410,'ACCOUNT_DELETED');const data=await exportData(db,user);await db.query("UPDATE privacy_jobs SET status='COMPLETED',artifact_ciphertext=$2,expires_at=$3,completed_at=now(),error_class=NULL WHERE id=$1",[j.id,encrypt(data),after(86400000)]);}
   else{await eraseUser(db,user);await db.query("UPDATE privacy_jobs SET status='COMPLETED',completed_at=now(),error_class=NULL WHERE id=$1",[j.id]);}
  }catch{await db.query('ROLLBACK TO SAVEPOINT privacy_job');await db.query("UPDATE privacy_jobs SET status='FAILED',error_class='PROCESSING_FAILED' WHERE id=$1",[j.id]);}
  await db.query('RELEASE SAVEPOINT privacy_job');
 }
 await db.query("UPDATE privacy_jobs SET artifact_ciphertext=NULL,status='EXPIRED' WHERE kind='EXPORT' AND expires_at<=now()");
}
export async function reconcileErasure(db:DB){
 const users=await db.query("SELECT u.* FROM app_users u WHERE EXISTS(SELECT 1 FROM deletion_ledger l WHERE l.auth_uid_hash=CASE WHEN u.auth_uid LIKE 'deleted:%' THEN substring(u.auth_uid from 9) ELSE encode(sha256(convert_to(u.auth_uid,'UTF8')),'hex') END)");
 for(const u of users.rows){const events=await db.query('SELECT * FROM sos_events WHERE user_id=$1 AND ended_at IS NULL FOR UPDATE',[u.id]);for(const e of events.rows)await resolveSos(db,e,'SAFE');await eraseUser(db,u);}
}
