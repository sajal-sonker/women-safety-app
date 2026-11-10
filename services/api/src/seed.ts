import {createHash} from 'node:crypto';
import {getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {pool,transaction} from './platform/db/index.ts';
import {config} from './platform/config.ts';
import {DATA_VERSION} from './modules/routing/index.ts';
import {distance} from './modules/routing/scoring.ts';
export function fixtureId(value:string){
 const h=createHash('sha256').update('suraksha-demo:'+value).digest('hex');
 return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);
}
export const demoUsers=[
 {uid:'owner-demo',phone:'+16505550101',name:'Demo user'},
 {uid:'second-demo',phone:'+16505550102',name:'Second demo user'},
 ...Array.from({length:5},(_,i)=>({uid:'contact-'+(i+1),phone:'+1650555050'+(i+1),name:'Demo trusted contact '+(i+1)})),
 {uid:'moderator-demo',phone:'+16505550199',name:'Demo moderator'},
 {uid:'shop-demo',phone:'+16505550188',name:'Demo shop owner'}
];
export async function seed(withAuth=false){
 if(config.env!=='local'||!['localhost','127.0.0.1'].includes(new URL(config.databaseUrl).hostname))throw Error('Demo seed is restricted to a local database');
 if(withAuth){
  if(!process.env.FIREBASE_AUTH_EMULATOR_HOST||!config.projectId.startsWith('demo-'))throw Error('Auth seed requires a demo project/emulator');
  if(!getApps().length)initializeApp({projectId:config.projectId});
  for(const u of demoUsers){try{await getAuth().createUser({uid:u.uid,phoneNumber:u.phone,displayName:u.name});}catch(error){if((error as {code:string}).code!=='auth/uid-already-exists')throw error;}}
 }
 await transaction(async db=>{
  for(const u of demoUsers)await db.query('INSERT INTO app_users(id,auth_uid,phone_e164,display_name) VALUES($1,$2,$3,$4) ON CONFLICT(auth_uid) DO NOTHING',[fixtureId(u.uid),u.uid,u.phone,u.name]);
  await db.query("INSERT INTO role_assignments(user_id,role,assigned_by) VALUES($1,'MODERATOR','local-demo-seed') ON CONFLICT DO NOTHING",[fixtureId('moderator-demo')]);
  for(let i=1;i<=5;i++)await db.query("INSERT INTO emergency_contacts(id,owner_user_id,principal_id,name,phone_e164,priority,invite_status,consent_version,consent_at) VALUES($1,$2,$3,$4,$5,$6,'VERIFIED','consent-v1',now()) ON CONFLICT(id) DO NOTHING",[fixtureId('trusted-'+i),fixtureId('owner-demo'),fixtureId('contact-'+i),'Demo trusted contact '+i,'+1650555050'+i,i]);
  const polygon={type:'Polygon',coordinates:[[[80.94,26.844],[80.954,26.844],[80.954,26.856],[80.94,26.856],[80.94,26.844]]]};
  await db.query('INSERT INTO data_imports(id,source_url,license,acquired_at,boundary,checksum,version,coverage) VALUES($1,$2,$3,now(),ST_SetSRID(ST_GeomFromGeoJSON($4),4326),$5,$6,$7) ON CONFLICT(version) DO NOTHING',[fixtureId('import'),'urn:surakshaai:synthetic:Lucknow','CC0 synthetic fixture (not OSM)',JSON.stringify(polygon),createHash('sha256').update(DATA_VERSION).digest('hex'),DATA_VERSION,{synthetic:true,scope:'Fictional grid near Lucknow, not surveyed streets'}]);
  for(let x=0;x<7;x++)for(let y=0;y<5;y++)for(const [dx,dy] of [[1,0],[0,1]]){
   if(x+dx>=7||y+dy>=5)continue;
   const a=[80.943+x*.001,26.848+y*.001],b=[80.943+(x+dx)*.001,26.848+(y+dy)*.001];
   const key='edge:'+x+':'+y+':'+dx+':'+dy,geometry={type:'LineString',coordinates:[a,b]};
   await db.query('INSERT INTO road_segments(id,source_osm_ref,geom,length_m,walk_access,lit_tag,data_version) VALUES($1,NULL,ST_SetSRID(ST_GeomFromGeoJSON($2),4326),$3,true,$4,$5) ON CONFLICT(id) DO NOTHING',[fixtureId(key),JSON.stringify(geometry),distance(a,b),y===0?'no':'yes',DATA_VERSION]);
  }
  const hours={timezone:'Asia/Kolkata',weekly:Array.from({length:7},(_,i)=>({day:i+1,intervals:[{start:'07:00',end:'22:00'}]})),exceptions:[]};
  for(const [i,status] of ['ACTIVE','ACTIVE','PENDING','PAUSED','REVOKED'].entries()){
   const point={lat:26.849+(i%3)*.001,lon:80.945+(i%2)*.001};
   await db.query("INSERT INTO safe_shops(id,owner_user_id,name,location,position,public_phone,hours,status,verification_level,verified_at,listing_consent_version,opt_in_alerts) VALUES($1,$2,$3,$4,ST_SetSRID(ST_MakePoint($5,$6),4326)::geography,NULL,$7,$8,$9,$10,'consent-v1',false) ON CONFLICT(id) DO NOTHING",[fixtureId('shop-'+i),fixtureId('shop-demo'),'DEMO assistance point '+(i+1),point,point.lon,point.lat,hours,status,status==='ACTIVE'?'PILOT_CHECKED':'NONE',status==='ACTIVE'?new Date():null]);
  }
 });
 console.log('Seeded local synthetic Lucknow graph, fictional shops and test identities. No real messages sent.');
}
if(process.argv[1]?.endsWith('seed.ts')){try{await seed(true);}finally{await pool.end();}}
