import type {DB,Row} from '../../platform/db/index.ts';
import {id,requireCondition,ApiError} from '../../platform/security.ts';
import {config} from '../../platform/config.ts';
import {after} from '../common.ts';
import {scoreSegments,distance,clamp,worstWindow,type Segment,type Factor} from './scoring.ts';
import {shopView} from '../shops/index.ts';
type Candidate={coordinates:number[][],segments:Segment[],eta:number,distance:number};
const nodeKey=(p:number[])=>p.map(v=>v.toFixed(6)).join(',');
export const DATA_VERSION='synthetic-lucknow-v1';
export const demoPoint={lat:26.8500,lon:80.9460};
function shortest(edges:Segment[],start:string,end:string,excluded?:string):Segment[]|null{
 const costs=new Map<string,number>([[start,0]]),previous=new Map<string,{from:string,edge:Segment}>(),done=new Set<string>();
 while(true){
  const current=[...costs].filter(([k])=>!done.has(k)).sort((a,b)=>a[1]-b[1])[0];
  if(!current)return null;
  const [key,cost]=current;if(key===end)break;done.add(key);
  for(const edge of edges){
   if(edge.id===excluded)continue;
   const a=nodeKey(edge.coordinates[0]),b=nodeKey(edge.coordinates.at(-1)!);
   if(a!==key&&b!==key)continue;
   const next=a===key?b:a,newCost=cost+edge.duration_s;
   if(newCost<(costs.get(next)??Infinity)){
    const oriented=a===key?edge:{...edge,coordinates:[...edge.coordinates].reverse()};
    costs.set(next,newCost);previous.set(next,{from:key,edge:oriented});
   }
  }
 }
 const path:Segment[]=[];let key=end;
 while(key!==start){const p=previous.get(key);if(!p)return null;path.unshift(p.edge);key=p.from;}
 return path.length?path:null;
}
async function synthetic(db:DB,body:Row):Promise<Candidate[]>{
 const rs=await db.query('SELECT id,ST_AsGeoJSON(geom)::json AS geometry,lit_tag,length_m FROM road_segments WHERE data_version=$1 AND walk_access',[DATA_VERSION]);
 requireCondition(rs.rowCount,503,'DEPENDENCY_UNAVAILABLE');
 const edges:Segment[]=rs.rows.map(r=>({id:r.id,coordinates:r.geometry.coordinates,duration_s:r.length_m/1.3,distance_m:r.length_m,lit:r.lit_tag,quality:0.9,source_refs:[DATA_VERSION]}));
 const points=[...new Map(edges.flatMap(e=>[e.coordinates[0],e.coordinates.at(-1)!]).map(p=>[nodeKey(p),p])).values()];
 const snap=(p:Row)=>{
  const sorted=points.map(v=>({v,d:distance(v,[p.lon,p.lat])})).sort((a,b)=>a.d-b.d);
  requireCondition(sorted[0].d<=100,422,'OUTSIDE_PILOT');return nodeKey(sorted[0].v);
 };
 const start=snap(body.origin),end=snap(body.destination),first=shortest(edges,start,end);
 requireCondition(first,422,'NO_WALKING_ROUTE');
 const all=[first,...first.map(e=>shortest(edges,start,end,e.id)).filter((p):p is Segment[]=>!!p)].sort((a,b)=>a.reduce((n,s)=>n+s.duration_s,0)-b.reduce((n,s)=>n+s.duration_s,0));
 const chosen:Segment[][]=[];
 for(const p of all){
  if(chosen.some(other=>p.reduce((n,s)=>n+(other.some(e=>e.id===s.id)?s.distance_m:0),0)/p.reduce((n,s)=>n+s.distance_m,0)>=0.8))continue;
  chosen.push(p);if(chosen.length===3)break;
 }
 return chosen.map(segments=>({segments,coordinates:segments.flatMap((s,i)=>i?s.coordinates.slice(1):s.coordinates),eta:segments.reduce((n,s)=>n+s.duration_s,0),distance:segments.reduce((n,s)=>n+s.distance_m,0)}));
}
async function graphhopper(body:Row):Promise<Candidate[]>{
 const u=new URL('/route',config.router);
 for(const p of [body.origin,body.destination])u.searchParams.append('point',p.lat+','+p.lon);
 for(const d of ['time','edge_id'])u.searchParams.append('details',d);
 u.searchParams.set('profile','foot');u.searchParams.set('algorithm','alternative_route');u.searchParams.set('points_encoded','false');
 const res=await fetch(u,{signal:AbortSignal.timeout(5000)});
 if(!res.ok)throw new ApiError(503,'DEPENDENCY_UNAVAILABLE');
 requireCondition(Number(res.headers.get('content-length')??0)<=2097152,503,'DEPENDENCY_UNAVAILABLE');
 const reader=res.body?.getReader();requireCondition(reader,503,'DEPENDENCY_UNAVAILABLE');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>2097152){await reader.cancel();throw new ApiError(503,'DEPENDENCY_UNAVAILABLE');}chunks.push(chunk.value);}
 const data=JSON.parse(Buffer.concat(chunks).toString()) as Row;
 return (data.paths??[]).slice(0,3).map((p:Row)=>{
  requireCondition(p.points?.type==='LineString'&&p.details?.time?.length,503,'DEPENDENCY_UNAVAILABLE');
  const segments=p.details.time.map(([a,b,ms]:number[],i:number)=>{
   const coordinates=p.points.coordinates.slice(a,b+1),length=coordinates.slice(1).reduce((n:number,v:number[],j:number)=>n+distance(coordinates[j],v),0);
   return {id:'gh-'+i,coordinates,distance_m:length,duration_s:ms/1000,lit:null,quality:0,source_refs:['graphhopper-unmapped']};
  });
  return {segments,coordinates:p.points.coordinates,eta:p.time/1000,distance:p.distance};
 });
}
export async function evaluateRoutes(db:DB,user:Row,body:Row){
 const depart=new Date(body.depart_at);
 requireCondition(depart.getTime()>=Date.now()-60000&&depart.getTime()<=Date.now()+7*86400000,400,'VALIDATION_ERROR');
 for(const p of [body.origin,body.destination])requireCondition(p.lat>=26.78&&p.lat<=26.94&&p.lon>=80.84&&p.lon<=81.04,422,'OUTSIDE_PILOT');
 const candidates=await(config.maps==='synthetic'?synthetic(db,body):graphhopper(body));
 requireCondition(candidates.length,422,'NO_WALKING_ROUTE');
 const shops=(await db.query("SELECT * FROM safe_shops WHERE status='ACTIVE'")).rows;
 const reports=(await db.query("SELECT cell_id,count(DISTINCT reporter_user_id)::int AS n,sum(exp(-ln(2)*extract(epoch FROM (now()-happened_at))/86400/30)) AS signal FROM incident_reports WHERE moderation_status='APPROVED' AND expires_at>now() GROUP BY cell_id HAVING count(DISTINCT reporter_user_id)>=3")).rows;
 const fastest=Math.min(...candidates.map(c=>c.eta));
 const evaluations=candidates.map(c=>{
  const result=scoreSegments(c.segments,depart,(s,t)=>{
   if(config.maps!=='synthetic')return Array.from({length:5},()=>({value:null,quality:0,reason:'UNMAPPED_DATA'}));
   const p=s.coordinates[Math.floor(s.coordinates.length/2)];
   // Synthetic fixture is a complete small walking grid: Manhattan distances follow its edges.
   const walking=(q:Row)=>distance([p[0],p[1]],[q.lon,p[1]])+distance([q.lon,p[1]],[q.lon,q.lat]);
   const open=shops.map(v=>({s:v,v:shopView(v,t)})).filter(x=>['SCHEDULED_OPEN','CONFIRMED_OPEN'].includes(x.v.open_status));
   const nearby=open.filter(x=>walking(x.s.location)<=200).length;
   const closest=open.map(x=>walking(x.s.location)).sort((a,b)=>a-b)[0]??Infinity;
   const cell=cellId({lon:p[0],lat:p[1]}),report=reports.find(r=>r.cell_id===cell);
   const factors:Factor[]=[
    {value:clamp(1-nearby/8),quality:0.5,reason:'SYNTHETIC_STAFFED_POI_PROXY'},
    {value:report?0.5+0.5*(1-Math.exp(-Number(report.signal)/3)):null,quality:report?0.5:0,reason:report?'MODERATED_REPORTS':'REPORTS_INSUFFICIENT'},
    {value:Math.min(closest/1000,1),quality:0.8,reason:'SYNTHETIC_ASSISTANCE_NETWORK'},
    {value:clamp(walking({lon:80.946,lat:26.850})/1500),quality:0.7,reason:'SYNTHETIC_HELP_POINT'},
    {value:0.1,quality:0.9,reason:'SYNTHETIC_WALKING_NETWORK'}
   ];return factors;
  });
  const geometry={type:'LineString' as const,coordinates:c.coordinates},reason_codes=[...new Set(result.segments.flatMap(s=>s.factors.map(f=>f.reason)))].slice(0,12);
  const worst=worstWindow(result.segments);
  return {id:id(),geometry,eta_seconds:c.eta,distance_m:c.distance,risk_indicator:result.indicator,confidence:result.confidence,detour_pct:Math.max(0,(c.eta/fastest-1)*100),reason_codes,explanations:[config.maps==='synthetic'?'Synthetic Lucknow demo network; these are fictional routes, not navigation guidance.':'Source factors unavailable; no condition ranking.','Higher indicator means more favorable estimated conditions, never a safety guarantee.'],segments_summary:result.segments.map(s=>({segment_ref:s.id,arrival_at:s.arrival_at,indicator:s.coverage<.5?null:100*(1-s.risk),coverage:s.coverage,source_refs:s.source_refs})),worst_stretch:config.maps==='synthetic'&&worst?{geometry:{type:'LineString',coordinates:worst.coordinates},reason_codes:[worst.coverage<.5?'INSUFFICIENT_COVERAGE':'ESTIMATED_WORST_STRETCH']}:null,source_refs:[config.maps==='synthetic'?DATA_VERSION:'graphhopper-unmapped'],_risk:result.risk};
 });
 const sorted=[...evaluations].sort((a,b)=>a.eta_seconds-b.eta_seconds||a.id.localeCompare(b.id));
 const covered=evaluations.filter(r=>r.risk_indicator!==null);
 const lower=[...covered].sort((a,b)=>b.risk_indicator!-a.risk_indicator!||a.eta_seconds-b.eta_seconds)[0];
 const balanced=covered.filter(r=>r.detour_pct<=30).sort((a,b)=>a.eta_seconds*(1+a._risk)-b.eta_seconds*(1+b._risk))[0]??sorted[0];
 const now=new Date().toISOString(),evaluationId=id();
 const output={schema_version:1,revision:1,updated_at:now,server_time:now,evaluation_id:evaluationId,score_version:'score_v1',data_version:config.maps==='synthetic'?DATA_VERSION:'graphhopper-unmapped',computed_at:now,routes:evaluations.map(({_risk,...r})=>r),roles:{fastest:sorted[0].id,balanced:balanced.id,lower_estimated_risk:lower?.id??null},coverage_warning:config.maps==='synthetic'?'DEMO: fictional network and observations placed near Lucknow. Do not use for real travel.':covered.length?'Condition estimates only; help is not guaranteed.':'Insufficient source coverage for condition comparison.',alternatives_reason:evaluations.length<3?'Fewer distinct paths are available in this network.':null};
 await db.query('INSERT INTO route_evaluations(id,user_id,origin,destination,depart_at,score_version,response,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[evaluationId,user.id,body.origin,body.destination,body.depart_at,'score_v1',output,after(86400000)]);
 for(const [rank,r] of output.routes.entries())await db.query('INSERT INTO route_candidates(id,evaluation_id,geom,eta_seconds,length_m,risk_indicator,confidence,rank) VALUES($1,$2,ST_SetSRID(ST_GeomFromGeoJSON($3),4326),$4,$5,$6,$7,$8)',[r.id,evaluationId,JSON.stringify(r.geometry),r.eta_seconds,r.distance_m,r.risk_indicator,r.confidence,rank]);
 return output;
}
// 250m cells in a fixed projected grid. No exact report coordinate in public output.
export function cellId(p:Row){return Math.floor(p.lon*111320*Math.cos(26.85*Math.PI/180)/250)+':'+Math.floor(p.lat*111320/250);}
export function cellGeometry(key:string){
 const [x,y]=key.split(':').map(Number),fx=250/(111320*Math.cos(26.85*Math.PI/180)),fy=250/111320;
 return {type:'Polygon',coordinates:[[[x*fx,y*fy],[(x+1)*fx,y*fy],[(x+1)*fx,(y+1)*fy],[x*fx,(y+1)*fy],[x*fx,y*fy]]]};
}
