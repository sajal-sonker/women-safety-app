import * as SunCalc from 'suncalc';
export const weights=[0.25,0.20,0.20,0.15,0.10,0.10] as const;
export type Factor={value:number|null,quality:number,reason:string};
export type Segment={id:string,coordinates:number[][],duration_s:number,distance_m:number,lit:'yes'|'no'|null,quality:number,source_refs:string[]};
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function scoreSegments(segments:Segment[],departAt:Date,context?:(s:Segment,time:Date)=>Factor[]){
 let elapsed=0;
 const scored=segments.map(s=>{
  const t=new Date(departAt.getTime()+elapsed*1000),[lon,lat]=s.coordinates[0];
  const daylight=SunCalc.getPosition(t,lat,lon).altitude>0;
  const lighting:Factor={value:daylight?0.1:s.lit==='yes'?0.2:s.lit==='no'?0.9:null,quality:daylight?0.7:s.lit?s.quality:0,reason:daylight?'DAYLIGHT_PROXY':s.lit?'LIGHTING_TAG':'LIGHTING_UNKNOWN'};
  const factors=context?.(s,t)??[{value:null,quality:0,reason:'ACTIVITY_UNKNOWN'},{value:null,quality:0,reason:'REPORTS_INSUFFICIENT'},{value:null,quality:0,reason:'SHOPS_UNKNOWN'},{value:null,quality:0,reason:'HELP_UNKNOWN'},{value:0.1,quality:s.quality,reason:'WALKING_NETWORK'}];
  const all=[lighting,...factors];
  const risk=all.reduce((n,f,i)=>n+weights[i]*(f.value??0.5),0);
  const coverage=all.reduce((n,f,i)=>n+weights[i]*(f.value===null?0:clamp(f.quality)),0);
  elapsed+=s.duration_s;
  return {...s,arrival_at:t.toISOString(),risk,coverage,factors:all};
 });
 const duration=scored.reduce((n,s)=>n+s.duration_s,0);
 const mean=scored.reduce((n,s)=>n+s.risk*s.duration_s,0)/duration;
 const sorted=[...scored].sort((a,b)=>a.risk-b.risk);
 let cumulative=0,p95=sorted.at(-1)?.risk??0.5;
 for(const s of sorted){cumulative+=s.duration_s;if(cumulative>=duration*.95){p95=s.risk;break;}}
 const confidence=scored.reduce((n,s)=>n+s.coverage*s.duration_s,0)/duration;
 const risk=0.8*mean+0.2*p95;
 return {risk,confidence,indicator:confidence<0.5?null:Math.round(100*(1-risk)),segments:scored};
}
export function distance(a:number[],b:number[]){
 const r=Math.PI/180,lat=(b[1]-a[1])*r,lon=(b[0]-a[0])*r;
 return 6371000*2*Math.atan2(Math.sqrt(Math.sin(lat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(lon/2)**2),Math.sqrt(1-(Math.sin(lat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(lon/2)**2)));
}
export function worstWindow(segments:Array<Segment&{risk:number,coverage:number}>){
 const pieces=segments.flatMap(s=>s.coordinates.slice(1).map((b,i)=>{const a=s.coordinates[i],length=distance(a,b);return {a,b,length,duration:s.duration_s*length/s.distance_m,risk:s.risk,coverage:s.coverage};})).filter(p=>p.length>0);
 const total=pieces.reduce((n,p)=>n+p.length,0),length=Math.min(100,total);
 if(!length)return null;
 const boundaries=[0];for(const p of pieces)boundaries.push(boundaries.at(-1)!+p.length);
 const starts=[...new Set(boundaries.flatMap(v=>[v,v-length]).map(v=>Math.max(0,Math.min(total-length,v))))].sort((a,b)=>a-b);
 let best:{coordinates:number[][],risk:number,coverage:number}|null=null;
 for(const start of starts){
  const coordinates:number[][]=[];let at=0,duration=0,weighted=0,covered=0;
  for(const p of pieces){
   const from=Math.max(start,at),to=Math.min(start+length,at+p.length);
   if(to>from){
    const interpolate=(f:number)=>[p.a[0]+(p.b[0]-p.a[0])*f,p.a[1]+(p.b[1]-p.a[1])*f];
    if(!coordinates.length)coordinates.push(interpolate((from-at)/p.length));
    coordinates.push(interpolate((to-at)/p.length));
    const seconds=p.duration*(to-from)/p.length;duration+=seconds;weighted+=seconds*p.risk;covered+=seconds*p.coverage;
   }at+=p.length;
  }
  const risk=weighted/duration;
  if(!best||risk>best.risk+1e-10)best={coordinates,risk,coverage:covered/duration};
 }
 return best;
}
