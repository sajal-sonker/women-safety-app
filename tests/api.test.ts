import assert from 'node:assert/strict';
import {test,before,after} from 'node:test';
import {randomUUID,createHash} from 'node:crypto';
import type {Server} from 'node:http';
import {createApp} from '../services/api/src/app.ts';
import {pool,routePool} from '../services/api/src/platform/db/index.ts';
import {migrate} from '../services/api/src/platform/db/migrate.ts';
import {config} from '../services/api/src/platform/config.ts';
import {seed,demoUsers,fixtureId} from '../services/api/src/seed.ts';
import {decrypt} from '../services/api/src/platform/security.ts';
import {Worker} from '../services/worker/src/index.ts';
import {persistErasureLedger,recoverErasureLedger,ledgerPath} from '../services/api/src/modules/privacy/ledger.ts';
import {readFile,writeFile} from 'node:fs/promises';
import {hash} from '../services/api/src/platform/security.ts';
let server:Server,base:string;
const identities=new Map(demoUsers.map(u=>[u.uid,u.phone]));
const worker=new Worker();
before(async()=>{
 assert.equal(new URL(config.databaseUrl).pathname,'/suraksha_test','Never run integration tests on the app database');
 await migrate();
 const tables=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('schema_migrations','spatial_ref_sys')")).rows.map(r=>'"'+r.tablename+'"');
 await pool.query('TRUNCATE '+tables.join(',')+' CASCADE');
 await seed();
 server=createApp(async raw=>{const uid=raw.replace(/:stale$/,'');const phone=identities.get(uid);if(!phone)throw Error('invalid');return {uid,phone_number:phone,auth_time:Date.now()/1000-(raw.endsWith(':stale')?600:0)};}).listen(0,'127.0.0.1');
 await new Promise<void>(r=>server.once('listening',()=>r()));
 base='http://127.0.0.1:'+(server.address() as {port:number}).port;
});
after(async()=>{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await Promise.all([pool.end(),routePool.end()]);});
async function call(path:string,options:{uid?:string;method?:string;body?:unknown;key?:string;headers?:Record<string,string>}={}){
 const method=options.method??'GET';
 const res=await fetch(base+'/v1'+path,{method,headers:{Authorization:'Bearer '+(options.uid??'owner-demo'),Origin:config.origin,...(options.body!==undefined?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'Idempotency-Key':options.key??randomUUID()}:{}),...options.headers},...(options.body!==undefined?{body:JSON.stringify(options.body)}:{})});
 return {status:res.status,body:res.status===204?null:await res.json() as any,headers:res.headers};
}
const sosBody=(key:string)=>({trigger_type:'MANUAL',client_request_id:key,triggered_at:new Date().toISOString(),location:null,location_status:'UNAVAILABLE'});
test('same-app recipients accept by ID, track only consented grants, acknowledge and lose access on resolve',async()=>{
 const owner='native-owner',receiver='native-contact',stranger='native-stranger';
 for(const [uid,phone] of [[owner,'+16505550711'],[receiver,'+16505550712'],[stranger,'+16505550713']])identities.set(uid,phone);
 await call('/me',{uid:owner});await call('/me',{uid:stranger});
 const contact=await call('/contacts',{uid:owner,method:'POST',body:{name:'Synthetic sibling',phone_e164:'+16505550712',priority:1}});
 assert.equal(contact.status,201);
 const invite=await call('/contacts/'+contact.body.id+'/invite',{uid:owner,method:'POST',body:{}});
 // Invitation precedes the recipient's first sign-in; no SMS, token or browser exchange needed.
 assert.equal(invite.status,200);await call('/me',{uid:receiver});
 const invitations=await call('/contacts/invitations',{uid:receiver});assert.equal(invitations.body.items[0].invite_id,invite.body.invite_id);
 assert.equal((await call('/contacts/invitations',{uid:stranger})).body.items.length,0);
 const path='/contacts/invitations/'+invite.body.invite_id+'/accept',body={consent_version:'consent-v1'},key=randomUUID();
 assert.equal((await call(path,{uid:stranger,method:'POST',body})).status,403);
 assert.equal((await call(path,{uid:receiver,method:'POST',body,key})).body.invite_status,'VERIFIED');
 assert.equal((await call(path,{uid:receiver,method:'POST',body,key})).status,200);
 const eventKey=randomUUID(),location={lat:26.85,lon:80.946,accuracy_m:15,captured_at:new Date().toISOString(),source:'gps'};
 const event=await call('/sos',{uid:owner,method:'POST',body:{...sosBody(eventKey),location,location_status:'CURRENT'},key:eventKey});assert.equal(event.status,201);
 const received=await call('/received-alerts',{uid:receiver});assert.equal(received.status,200);assert.equal(received.body.items.length,1);
 const grantId=received.body.items[0].grant_id,route='/received-alerts/'+grantId;
 assert.equal((await call('/received-alerts',{uid:stranger})).body.items.length,0);
 assert.equal((await call(route,{uid:stranger})).status,404);assert.equal((await call(route,{uid:owner})).status,404);
 const view=await call(route,{uid:receiver});assert.equal(view.status,200);assert.equal(view.body.event.event_id,event.body.event_id);assert.equal(view.body.event.position.lat,location.lat);assert.equal(view.body.journey,null);
 // A matching phone alone cannot read a grant bound to another principal.
 const strangerId=(await call('/me',{uid:stranger})).body.id;
 await pool.query('UPDATE emergency_contacts SET principal_id=$2 WHERE id=$1',[contact.body.id,strangerId]);
 assert.equal((await call(route,{uid:receiver})).status,404);
 await pool.query('UPDATE emergency_contacts SET principal_id=$2 WHERE id=$1',[contact.body.id,(await call('/me',{uid:receiver})).body.id]);
 assert.equal('recipients' in view.body.event,false);assert.equal('token' in received.body.items[0],false);
 assert.equal((await call('/sos/'+event.body.event_id,{uid:receiver})).status,404);
 const ackKey=randomUUID(),ack={uid:receiver,method:'POST',body:{can_assist:true,eta_minutes:5},key:ackKey};
 assert.equal((await call(route+'/acknowledge',ack)).body.acknowledgement,'CAN_ASSIST');
 assert.equal((await call('/sos/'+event.body.event_id,{uid:owner})).body.recipients[0].acknowledgement,'CAN_ASSIST');
 await call('/sos/'+event.body.event_id+'/resolve',{uid:owner,method:'POST',body:{resolution:'SAFE'}});
 assert.equal((await call(route,{uid:receiver})).status,410);assert.equal((await call(route+'/acknowledge',ack)).status,410,'cached ACK cannot bypass revocation');
 assert.equal((await call('/received-alerts',{uid:receiver})).body.items.length,0);
 const journey=await call('/journeys',{uid:owner,method:'POST',body:{origin:null,destination:{lat:26.85,lon:80.946},expected_arrival_at:new Date(Date.now()+900000).toISOString(),auto_escalate:false,share_with_contacts:true,contact_ids:[contact.body.id]}});assert.equal(journey.status,201);
 const shared=(await call('/received-alerts',{uid:receiver})).body.items[0];assert.equal(shared.kind,'JOURNEY_READ');
 const jr='/received-alerts/'+shared.grant_id;assert.equal((await call(jr,{uid:receiver})).body.journey.journey_id,journey.body.journey_id);
 assert.equal((await call(jr+'/acknowledge',{uid:receiver,method:'POST',body:{can_assist:true}})).status,403);
 assert.equal((await call('/contact-consents/'+contact.body.id,{uid:receiver,method:'DELETE'})).status,204);
 assert.equal((await call(jr,{uid:receiver})).status,410);assert.equal((await call('/received-alerts',{uid:receiver})).body.items.length,0);
});

