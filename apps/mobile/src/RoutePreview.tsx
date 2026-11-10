import React from 'react';
import {View,Text} from 'react-native';
import {Map,Camera,GeoJSONSource,Layer} from '@maplibre/maplibre-react-native';
import type {Model} from './api';
import {s} from './components';
const style={version:8 as const,sources:{},layers:[{id:'background',type:'background' as const,paint:{'background-color':'#191123'}}]};
export function RoutePreview({routes,selected}:{routes:Model<'RouteCandidate'>[],selected:string}){
 if(!routes.length)return null;
 return <View style={{height:235,marginBottom:14,borderRadius:10,overflow:'hidden'}}><Map style={{flex:1}} mapStyle={style} attribution={false}>
 <Camera initialViewState={{center:[80.946,26.85],zoom:14.8}}/>
 {routes.map((route,i)=><GeoJSONSource key={route.id} id={'route-'+i} data={{type:'Feature',properties:{},geometry:route.geometry}}><Layer id={'line-'+i} type="line" paint={{'line-color':['#b794f6','#f08ca7','#f4cc87'][i],'line-width':route.id===selected?7:3,'line-opacity':!selected||selected===route.id?1:.4}}/></GeoJSONSource>)}
 </Map><Text style={[s.small,{backgroundColor:'#181220',padding:5,margin:0}]}>Fictional demo routes · no external map tiles</Text></View>;
}
