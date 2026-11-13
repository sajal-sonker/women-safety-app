import express,{type Request,type Response,type NextFunction} from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookies from 'cookie-parser';
import {createHmac} from 'node:crypto';
import operations from '../../../packages/contracts/src/generated/operations.json' with {type:'json'};
import {validate} from '../../../packages/contracts/src/index.ts';
import {config,validateConfig} from './platform/config.ts';
import {pool,routePool,transaction,lock,type DB,type Row} from './platform/db/index.ts';
import {id,token,hash,bodyHash,encrypt,decrypt,safeEqual,ApiError,requireCondition} from './platform/security.ts';
import {authenticate,verifyFirebase,principal,requireModerator,type VerifyToken} from './platform/auth.ts';
import {after,iso,metadata,audit,cursorPage,decodeCursor,assertHours,validateLocation,contextView} from './modules/common.ts';
import {createContact,contactView,ownContact,invite,decideInvite,revokeContact,contactPosition} from './modules/contacts/index.ts';
import {createSos,ownEvent,sosView,resolveSos,terminateIntent,appendLocation,grant,enqueue,eventChange} from './modules/sos/index.ts';
import {exchange,trackingSession,trackingView,acknowledge,cookieName} from './modules/tracking/index.ts';
import {recipientGrant,receivedAlerts} from './modules/tracking/recipient.ts';
import {createJourney,ownJourney,journeyView,checkIn,shareJourney,finishJourney,journeyTracking} from './modules/journeys/index.ts';
import {evaluateRoutes,cellId,cellGeometry} from './modules/routing/index.ts';
import {shopView} from './modules/shops/index.ts';
import {presignEvidence,completeEvidence,evidenceAccess,evidenceView,deleteEvidence} from './modules/evidence/index.ts';
import {requestExport,requestDeletion,privacyJob,exportView} from './modules/privacy/index.ts';
import {mountStreams} from './modules/streams.ts';
import {persistErasureLedger} from './modules/privacy/ledger.ts';
type Context={db:DB,req:Request,res:Response,user:Row,b:Row,verify:VerifyToken};
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const profile=(u:Row)=>({...metadata(u),id:u.id,display_name:u.display_name,locale:u.locale,phone_e164:u.phone_e164,consents:u.consents,capabilities:{push_live:false,monitoring:config.env==='local',duress:true,key_trigger:false,shop_alerts:false,evidence:config.env==='local'}});
const reportView=(r:Row)=>({...metadata(r),id:r.id,category:r.category,location:r.location,happened_at:iso(r.happened_at),description:r.description,status:r.moderation_status,created_at:iso(r.created_at),expires_at:iso(r.expires_at),moderation_reason:r.moderation_reason});
async function limit(db:DB,key:string,cap:number,seconds:number){
 const bucket=Math.floor(Date.now()/1000/seconds);
 const r=await db.query('INSERT INTO limiter_counters(key,bucket,count,expires_at) VALUES($1,$2,1,$3) ON CONFLICT(key,bucket) DO UPDATE SET count=limiter_counters.count+1 RETURNING count',[hash(key),bucket,after(seconds*2000)]);
 requireCondition(r.rows[0].count<=cap,429,'RATE_LIMITED');
}
async function paged(db:DB,req:Request,table:string,where:string,values:unknown[],map:(row:Row)=>unknown){
 const count=Math.max(1,Math.min(100,Number(req.query.limit??20)));
 requireCondition(Number.isInteger(count),400,'VALIDATION_ERROR');
 const cursor=decodeCursor(req.query.cursor);
 const index=values.length+1;
 const time=table==='journeys'?'started_at':'created_at';
 const r=await db.query("SELECT *,to_char("+time+" AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS cursor_at FROM "+table+' WHERE '+where+(cursor?' AND ('+time+',id)<($'+index+'::timestamptz,$'+(index+1)+'::uuid)':'')+' ORDER BY '+time+' DESC,id DESC LIMIT '+(count+1),cursor?[...values,...cursor]:values);
 const page=cursorPage(r.rows,count);
 const items=[];for(const row of page.items)items.push(await map(row));
 return {items,next_cursor:page.next_cursor};
}
async function dispatch(c:Context,key:string):Promise<unknown>{
 const {db,req,res,user,b,verify}=c;
 const p=req.params as Record<string,string>;
 if(key==='GET /health/live')return {status:'OK'};
 if(key==='GET /health/ready'){await db.query('SELECT 1');return {status:'OK'};}
 if(key==='POST /identity/browser-session'){
  requireCondition(req.headers.origin===config.origin,403,'FORBIDDEN');
  const u=await principal(await verify(b.id_token,true)),session=token(),csrf=token(),expires=after(900000);
  await db.query('INSERT INTO browser_sessions(id,principal_id,session_hash,csrf_hash,idle_expires_at,expires_at,auth_time) VALUES($1,$2,$3,$4,$5,$5,$6)',[id(),u.id,hash(session),hash(csrf),expires,new Date(u.auth_time*1000)]);
  res.cookie('identity',session,{httpOnly:true,sameSite:'lax',secure:config.env!=='local',path:'/v1',maxAge:900000});
  return {expires_at:expires,csrf_token:csrf};
 }
 if(key==='POST /identity/logout'){
  await db.query('UPDATE browser_sessions SET revoked_at=now() WHERE principal_id=$1',[user.id]);res.clearCookie('identity',{path:'/v1'});return;
 }
 if(key==='GET /me')return profile(user);
 if(key==='POST /me/export')return requestExport(db,user);
 if(key==='GET /me/export/{jobId}')return exportView(await privacyJob(db,user,p.jobId));
 if(key==='DELETE /me')return requestDeletion(db,user,b.confirm_end_active_sharing);
 if(key==='GET /me/deletion/{jobId}'){const j=await privacyJob(db,user,p.jobId,'DELETE');return {deletion_job_id:j.id,status:j.status};}
 if(key==='PATCH /sos/{id}/context'){
  const e=await ownEvent(db,p.id,user.id,true);requireCondition(!e.ended_at&&e.expires_at>new Date(),409,'INVALID_TRANSITION');
  requireCondition(Object.keys(b).some(k=>k!=='observed_at')&&Date.parse(b.observed_at)<=Date.now()+60000&&Date.parse(b.observed_at)>=Date.now()-86400000,400,'VALIDATION_ERROR');
  if(!e.context.observed_at||Date.parse(b.observed_at)>Date.parse(e.context.observed_at)){await db.query('UPDATE sos_events SET context=context||$2::jsonb WHERE id=$1',[e.id,b]);await eventChange(db,e.id,'CONTEXT_UPDATED');}
  const current=(await db.query('SELECT * FROM sos_events WHERE id=$1',[e.id])).rows[0];return {context:contextView(current.context),revision:current.revision};
 }
 if(key==='POST /sos/{id}/evidence/presign')return presignEvidence(db,user,p.id,b);
 if(key==='POST /sos/{id}/evidence/{assetId}/complete')return completeEvidence(db,user,p.id,p.assetId);
 if(key==='GET /evidence/{assetId}')return evidenceView((await evidenceAccess(db,p.assetId,user.id?user:null,req)).asset);
 if(key==='DELETE /evidence/{assetId}'){await deleteEvidence(db,user,p.assetId);return;}
 if(key.includes('/shop-alert'))throw new ApiError(503,'FEATURE_DISABLED');
 if(key==='PATCH /me'){
  const r=await db.query('UPDATE app_users SET display_name=COALESCE($2,display_name),locale=COALESCE($3,locale),revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *',[user.id,b.display_name??null,b.locale??null]);
  return profile(r.rows[0]);
 }
 if(key==='PATCH /me/consents'){
  const r=await db.query("UPDATE app_users SET consents=consents||$2::jsonb,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *",[user.id,b]);
  for(const purpose of ['monitoring','evidence','shop_alerts'])if(b[purpose]!==undefined)await db.query('INSERT INTO user_consents(id,user_id,purpose,version,granted_at,revoked_at) VALUES($1,$2,$3,$4,CASE WHEN $5 THEN now() ELSE NULL END,CASE WHEN $5 THEN NULL ELSE now() END)',[id(),user.id,purpose,b.version,b[purpose]]);
  return profile(r.rows[0]);
 }
 if(key==='GET /contacts')return paged(db,req,'emergency_contacts','owner_user_id=$1 AND revoked_at IS NULL',[user.id],r=>contactView(db,r));
 if(key==='POST /contacts')return createContact(db,user,b);
 if(key==='PATCH /contacts/{id}'){
  const contact=await ownContact(db,user,p.id);
  requireCondition(String(contact.revision)===req.headers['if-match'],409,'CONFLICT');
  const r=await db.query('UPDATE emergency_contacts SET name=COALESCE($2,name),priority=COALESCE($3,priority),revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *',[p.id,b.name??null,b.priority??null]);
  return contactView(db,r.rows[0]);
 }
 if(key==='DELETE /contacts/{id}'){await revokeContact(db,await ownContact(db,user,p.id),true);return;}
 if(key==='POST /contacts/{id}/invite')return invite(db,user,p.id);
 if(key==='GET /contacts/invitations'){
  const r=await db.query("SELECT i.*,c.id AS contact_id,u.display_name FROM contact_invitations i JOIN emergency_contacts c ON c.id=i.contact_id JOIN app_users u ON u.id=c.owner_user_id WHERE c.phone_e164=$1 AND c.revoked_at IS NULL AND i.expires_at>now() ORDER BY i.created_at DESC LIMIT 100",[user.phone_e164]);
  return {items:r.rows.map(r=>({invite_id:r.id,contact_id:r.contact_id,owner_display_name:r.display_name,expires_at:iso(r.expires_at),status:r.status})),next_cursor:null};
 }
 if(key==='GET /contact-consents'){
  const r=await db.query('SELECT c.*,u.display_name FROM emergency_contacts c JOIN app_users u ON u.id=c.owner_user_id WHERE c.principal_id=$1 AND c.phone_e164=$2 AND c.revoked_at IS NULL ORDER BY c.created_at,c.id LIMIT 100',[user.id,user.phone_e164]);
  return {items:r.rows.map(c=>({contact_id:c.id,owner_display_name:c.display_name,status:c.invite_status,consent_at:c.consent_at?iso(c.consent_at):null})),next_cursor:null};
 }
 if(key==='POST /contacts/invitations/accept')return decideInvite(db,user,b,true);
 if(key==='POST /contacts/invitations/decline'){await decideInvite(db,user,b,false);return;}
 if(key==='POST /contacts/invitations/{inviteId}/accept')return decideInvite(db,user,b,true,p.inviteId);
 if(key==='POST /contacts/invitations/{inviteId}/decline'){await decideInvite(db,user,b,false,p.inviteId);return;}
 if(key==='GET /received-alerts')return receivedAlerts(db,user);
 if(key.startsWith('GET /received-alerts/')||key.startsWith('POST /received-alerts/')){
  const g=await recipientGrant(db,user,p.grantId);
  if(key==='POST /received-alerts/{grantId}/acknowledge'){requireCondition(g.kind==='SOS_READ',403,'FORBIDDEN');return acknowledge(db,g,b);}
  return {grant_id:g.id,kind:g.kind,event:g.kind==='SOS_READ'?await trackingView(db,g):null,journey:g.kind==='JOURNEY_READ'?await journeyTracking(db,g):null};
 }
 if(key.includes('/contact-consents/')){
  const r=await db.query('SELECT * FROM emergency_contacts WHERE id=$1 AND principal_id=$2 AND phone_e164=$3 AND revoked_at IS NULL FOR UPDATE',[p.contactId,user.id,user.phone_e164]);
  requireCondition(r.rowCount,404,'NOT_FOUND');
  if(req.method==='DELETE'){await revokeContact(db,r.rows[0]);return;}
  await db.query('DELETE FROM contact_blocks WHERE phone_hash=$1 AND owner_user_id=$2',[hash(user.phone_e164),r.rows[0].owner_user_id]);
  const updated=await db.query("UPDATE emergency_contacts SET invite_status='VERIFIED',consent_at=now(),consent_version=$2,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *",[p.contactId,b.consent_version]);
  await audit(db,user.id,'CONTACT_RECONSENT','CONTACT',p.contactId);
  return contactView(db,updated.rows[0]);
 }
 if(key==='POST /contact-location/sessions'){
  const r=await db.query("SELECT * FROM emergency_contacts WHERE id=$1 AND principal_id=$2 AND phone_e164=$3 AND invite_status='VERIFIED' AND revoked_at IS NULL FOR UPDATE",[b.contact_id,user.id,user.phone_e164]);
  requireCondition(r.rowCount,403,'FORBIDDEN');
  await db.query('UPDATE contact_location_sessions SET revoked_at=now(),location=NULL,location_at=NULL WHERE contact_id=$1 AND revoked_at IS NULL',[b.contact_id]);
  const session=id(),expires=after(b.duration_minutes*60000);
  await db.query('INSERT INTO contact_location_sessions(id,contact_id,principal_id,consent_version,expires_at) VALUES($1,$2,$3,$4,$5)',[session,b.contact_id,user.id,b.consent_version,expires]);
  return {session_id:session,expires_at:expires};
 }
 if(key==='PUT /contact-location/sessions/{id}/position')return contactPosition(db,user,p.id,b);
 if(key==='DELETE /contact-location/sessions/{id}'){
  const r=await db.query('UPDATE contact_location_sessions SET revoked_at=now(),location=NULL,location_at=NULL WHERE id=$1 AND principal_id=$2 RETURNING id',[p.id,user.id]);
  requireCondition(r.rowCount,404,'NOT_FOUND');return;
 }
 if(key==='PUT /devices/{installationId}'){
  const old=await db.query('SELECT user_id FROM device_sessions WHERE installation_id=$1 OR token_hash=$2 FOR UPDATE',[p.installationId,hash(b.push_token)]);
  requireCondition(old.rows.every(r=>r.user_id===user.id),409,'CONFLICT');
  const r=await db.query('INSERT INTO device_sessions(id,user_id,installation_id,token_hash,token_ciphertext,notifications_enabled) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(installation_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,token_ciphertext=EXCLUDED.token_ciphertext,notifications_enabled=EXCLUDED.notifications_enabled,last_seen_at=now(),revoked_at=NULL RETURNING id,last_seen_at',[id(),user.id,p.installationId,hash(b.push_token),encrypt(b.push_token),b.notifications_enabled]);
  return {device_id:r.rows[0].id,registered_at:iso(r.rows[0].last_seen_at)};
 }
 if(key==='DELETE /devices/{installationId}'){await db.query('UPDATE device_sessions SET revoked_at=now() WHERE installation_id=$1 AND user_id=$2',[p.installationId,user.id]);return;}
 if(key==='POST /sos'){
  await lock(db,'sos-rate:'+user.id);
  const existing=await db.query('SELECT 1 FROM sos_intents WHERE user_id=$1 AND client_request_id=$2',[user.id,b.client_request_id]);
  if(!existing.rowCount)await limit(db,'SOS:'+user.id,10,600);
  const created=await createSos(db,user,b);
  if(created.replayed)res.setHeader('Idempotency-Replayed','true');
  res.status(created.replayed?200:201);
  return sosView(db,created.event,created.replayed,false);
 }
 if(key==='GET /sos')return paged(db,req,'sos_events','user_id=$1',[user.id],async e=>{const v=await sosView(db,e,false,false);return {event_id:e.id,trigger_type:e.trigger_type,status:e.status,dispatch_status:v.dispatch_status,created_at:iso(e.created_at),ended_at:e.ended_at?iso(e.ended_at):null};});
 if(key==='GET /sos/by-client-request/{clientRequestId}'){
  const r=await db.query('SELECT * FROM sos_events WHERE user_id=$1 AND client_request_id=$2',[user.id,p.clientRequestId]);
  requireCondition(r.rowCount,404,'NOT_FOUND');return sosView(db,r.rows[0]);
 }
 if(key==='POST /sos/intents/{clientRequestId}/terminate')return terminateIntent(db,user,p.clientRequestId,b.reason);
 if(key==='GET /sos/{id}')return sosView(db,await ownEvent(db,p.id,user.id));
 if(key==='POST /sos/{id}/locations')return appendLocation(db,await ownEvent(db,p.id,user.id,true),b);
 if(key==='POST /sos/{id}/resolve')return sosView(db,await resolveSos(db,await ownEvent(db,p.id,user.id,true),b.resolution));
 if(key==='POST /sos/{id}/cancel')return sosView(db,await resolveSos(db,await ownEvent(db,p.id,user.id,true),'FALSE_ALARM',true));
 if(key.includes('/sos/{id}/recipients/')){
  const e=await ownEvent(db,p.id,user.id,true);
  requireCondition(!e.ended_at&&e.expires_at>new Date(),409,'INVALID_TRANSITION');
  const r=await db.query("SELECT c.*,r.id AS recipient FROM sos_recipients r JOIN emergency_contacts c ON c.id=r.contact_id WHERE r.id=$1 AND r.sos_event_id=$2 AND c.invite_status='VERIFIED' AND c.revoked_at IS NULL",[p.recipientId,p.id]);
  requireCondition(r.rowCount,404,'NOT_FOUND');
  await db.query('UPDATE tracking_grants SET revoked_at=now(),recovery_ciphertext=NULL WHERE recipient_id=$1',[p.recipientId]);
  if(req.method==='DELETE')return;
  const g=await grant(db,r.rows[0],p.id,p.recipientId,null,iso(e.expires_at));
  await enqueue(db,p.id,p.recipientId,'REISSUE',{to:r.rows[0].phone_e164,kind:'SOS',url:config.trackingBase+'/track#token='+g.token,grant_id:g.id},'REISSUE:'+g.id,g.expires_at);
  return {grant_id:g.id,expires_at:g.expires_at,dispatch_status:'QUEUED'};
 }
 if(key==='POST /tracking/exchange'){requireCondition(req.headers.origin===config.origin,403,'FORBIDDEN');await limit(db,'exchange:'+hash(b.token),10,600);return exchange(db,b,res);}
 if(key.startsWith('GET /tracking/')||key.startsWith('POST /tracking/')){
  const g=await trackingSession(db,req,key.includes('/journey')?'JOURNEY_READ':key.includes('/logout')?undefined:'SOS_READ');
  if(key==='GET /tracking/event')return trackingView(db,g);
  if(key==='GET /tracking/journey')return journeyTracking(db,g);
  if(key==='POST /tracking/navigation'){
   requireCondition(b.consent===true,403,'CONSENT_REQUIRED');const e=(await db.query('SELECT position FROM sos_events WHERE id=$1',[g.sos_event_id])).rows[0];
   if(!e.position)return {distance_m:null,eta_seconds:null,method:'UNAVAILABLE',warning:'Owner location unavailable. Tracking remains usable.'};
   const d=(await db.query('SELECT ST_Distance(ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,ST_SetSRID(ST_MakePoint($3,$4),4326)::geography) AS metres',[b.origin.lon,b.origin.lat,e.position.lon,e.position.lat])).rows[0].metres;
   return {distance_m:d,eta_seconds:Math.round(d/1.2),method:'STRAIGHT_LINE_ESTIMATE',warning:'Straight-line walking estimate; obstacles and actual routes are unknown. Origin is not stored.'};
  }
  if(key==='POST /tracking/acknowledge')return acknowledge(db,g,b);
  if(key==='POST /tracking/logout'){await db.query('UPDATE browser_sessions SET revoked_at=now() WHERE id=$1',[g.session_id]);res.clearCookie(cookieName(g.id),{path:'/v1'});return;}
  if(key==='GET /tracking/locations'){
   const count=Number(req.query.limit??20),cursor=decodeCursor(req.query.cursor);
   requireCondition(Number.isInteger(count)&&count>=1&&count<=100,400,'VALIDATION_ERROR');
   const r=await db.query("SELECT *,to_char(received_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS cursor_at FROM sos_locations WHERE sos_event_id=$1"+(cursor?' AND (received_at,id)<($2::timestamptz,$3::uuid)':'')+' ORDER BY received_at DESC,id DESC LIMIT '+(count+1),cursor?[g.sos_event_id,...cursor]:[g.sos_event_id]);
   const page=cursorPage(r.rows,count);
   return {items:page.items.map(r=>({sample_id:r.sample_id,location:r.location,received_at:iso(r.received_at)})),next_cursor:page.next_cursor};
  }
 }
 if(key==='POST /providers/{provider}/receipts'){
  requireCondition(p.provider==='fake'&&config.env==='local',404,'NOT_FOUND');
  const stamp=String(req.headers['x-provider-timestamp']??'');
  requireCondition(Math.abs(Date.now()-Number(stamp))<300000,401,'UNAUTHENTICATED');
  const sig=createHmac('sha256',config.receiptSecret).update(stamp+'.'+(req as Request&{rawBody:string}).rawBody).digest('hex');
  requireCondition(safeEqual(sig,String(req.headers['x-provider-signature']??'')),401,'UNAUTHENTICATED');
  const match=await db.query('SELECT d.id,d.event_id,d.status FROM delivery_intents d JOIN notification_outbox o ON o.intent_id=d.id JOIN fake_messages m ON m.outbox_id=o.id WHERE m.id=$1 FOR UPDATE OF d',[b.provider_message_ref]);
  requireCondition(match.rowCount,404,'NOT_FOUND');
  const inserted=await db.query('INSERT INTO provider_receipts(provider,receipt_id,provider_message_ref,status) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING receipt_id',[p.provider,b.receipt_id,b.provider_message_ref,b.status]);
  if(inserted.rowCount&&match.rows[0].status!=='DELIVERED'){
   await db.query("UPDATE delivery_intents SET status=$2 WHERE id=$1 AND status<>'SUPPRESSED'",[match.rows[0].id,b.status]);
   if(match.rows[0].event_id)await eventChange(db,match.rows[0].event_id,'DISPATCH_UPDATED');
  }return;
 }
 if(key==='POST /routes/evaluate'){await limit(db,'route:'+user.id,30,60);return evaluateRoutes(db,user,b);}
 if(key==='POST /journeys')return createJourney(db,user,b);
 if(key==='GET /journeys'){
  const statuses=req.query.status===undefined?null:Array.isArray(req.query.status)?req.query.status:[req.query.status];
  if(statuses)requireCondition(statuses.every(s=>['ACTIVE','OVERDUE','ARRIVED','ESCALATED','CANCELLED'].includes(String(s))),400,'VALIDATION_ERROR');
  return paged(db,req,'journeys','user_id=$1'+(statuses?' AND status=ANY($2::text[])':''),statuses?[user.id,statuses]:[user.id],journeyView);
 }
 if(key.startsWith('GET /journeys/{id}')||key.startsWith('POST /journeys/{id}')){
  const j=await ownJourney(db,user,p.id);
  if(req.method==='GET')return journeyView(j);
  if(key.endsWith('/locations'))return appendLocation(db,j,b,true);
  if(key.endsWith('/arrive'))return journeyView(await finishJourney(db,j,'ARRIVED'));
  if(key.endsWith('/cancel'))return journeyView(await finishJourney(db,j,'CANCELLED'));
  if(key.endsWith('/check-in'))return checkIn(db,j,b);
  if(key.endsWith('/sharing'))return journeyView(await shareJourney(db,user,j,b.enabled,b.contact_ids));
 }
 if(key==='GET /safe-shops'){
  const lat=Number(req.query.lat),lon=Number(req.query.lon),radius=Number(req.query.radius_m??1000);
  requireCondition(Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180&&radius>0&&radius<=5000,400,'VALIDATION_ERROR');
  const r=await db.query("SELECT *,ST_Distance(position,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance_m FROM safe_shops WHERE status='ACTIVE' AND ST_DWithin(position,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,$3) ORDER BY distance_m,id LIMIT 100",[lon,lat,radius]);
  return {items:r.rows.map(r=>shopView(r)),next_cursor:null};
 }
 if(key==='GET /safe-shops/mine')return paged(db,req,'safe_shops','owner_user_id=$1',[user.id],s=>shopView(s));
 if(key==='POST /safe-shops/apply'){
  requireCondition(b.position.lat>=26.78&&b.position.lat<=26.94&&b.position.lon>=80.84&&b.position.lon<=81.04,422,'OUTSIDE_PILOT');
  assertHours(b.hours);const shopId=id();
  const r=await db.query('INSERT INTO safe_shops(id,owner_user_id,name,location,position,public_phone,hours,listing_consent_version,opt_in_alerts,agreement_version) VALUES($1,$2,$3,$4,ST_SetSRID(ST_MakePoint($5,$6),4326)::geography,$7,$8,$9,$10,$11) RETURNING *',[shopId,user.id,b.name,b.position,b.position.lon,b.position.lat,b.public_phone,b.hours,b.listing_consent_version,b.opt_in_alerts,b.agreement_version]);
  await audit(db,user.id,'SHOP_APPLY','SHOP',shopId);return shopView(r.rows[0]);
 }
 if(key.startsWith('PATCH /safe-shops/{id}')||key==='DELETE /safe-shops/{id}'){
  const r=await db.query('SELECT * FROM safe_shops WHERE id=$1 AND owner_user_id=$2 FOR UPDATE',[p.id,user.id]);requireCondition(r.rowCount,404,'NOT_FOUND');
  const shop=r.rows[0];
  if(req.method==='DELETE'){await db.query("UPDATE safe_shops SET status='REVOKED',opt_in_alerts=false,revision=revision+1,updated_at=now() WHERE id=$1",[p.id]);return;}
  if(key.endsWith('/availability')){
   requireCondition(shop.revision===b.expected_revision,409,'CONFLICT');
   if(b.action==='RESUME'||b.action==='CONFIRM_OPEN')requireCondition(shop.verification_level==='PILOT_CHECKED'&&shop.status!=='REVOKED',409,'INVALID_TRANSITION');
   if(b.action==='PAUSE')shop.status='PAUSED';
   if(b.action==='RESUME'){shop.status='ACTIVE';shop.closure_until=null;}
   if(b.action==='CLOSE')shop.closure_until=after(43200000);
   if(b.action==='CONFIRM_OPEN'){requireCondition(!shop.closure_until||new Date(shop.closure_until)<=new Date(),409,'INVALID_TRANSITION');shop.confirmed_at=new Date();shop.confirmation_expires_at=after(1800000);}
   await db.query('UPDATE safe_shops SET status=$2,closure_until=$3,confirmed_at=$4,confirmation_expires_at=$5,revision=revision+1,updated_at=now() WHERE id=$1',[p.id,shop.status,shop.closure_until,shop.confirmed_at,shop.confirmation_expires_at]);
  }else{
   if(b.hours)assertHours(b.hours);
   if(b.hours)await db.query('UPDATE safe_shops SET hours_reviewed_at=now() WHERE id=$1',[p.id]);
   const material=b.name!==undefined||b.public_phone!==undefined;
   await db.query('UPDATE safe_shops SET name=COALESCE($2,name),public_phone=CASE WHEN $3 THEN $4 ELSE public_phone END,hours=COALESCE($5,hours),status=CASE WHEN $6 THEN \'PENDING\' ELSE status END,verification_level=CASE WHEN $6 THEN \'NONE\' ELSE verification_level END,revision=revision+1,updated_at=now() WHERE id=$1',[p.id,b.name??null,b.public_phone!==undefined,b.public_phone??null,b.hours??null,material]);
  }
  await db.query('INSERT INTO shop_audit(id,shop_id,actor_id,action,reason) VALUES($1,$2,$3,$4,$5)',[id(),p.id,user.id,b.action??'EDIT','Owner update']);
  return shopView((await db.query('SELECT * FROM safe_shops WHERE id=$1',[p.id])).rows[0]);
 }
 if(key==='POST /incident-reports'){
  validateLocation(b.location,true);
  requireCondition(b.location.lat>=26.78&&b.location.lat<=26.94&&b.location.lon>=80.84&&b.location.lon<=81.04,422,'OUTSIDE_PILOT');
  await limit(db,'report:'+user.id,5,86400);
  const happened=new Date(b.happened_at);requireCondition(happened.getTime()<=Date.now()+60000&&happened.getTime()>=Date.now()-90*86400000,400,'VALIDATION_ERROR');
  const cell=cellId(b.location),duplicate=await db.query("SELECT 1 FROM incident_reports WHERE reporter_user_id=$1 AND category=$2 AND cell_id=$3 AND created_at>now()-interval '1 day'",[user.id,b.category,cell]);
  requireCondition(!duplicate.rowCount,409,'CONFLICT');
  const description=b.description?.replace(/<[^>]*>/g,'').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[redacted]').replace(/\+?\d[\d\s()-]{7,}\d/g,'[redacted]')??null;
  const r=await db.query('INSERT INTO incident_reports(id,reporter_user_id,category,location,position,cell_id,description,happened_at,expires_at) VALUES($1,$2,$3,$4,ST_SetSRID(ST_MakePoint($5,$6),4326)::geography,$7,$8,$9,$10) RETURNING *',[id(),user.id,b.category,b.location,b.location.lon,b.location.lat,cell,description,b.happened_at,after(90*86400000,happened)]);
  return reportView(r.rows[0]);
 }
 if(key==='GET /incident-reports/mine')return paged(db,req,'incident_reports','reporter_user_id=$1',[user.id],reportView);
 if(key==='POST /incident-reports/{id}/withdraw'){
  const r=await db.query("UPDATE incident_reports SET moderation_status='WITHDRAWN',revision=revision+1,updated_at=now() WHERE id=$1 AND reporter_user_id=$2 RETURNING *",[p.id,user.id]);requireCondition(r.rowCount,404,'NOT_FOUND');return reportView(r.rows[0]);
 }
 if(key==='GET /incident-reports/aggregate'){
  const bbox=String(req.query.bbox??'80.94,26.844,80.952,26.856').split(',').map(Number);
  requireCondition(bbox.length===4&&bbox.every(Number.isFinite)&&bbox[0]<bbox[2]&&bbox[1]<bbox[3]&&(bbox[2]-bbox[0])*100*(bbox[3]-bbox[1])*111<25,400,'VALIDATION_ERROR');
  const r=await db.query("SELECT cell_id,category,count(DISTINCT reporter_user_id)::int AS n,max(updated_at) AS updated_at FROM incident_reports WHERE moderation_status='APPROVED' AND expires_at>now() AND ST_Intersects(position::geometry,ST_MakeEnvelope($1,$2,$3,$4,4326)) GROUP BY cell_id,category HAVING count(DISTINCT reporter_user_id)>=3",[...bbox]);
  return {schema_version:1,cells:r.rows.map(r=>({cell_id:r.cell_id,geometry:cellGeometry(r.cell_id),category:r.category,count_bucket:r.n<=5?'3-5':r.n<=10?'6-10':'11+',updated_at:iso(r.updated_at)})),suppression_m:250,server_time:new Date().toISOString()};
 }
 if(key.startsWith('GET /admin/')||key.startsWith('POST /admin/')){
  await requireModerator(user);
  const isReport=key.includes('/reports/'),table=isReport?'incident_reports':'safe_shops';
  if(key==='GET /admin/review-queue'){
   requireCondition(req.query.kind==='REPORT'||req.query.kind==='SHOP',400,'VALIDATION_ERROR');
   const reports=req.query.kind==='REPORT',t=reports?'incident_reports':'safe_shops',status=reports?'moderation_status':'status';
   const r=await db.query('SELECT * FROM '+t+' WHERE '+status+"='PENDING' ORDER BY created_at,id LIMIT 100");
   return {items:r.rows.map(r=>({kind:req.query.kind,id:r.id,submitted_at:iso(r.created_at),status:r[status],label:reports?r.category:r.name})),next_cursor:null};
  }
  const r=await db.query('SELECT * FROM '+table+' WHERE id=$1 FOR UPDATE',[p.id]);requireCondition(r.rowCount,404,'NOT_FOUND');
  if(req.method==='GET')return isReport?reportView(r.rows[0]):shopView(r.rows[0]);
  requireCondition(r.rows[0].revision===b.expected_revision,409,'CONFLICT');
  if(isReport){
   const state={APPROVE:'APPROVED',REJECT:'REJECTED',REMOVE:'WITHDRAWN'}[b.action as 'APPROVE'|'REJECT'|'REMOVE'];
   await db.query('UPDATE incident_reports SET moderation_status=$2,moderation_reason=$3,revision=revision+1,updated_at=now() WHERE id=$1',[p.id,state,b.reason]);
   await db.query('INSERT INTO incident_moderation(id,report_id,moderator_id,action,reason) VALUES($1,$2,$3,$4,$5)',[id(),p.id,user.id,b.action,b.reason]);
  }else{
   const state={ACTIVATE:'ACTIVE',REJECT:'REVOKED',PAUSE:'PAUSED'}[b.action as 'ACTIVATE'|'REJECT'|'PAUSE'];
   await db.query("UPDATE safe_shops SET status=$2,verification_level=CASE WHEN $3 THEN 'PILOT_CHECKED' ELSE verification_level END,verified_at=CASE WHEN $3 THEN now() ELSE verified_at END,verified_by=CASE WHEN $3 THEN $4 ELSE verified_by END,revision=revision+1,updated_at=now() WHERE id=$1",[p.id,state,b.action==='ACTIVATE',user.id]);
   await db.query('INSERT INTO shop_audit(id,shop_id,actor_id,action,reason) VALUES($1,$2,$3,$4,$5)',[id(),p.id,user.id,b.action,b.reason]);
  }
  await audit(db,user.id,'MODERATION',isReport?'REPORT':'SHOP',p.id);
  const updated=(await db.query('SELECT * FROM '+table+' WHERE id=$1',[p.id])).rows[0];return isReport?reportView(updated):shopView(updated);
 }
 throw new ApiError(503,'FEATURE_DISABLED');
}
export function createApp(verify:VerifyToken=verifyFirebase){
 validateConfig();
 const app=express();
 app.disable('x-powered-by');app.set('query parser','simple');
 app.use(helmet({referrerPolicy:{policy:'no-referrer'}}),cors({origin:config.origin,credentials:true,exposedHeaders:['X-Request-ID','Idempotency-Replayed','X-Server-Time']}),cookies());
 app.use(express.json({limit:'32kb',verify:(req,_res,bytes)=>{(req as unknown as {rawBody:string}).rawBody=bytes.toString();}}));
 app.use((req,res,next)=>{
  const raw=String(req.headers['x-request-id']??'');res.locals.requestId=uuidPattern.test(raw)?raw:id();
  res.setHeader('X-Request-ID',res.locals.requestId);res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex');next();
 });
 mountStreams(app,verify);
 // Local-only authenticated inbox. Never mounted in staging/pilot.
 if(config.env==='local')app.get('/v1/dev/inbox',async(req,res,next)=>{
  try{const user=await authenticate(req,verify);const r=await pool.query('SELECT id,material_ciphertext,created_at FROM fake_messages WHERE expires_at>now() ORDER BY created_at DESC LIMIT 100');
   res.json({items:r.rows.flatMap(r=>{const m=decrypt<Row>(r.material_ciphertext);return m.to===user.phone_e164?[{id:r.id,kind:m.kind,url:m.url??null,created_at:iso(r.created_at)}]:[];}),next_cursor:null});
  }catch(e){next(e);}
 });
 for(const op of operations){
  const path='/v1'+op.path.replace(/\{([^}]+)\}/g,':$1');
  const method=op.method.toLowerCase() as 'get'|'post'|'put'|'patch'|'delete';
  app[method](path,async(req,res,next)=>{
   try{
    for(const [name,value] of Object.entries(req.params))if(name!=='provider')requireCondition(uuidPattern.test(String(value)),400,'VALIDATION_ERROR');
    if(op.input)requireCondition(validate(op.input,req.body),400,'VALIDATION_ERROR');
    const user=op.auth==='bearer'&&!(op.method==='GET'&&op.path==='/evidence/{assetId}'&&req.headers['x-tracking-grant-id'])?await authenticate(req,verify,op.path==='/me/deletion/{jobId}'||(op.method==='DELETE'&&op.path==='/me')):{};
    if(op.path==='/health/live'){res.json({status:'OK'});return;}
    const b=req.body??{},isMutation=method!=='get';
    const key=String(req.headers['idempotency-key']??'');
    const exempt=op.auth==='public'||op.path.endsWith('/locations')||op.path.endsWith('/position')||op.path.endsWith('/logout');
    if(isMutation&&!exempt)requireCondition(uuidPattern.test(key),400,'VALIDATION_ERROR');
    if(op.path==='/sos'&&method==='post')requireCondition(key===b.client_request_id,400,'VALIDATION_ERROR');
    const operation=op.method+' '+op.path;
    const output=await transaction(async db=>{
     let scopeUser=user;
     // Tracking authorization runs inside dispatch and validates its selected cookie on every access.
     let principalId=String(user.id??'');
     if(op.auth==='tracking'){const g=await trackingSession(db,req);principalId=(await db.query('SELECT principal_id FROM emergency_contacts WHERE id=$1',[g.contact_id])).rows[0]?.principal_id??'';scopeUser={id:principalId};}
     // Authorization must precede cached acknowledgements after resolution/revocation.
     if(op.path.startsWith('/received-alerts/{grantId}'))await recipientGrant(db,user,String(req.params.grantId));
     const cache=isMutation&&!exempt&&op.path!=='/sos'&&op.path!=='/me';
     const digest=bodyHash(b),scope=operation+':'+req.path+(op.auth==='tracking'?':'+String(req.headers['x-tracking-grant-id']):'');
     if(cache){
      await lock(db,'idempotency:'+principalId+':'+scope+':'+key);
      const old=await db.query('SELECT * FROM idempotency_records WHERE principal=$1 AND operation=$2 AND key=$3 AND expires_at>now()',[principalId,scope,key]);
      if(old.rowCount){requireCondition(old.rows[0].request_hash===digest,409,'IDEMPOTENCY_MISMATCH');res.setHeader('Idempotency-Replayed','true');res.status(op.success===201?200:op.success);return old.rows[0].result;}
     }
     const value=await dispatch({db,req,res,user:scopeUser,b,verify},operation);
     if(op.output&&!validate(op.output,value))throw new ApiError(500,'INTERNAL_ERROR','Response validation failed');
     if(cache)await db.query('INSERT INTO idempotency_records(principal,operation,key,request_hash,result,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[principalId,scope,key,digest,JSON.stringify(value??null),after(86400000)]);
     return value;
    },op.path==='/routes/evaluate'?routePool:pool);
    if(op.path==='/me'&&method==='delete')await persistErasureLedger();
    if(res.statusCode===200&&!res.hasHeader('Idempotency-Replayed'))res.status(op.success);
    if(req.query.after_revision!==undefined&&(output as Row)?.revision===Number(req.query.after_revision)){res.setHeader('X-Server-Time',new Date().toISOString());res.status(204).end();}
    else if(res.statusCode===204)res.end();else res.json(output);
   }catch(error){next(error);}
  });
 }
 app.use((_req,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Not found',request_id:res.locals.requestId}}));
 app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  const e=error as Row;
  const status=error instanceof ApiError?error.status:e.code==='23505'?409:e.type==='entity.too.large'?400:e instanceof SyntaxError?400:500;
  const code=error instanceof ApiError?error.code:e.code==='23505'?'CONFLICT':status===400?'VALIDATION_ERROR':'INTERNAL_ERROR';
  if(status===500)console.error(JSON.stringify({event:'request_failed',request_id:res.locals.requestId,category:e.code??e.name??'ERROR'}));
  if(status===429||status===503)res.setHeader('Retry-After','30');
  res.status(status).json({error:{code,message:error instanceof ApiError?error.message:code,request_id:res.locals.requestId??id(),...(error instanceof ApiError&&error.recovery_action?{recovery_action:error.recovery_action}:{})}});
 });
 return app;
}