test('native invitation decline and expired invitation never create consent',async()=>{
 for(const [uid,phone] of [['invite-owner','+16505550721'],['invite-receiver','+16505550722']]){identities.set(uid,phone);await call('/me',{uid});}
 const c=await call('/contacts',{uid:'invite-owner',method:'POST',body:{name:'Synthetic contact',phone_e164:'+16505550722',priority:1}});
 const i=await call('/contacts/'+c.body.id+'/invite',{uid:'invite-owner',method:'POST',body:{}});
 const root='/contacts/invitations/'+i.body.invite_id;
 assert.equal((await call(root+'/decline',{uid:'invite-receiver',method:'POST',body:{block_future_invites:true}})).status,204);
 assert.equal((await call(root+'/accept',{uid:'invite-receiver',method:'POST',body:{consent_version:'consent-v1'}})).status,410);
 assert.equal((await call('/contacts/'+c.body.id+'/invite',{uid:'invite-owner',method:'POST',body:{}})).status,409);
 assert.equal((await call('/contact-consents',{uid:'invite-receiver'})).body.items[0].status,'DECLINED');
 identities.set('expired-receiver','+16505550723');await call('/me',{uid:'expired-receiver'});
 const expiredContact=await call('/contacts',{uid:'invite-owner',method:'POST',body:{name:'Synthetic expired contact',phone_e164:'+16505550723',priority:2}});
 const expired=await call('/contacts/'+expiredContact.body.id+'/invite',{uid:'invite-owner',method:'POST',body:{}});
 await pool.query("UPDATE contact_invitations SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.body.invite_id]);
 assert.equal((await call('/contacts/invitations/'+expired.body.invite_id+'/accept',{uid:'expired-receiver',method:'POST',body:{consent_version:'consent-v1'}})).status,410);
});
test('five concurrent SOS replays persist one event and one intent per recipient, without GPS',async()=>{
 const key=randomUUID(),body=sosBody(key);
 const replies=await Promise.all(Array.from({length:5},()=>call('/sos',{method:'POST',body,key})));
 assert.equal(replies.filter(r=>r.status===201).length,1);
 assert.equal(replies.filter(r=>r.status===200).length,4);
 const eventId=replies[0].body.event_id;
 assert.ok(replies.every(r=>r.body.event_id===eventId));
 assert.ok(replies[0].body.warnings.includes('LOCATION_UNAVAILABLE'));
 const counts=await pool.query('SELECT (SELECT count(*)::int FROM sos_events WHERE client_request_id=$1) AS events,(SELECT count(*)::int FROM delivery_intents WHERE event_id=$2) AS sends',[key,eventId]);
 assert.deepEqual(counts.rows[0],{events:1,sends:5});
 assert.equal((await call('/sos',{method:'POST',body:{...body,triggered_at:new Date(Date.now()-1000).toISOString()},key})).status,409);
 assert.equal((await call('/sos/'+eventId,{uid:'second-demo'})).status,404);
});
test('opted-in repeated-word SOS uses existing ML_FUSION intent idempotency and resolution',async()=>{
 const key=randomUUID(),body={...sosBody(key),trigger_type:'ML_FUSION'};
 assert.equal((await call('/sos',{uid:'second-demo',method:'POST',body,key})).status,503);
 await call('/me/consents',{uid:'second-demo',method:'PATCH',body:{version:'consent-v1',monitoring:true}});
 const first=await call('/sos',{uid:'second-demo',method:'POST',body,key});assert.equal(first.status,201);assert.equal((await call('/sos/'+first.body.event_id,{uid:'second-demo'})).body.trigger_type,'ML_FUSION');
 const replay=await call('/sos',{uid:'second-demo',method:'POST',body,key});assert.equal(replay.status,200);assert.equal(replay.body.event_id,first.body.event_id);
 assert.equal((await call('/sos/'+first.body.event_id+'/resolve',{uid:'second-demo',method:'POST',body:{resolution:'SAFE'}})).status,200);
 await call('/me/consents',{uid:'second-demo',method:'PATCH',body:{version:'consent-v1',monitoring:false}});
});
test('personal display name remains scoped to its owner and rejects oversized names',async()=>{
 const original=(await call('/me',{uid:'second-demo'})).body.display_name;
 const other=(await call('/me')).body.display_name;
 assert.equal((await call('/me',{uid:'second-demo',method:'PATCH',body:{display_name:'Demo Person'}})).status,200);
 assert.equal((await call('/me',{uid:'second-demo'})).body.display_name,'Demo Person');assert.equal((await call('/me')).body.display_name,other);
 assert.equal((await call('/me',{uid:'second-demo',method:'PATCH',body:{display_name:'x'.repeat(81)}})).status,400);
 await call('/me',{uid:'second-demo',method:'PATCH',body:{display_name:original}});
});
test('terminal tombstone wins against a late create; absence of event is not cancellation proof',async()=>{
 const key=randomUUID();
 assert.equal((await call('/sos/intents/'+key+'/terminate',{method:'POST',body:{reason:'SAFE'}})).status,200);
 const late=await call('/sos',{method:'POST',key,body:sosBody(key)});
 assert.equal(late.status,409);assert.equal(late.body.error.code,'INTENT_TERMINATED');
});
test('provider acceptance is distinct from delivery, tracking is scoped and revokes immediately',async()=>{
 const key=randomUUID(),created=await call('/sos',{method:'POST',body:sosBody(key),key});
 await worker.delivery();
 const detail=await call('/sos/'+created.body.event_id);
 assert.ok(detail.body.recipients.every((r:any)=>r.channels[0].status==='PROVIDER_ACCEPTED'));
 const msg=await pool.query('SELECT m.material_ciphertext FROM fake_messages m JOIN notification_outbox o ON o.id=m.outbox_id JOIN delivery_intents d ON d.id=o.intent_id WHERE d.event_id=$1 LIMIT 1',[created.body.event_id]);
 const raw=decrypt<any>(msg.rows[0].material_ciphertext).url.split('#token=')[1],exchangeId=randomUUID();
 const ex=await call('/tracking/exchange',{method:'POST',body:{token:raw,exchange_id:exchangeId}});
 assert.equal(ex.status,200);
 const cookie=ex.headers.get('set-cookie')!.split(';')[0];
 const headers={Cookie:cookie,'X-Tracking-Grant-ID':ex.body.grant_id,'X-CSRF-Token':ex.body.csrf_token};
 assert.equal((await call('/tracking/exchange',{method:'POST',body:{token:raw,exchange_id:exchangeId}})).status,200);
 assert.equal((await call('/tracking/exchange',{method:'POST',body:{token:raw,exchange_id:randomUUID()}})).status,409);
 const view=await call('/tracking/event',{headers});
 assert.equal(view.status,200);assert.equal(view.body.event_id,created.body.event_id);
 assert.equal('recipients'in view.body,false);assert.equal('phone_e164'in view.body,false);
 const ack=await call('/tracking/acknowledge',{method:'POST',body:{can_assist:true,eta_minutes:8},headers});
 assert.equal(ack.status,200);assert.equal(ack.body.acknowledgement,'CAN_ASSIST');
 assert.equal((await call('/tracking/acknowledge',{method:'POST',body:{can_assist:false},headers:{...headers,'X-CSRF-Token':'wrong'}})).status,403);
 assert.equal((await call('/sos/'+created.body.event_id+'/resolve',{method:'POST',body:{resolution:'SAFE'}})).status,200);
 assert.equal((await call('/tracking/event',{headers})).status,410);
});
test('contact cap is transactional under six simultaneous additions',async()=>{
 const replies=await Promise.all(Array.from({length:6},(_,i)=>call('/contacts',{uid:'second-demo',method:'POST',body:{name:'Synthetic '+i,phone_e164:'+1650555080'+i,priority:1}})));
 assert.equal(replies.filter(r=>r.status===201).length,5);assert.equal(replies.filter(r=>r.status===409).length,1);
});
test('contact location requires independent consent and only exposes availability to owner',async()=>{
 const contact=fixtureId('trusted-1');
 assert.equal((await call('/contact-location/sessions',{method:'POST',body:{contact_id:contact,consent_version:'consent-v1',duration_minutes:5}})).status,403);
 const s=await call('/contact-location/sessions',{uid:'contact-1',method:'POST',body:{contact_id:contact,consent_version:'consent-v1',duration_minutes:5}});
 assert.equal(s.status,201);
 assert.equal((await call('/contact-location/sessions/'+s.body.session_id+'/position',{uid:'contact-1',method:'PUT',body:{sample_id:randomUUID(),location:{lat:26.85,lon:80.946,accuracy_m:20,captured_at:new Date().toISOString(),source:'gps'}}})).status,200);
 const contacts=await call('/contacts');assert.equal(contacts.body.items.find((c:any)=>c.id===contact).location_available,true);
 assert.equal(JSON.stringify(contacts.body).includes('26.85'),false);
});
test('routes use the seeded walking graph with honest synthetic provenance and bounded estimates',async()=>{
 const result=await call('/routes/evaluate',{method:'POST',body:{origin:{lat:26.848,lon:80.943},destination:{lat:26.852,lon:80.949},depart_at:new Date().toISOString(),mode:'walking'}});
 assert.equal(result.status,200);assert.ok(result.body.routes.length>=1&&result.body.routes.length<=3);
 assert.match(result.body.coverage_warning,/fictional/i);
 for(const r of result.body.routes){assert.equal(r.geometry.type,'LineString');assert.ok(r.risk_indicator===null||r.risk_indicator>=0&&r.risk_indicator<=100);assert.ok(r.confidence>=0&&r.confidence<=1);}
 const bad=await call('/routes/evaluate',{method:'POST',body:{origin:{lat:28,lon:77},destination:{lat:26.852,lon:80.949},depart_at:new Date().toISOString(),mode:'walking'}});
 assert.equal(bad.status,422);
});
test('journey deadline escalation is durable, idempotent and independent from arrival after escalation',async()=>{
 const j=await call('/journeys',{uid:'second-demo',method:'POST',body:{destination:{lat:26.85,lon:80.946},expected_arrival_at:new Date(Date.now()+60000).toISOString(),auto_escalate:true,share_with_contacts:false,contact_ids:[]}});
 assert.equal(j.status,201);
 const key=j.body.journey_id;
 await pool.query("UPDATE journeys SET expected_arrival_at=now()-interval '3 minutes',checkin_due_at=now()-interval '3 minutes',escalate_at=now()-interval '1 minute' WHERE id=$1",[key]);
 await pool.query("UPDATE scheduled_jobs SET due_at=now()-interval '1 second' WHERE aggregate_id=$1",[key]);
 await Promise.all([worker.jobs(),new Worker().jobs()]);
 await worker.jobs();
 const out=await call('/journeys/'+key,{uid:'second-demo'});
 assert.equal(out.body.status,'ESCALATED');assert.ok(out.body.sos_event_id);
 const arrived=await call('/journeys/'+key+'/arrive',{uid:'second-demo',method:'POST',body:{}});
 assert.equal(arrived.body.sos_event_id,out.body.sos_event_id);
 assert.equal((await call('/sos/'+out.body.sos_event_id,{uid:'second-demo'})).body.status,'CREATED');
});
test('pending reports have no public effect and three independent approved reporters yield only coarse cells',async()=>{
 const reports:string[]=[];
 for(let n=0;n<3;n++){
  const uid='reporter-'+n;identities.set(uid,'+1650555090'+n);
  const result=await call('/incident-reports',{uid,method:'POST',body:{category:'LIGHTING',location:{lat:26.85,lon:80.946,accuracy_m:null,captured_at:new Date().toISOString(),source:'manual'},happened_at:new Date().toISOString(),description:'Synthetic lighting observation'}});
  assert.equal(result.status,201);reports.push(result.body.id);
 }
 assert.equal((await call('/incident-reports/aggregate')).body.cells.length,0);
 for(const key of reports){const r=await call('/admin/reports/'+key+'/moderate',{uid:'moderator-demo',method:'POST',body:{action:'APPROVE',reason:'Synthetic moderation test',expected_revision:1}});assert.equal(r.status,200);}
 const aggregate=await call('/incident-reports/aggregate');
 assert.equal(aggregate.body.cells.length,1);assert.equal(aggregate.body.cells[0].count_bucket,'3-5');
 assert.equal('reporter_user_id'in aggregate.body.cells[0],false);assert.equal('location'in aggregate.body.cells[0],false);
 assert.equal((await call('/admin/review-queue?kind=REPORT')).status,403);
});
test('privacy retention erases completed journey coordinates without breaking history contracts',async()=>{
 const result=await call('/journeys',{uid:'second-demo'});
 const journey=result.body.items.find((j:any)=>j.status==='ESCALATED');
 assert.ok(journey);
 await pool.query("UPDATE journeys SET completed_at=now()-interval '25 hours' WHERE id=$1",[journey.journey_id]);
 await worker.retention();
 const history=await call('/journeys/'+journey.journey_id,{uid:'second-demo'});
 assert.equal(history.status,200);
 assert.equal(history.body.origin,null);
 assert.equal(history.body.destination,null);
 assert.equal(history.body.sos_event_id,journey.sos_event_id);
});
test('shop status requires verification; confirmation cannot override an explicit closure',async()=>{
 const shop=fixtureId('shop-0');
 const close=await call('/safe-shops/'+shop+'/availability',{uid:'shop-demo',method:'PATCH',body:{action:'CLOSE',expected_revision:1}});
 assert.equal(close.status,200);assert.equal(close.body.open_status,'CLOSED');
 const confirm=await call('/safe-shops/'+shop+'/availability',{uid:'shop-demo',method:'PATCH',body:{action:'CONFIRM_OPEN',expected_revision:close.body.revision}});
 assert.equal(confirm.status,409);
 const shops=await call('/safe-shops?lat=26.85&lon=80.946&radius_m=1000');
 assert.ok(shops.body.items.every((s:any)=>s.status==='ACTIVE'&&!('owner_user_id'in s)));
});
test('context is independent, timestamp ordered and shop/unevaluated detector sending fails closed',async()=>{
 identities.set('advanced-demo','+16505550176');
 const key=randomUUID(),created=await call('/sos',{uid:'advanced-demo',method:'POST',key,body:{...sosBody(key),trigger_type:'DURESS_PIN'}});assert.equal(created.status,201);
 const path='/sos/'+created.body.event_id+'/context',now=new Date().toISOString();
 const patched=await call(path,{uid:'advanced-demo',method:'PATCH',body:{battery_pct:40,observed_at:now}});assert.equal(patched.status,200);assert.equal(patched.body.context.battery_pct,40);
 const old=await call(path,{uid:'advanced-demo',method:'PATCH',body:{battery_pct:10,observed_at:new Date(Date.now()-60000).toISOString()}});assert.equal(old.body.context.battery_pct,40);
 assert.equal((await call(path,{uid:'second-demo',method:'PATCH',body:{battery_pct:50,observed_at:now}})).status,404);
 assert.equal((await call('/sos/'+created.body.event_id+'/shop-alerts',{uid:'advanced-demo',method:'POST',body:{shop_id:fixtureId('shop-0'),sharing_consent_version:'consent-v1'}})).status,503);
 const ml=randomUUID();assert.equal((await call('/sos',{uid:'advanced-demo',method:'POST',key:ml,body:{...sosBody(ml),trigger_type:'ML_FUSION'}})).status,503);
 await call('/sos/'+created.body.event_id+'/resolve',{uid:'advanced-demo',method:'POST',body:{resolution:'SAFE'}});
 assert.equal((await call(path,{uid:'advanced-demo',method:'PATCH',body:{battery_pct:1,observed_at:now}})).status,409);
});
function wav(){const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(32036,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(16000,24);h.writeUInt32LE(32000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(32000,40);return Buffer.concat([h,Buffer.alloc(32000)]);}
test('evidence stays private through quarantine, selected-recipient reads and terminal revocation',async()=>{
 const key=randomUUID(),created=await call('/sos',{method:'POST',key,body:sosBody(key)});assert.equal(created.status,201);
 const event=created.body.event_id,detail=await call('/sos/'+event),recipient=detail.body.recipients[0].id;
 const bytes=wav(),sha=createHash('sha256').update(bytes).digest('hex');
 const input={kind:'AUDIO',mime:'audio/wav',size_bytes:bytes.length,sha256:sha,duration_s:1,captured_at:new Date().toISOString(),consent_version:'consent-v1',recipient_ids:[recipient]};
 const start='/sos/'+event+'/evidence/presign';assert.equal((await call(start,{method:'POST',body:input})).status,403);
 await call('/me/consents',{method:'PATCH',body:{version:'consent-v1',evidence:true}});
 assert.equal((await call(start,{method:'POST',body:{...input,recipient_ids:[]}})).status,400);
 const upload=await call(start,{method:'POST',body:input});assert.equal(upload.status,201);
 const asset=upload.body.asset_id,content='/evidence/'+asset+'/content';
 assert.equal((await call('/evidence/'+asset,{uid:'second-demo'})).status,404);
 const bad=await fetch(base+upload.body.upload_url,{method:'PUT',headers:{Authorization:'Bearer owner-demo','Content-Type':'audio/wav','x-amz-checksum-sha256':'0'.repeat(64)},body:bytes});assert.equal(bad.status,400);
 const put=await fetch(base+upload.body.upload_url,{method:'PUT',headers:{Authorization:'Bearer owner-demo',...upload.body.required_headers},body:bytes});assert.equal(put.status,200);
 assert.equal((await call(content)).status,409);
 const complete=await call('/sos/'+event+'/evidence/'+asset+'/complete',{method:'POST',body:{}});assert.equal(complete.status,202);assert.equal(complete.body.status,'UPLOADING');
 await worker.advanced();assert.equal((await call('/evidence/'+asset)).body.status,'AVAILABLE');
 const download=await fetch(base+'/v1'+content,{headers:{Authorization:'Bearer owner-demo'}});assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),bytes);assert.equal(download.headers.get('cache-control'),'no-store');
 assert.equal((await fetch(base+'/v1'+content)).status,401);
 await worker.delivery();const msg=(await pool.query('SELECT m.material_ciphertext FROM fake_messages m JOIN notification_outbox o ON o.id=m.outbox_id JOIN delivery_intents d ON d.id=o.intent_id WHERE d.event_id=$1 AND d.recipient_id=$2',[event,recipient])).rows[0];
 const raw=decrypt<any>(msg.material_ciphertext).url.split('#token=')[1];const ex=await call('/tracking/exchange',{method:'POST',body:{token:raw,exchange_id:randomUUID()}});const headers={'X-Tracking-Grant-ID':ex.body.grant_id,Cookie:ex.headers.get('set-cookie')!.split(';')[0]};
 const allowed=await fetch(base+'/v1'+content,{headers});assert.equal(allowed.status,200);await allowed.arrayBuffer();
 const view=await call('/tracking/event',{headers});assert.equal(view.body.evidence.length,1);
 await call('/me/consents',{method:'PATCH',body:{version:'consent-v1',evidence:false}});
 assert.equal((await fetch(base+'/v1'+content,{headers})).status,410);
 await worker.advanced();const stored=(await pool.query('SELECT * FROM evidence_assets WHERE id=$1',[asset])).rows[0];assert.equal(stored.sanitized_ciphertext,null);assert.equal(stored.material_ciphertext,null);
 await call('/sos/'+event+'/resolve',{method:'POST',body:{resolution:'SAFE'}});
});
test('recent-auth export excludes contact GPS; deletion revokes, purges and survives restore reconciliation',async()=>{
 identities.set('privacy-demo','+16505550177');const uid='privacy-demo';
 assert.equal((await call('/me/export',{uid:uid+':stale',method:'POST',body:{}})).status,401);
 const key=randomUUID(),sos=await call('/sos',{uid,method:'POST',key,body:{...sosBody(key),location:{lat:26.85,lon:80.946,accuracy_m:20,captured_at:new Date().toISOString(),source:'gps'},location_status:'CURRENT'}});assert.equal(sos.status,201);
 const owner=(await pool.query('SELECT * FROM app_users WHERE auth_uid=$1',[uid])).rows[0];
 const job=await call('/me/export',{uid,method:'POST',body:{}});assert.equal(job.status,202);
 assert.equal((await call('/me/export/'+job.body.job_id,{uid:'owner-demo'})).status,404);
 await worker.advanced();assert.equal((await call('/me/export/'+job.body.job_id,{uid})).body.status,'COMPLETED');
 const exported=await call('/me/export/'+job.body.job_id+'/content',{uid});assert.equal(exported.status,200);assert.ok(!JSON.stringify(exported.body).includes('contact_location'));assert.ok(!JSON.stringify(exported.body).includes('auth_uid'));
 assert.equal((await call('/me',{uid,method:'DELETE',body:{confirm_end_active_sharing:false}})).status,409);
 const deletion=await call('/me',{uid,method:'DELETE',body:{confirm_end_active_sharing:true}});assert.equal(deletion.status,202);
 assert.equal((await call('/me',{uid})).status,401);
 await worker.advanced();const result=await call('/me/deletion/'+deletion.body.deletion_job_id,{uid});assert.equal(result.body.status,'COMPLETED',JSON.stringify(result.body));
 const remains=(await pool.query('SELECT * FROM app_users WHERE id=$1',[owner.id])).rows[0];assert.equal(remains.phone_e164,'+10000000000');assert.equal((await pool.query('SELECT * FROM sos_events WHERE user_id=$1',[owner.id])).rowCount,0);
 assert.equal((await pool.query("SELECT artifact_ciphertext FROM privacy_jobs WHERE id=$1",[job.body.job_id])).rows[0].artifact_ciphertext,null);
 // Simulate restoring the old profile beside the newer externally preserved erasure ledger.
 await pool.query('UPDATE app_users SET auth_uid=$2,phone_e164=$3,deleted_at=NULL,disabled=false WHERE id=$1',[owner.id,owner.auth_uid,owner.phone_e164]);
 await pool.query('DELETE FROM deletion_ledger WHERE auth_uid_hash=$1',[hash(owner.auth_uid)]);
 await recoverErasureLedger();
 assert.equal((await call('/me',{uid})).status,401);assert.equal((await pool.query('SELECT phone_e164 FROM app_users WHERE id=$1',[owner.id])).rows[0].phone_e164,'+10000000000');
});
test('expired leases recover with two workers without duplicating logical deliveries',async()=>{
 await worker.delivery();const key=randomUUID(),created=await call('/sos',{method:'POST',key,body:sosBody(key)});assert.equal(created.status,201);const event=created.body.event_id;
 await pool.query("UPDATE notification_outbox SET status='LEASED',lease_owner=$2,lease_expires_at=now()-interval '1 second' WHERE intent_id IN (SELECT id FROM delivery_intents WHERE event_id=$1)",[event,randomUUID()]);
 await Promise.all([new Worker().delivery(),new Worker().delivery()]);
 const counts=(await pool.query('SELECT (SELECT count(*)::int FROM delivery_intents WHERE event_id=$1) AS logical,(SELECT count(*)::int FROM fake_messages m JOIN notification_outbox o ON o.id=m.outbox_id JOIN delivery_intents d ON d.id=o.intent_id WHERE d.event_id=$1) AS messages,(SELECT count(*)::int FROM delivery_attempts a JOIN delivery_intents d ON d.id=a.intent_id WHERE d.event_id=$1) AS attempts',[event])).rows[0];
 assert.equal(counts.logical,5);assert.equal(counts.messages,5);assert.equal(counts.attempts,5);
 await call('/sos/'+event+'/resolve',{method:'POST',body:{resolution:'SAFE'}});
});
test('unknown provider outcome remains unknown and termination prevents its queued retry',async()=>{
 await worker.delivery();const key=randomUUID(),created=await call('/sos',{method:'POST',key,body:sosBody(key)});assert.equal(created.status,201);const event=created.body.event_id;let calls=0;
 const fault=new Worker({name:'fault-test',capabilities:{idempotency:false,receipts:false,reconciliation:false},async send(){calls++;return {outcome:'UNKNOWN'};}});
 await fault.delivery();assert.equal(calls,5);const detail=await call('/sos/'+event);assert.ok(detail.body.recipients.every((r:any)=>r.channels[0].status==='UNKNOWN'));
 await call('/sos/'+event+'/resolve',{method:'POST',body:{resolution:'SAFE'}});await pool.query("UPDATE notification_outbox SET next_attempt_at=now()-interval '1 second' WHERE intent_id IN (SELECT id FROM delivery_intents WHERE event_id=$1)",[event]);await fault.delivery();assert.equal(calls,5);
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM notification_outbox o JOIN delivery_intents d ON d.id=o.intent_id WHERE d.event_id=$1 AND o.status IN ('PENDING','RETRY','LEASED')",[event])).rows[0].n,0);
});
test('concurrent publishers retain tombstones and recover newer disk erasures after DB rollback',async()=>{
 const hashes=Array.from({length:8},()=>hash(randomUUID()));
 await Promise.all(hashes.map(async value=>{await pool.query('INSERT INTO deletion_ledger(auth_uid_hash) VALUES($1)',[value]);await persistErasureLedger();}));
 const disk=decrypt<any>(await readFile(ledgerPath,'utf8'));assert.ok(hashes.every(value=>disk.rows.some((r:any)=>r.auth_uid_hash===value)));
 await pool.query('DELETE FROM deletion_ledger WHERE auth_uid_hash=ANY($1::text[])',[hashes]);await Promise.all([persistErasureLedger(),recoverErasureLedger()]);
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM deletion_ledger WHERE auth_uid_hash=ANY($1::text[])',[hashes])).rows[0].n,hashes.length);
});
test('unreadable erasure ledger fails closed and is never overwritten',async()=>{
 const original=await readFile(ledgerPath,'utf8');await writeFile(ledgerPath,'corrupt-test-only');
 try{await assert.rejects(recoverErasureLedger(),/cannot be decrypted/);await assert.rejects(persistErasureLedger(),/cannot be decrypted/);assert.equal(await readFile(ledgerPath,'utf8'),'corrupt-test-only');}finally{await writeFile(ledgerPath,original);}
});
