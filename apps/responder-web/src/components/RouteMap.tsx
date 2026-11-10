'use client';
import type {Model} from '@surakshaai/contracts/client';
export function RouteMap({routes,selected}:{routes:Model<'RouteCandidate'>[],selected?:string}){
 const points=routes.flatMap(r=>r.geometry.coordinates);
 if(!points.length)return <div className="map-empty">Compare routes to see the demo network.</div>;
 const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
 const xy=(p:number[])=>[35+(p[0]-minX)/Math.max(maxX-minX,.001)*530,270-(p[1]-minY)/Math.max(maxY-minY,.001)*230];
 return <figure className="route-map"><svg viewBox="0 0 600 305" role="img" aria-label="Fictional walking route comparison near Lucknow">
 <defs><pattern id="grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M 35 0 L 0 0 0 35" fill="none" stroke="#342a45" strokeWidth="1"/></pattern></defs><rect width="600" height="305" fill="#191123"/><rect width="600" height="305" fill="url(#grid)"/>
 {routes.map((r,i)=><polyline key={r.id} points={r.geometry.coordinates.map(p=>xy(p).join(',')).join(' ')} fill="none" stroke={['#b794f6','#f08ca7','#f4cc87'][i]} opacity={!selected||r.id===selected?1:.35} strokeWidth={r.id===selected?7:4} strokeLinejoin="round" strokeLinecap="round"/>)}
 {['Start','Destination'].map((label,i)=>{const point=xy(i?routes[0].geometry.coordinates.at(-1)!:routes[0].geometry.coordinates[0]);return <g key={label}><circle cx={point[0]} cy={point[1]} r="8" fill="#fff" stroke="#e5d4ff" strokeWidth="3"/><text x={point[0]+12} y={point[1]-12} fontSize="13" fill="#e5d4ff">{label}</text></g>;})}
 </svg><figcaption>Fictional demo grid · geographically positioned near Lucknow · not for real travel</figcaption></figure>;
}
