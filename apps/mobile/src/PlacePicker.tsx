import React,{useEffect,useRef,useState} from 'react';
import {Linking,Text,View} from 'react-native';
import NativeSafety from '../specs/NativeSafety';
import {Button,Field,s} from './components';
export type Place={label:string;lat:number;lon:number;source:'DEMO'|'PHONE'};
export const demoPlaces:Place[]=[{label:'Community centre · demo',lat:26.848,lon:80.943,source:'DEMO'},{label:'Riverside café · demo',lat:26.852,lon:80.949,source:'DEMO'}];
export function PlacePicker({label,value,onChange}:{label:string;value:Place|null;onChange:(value:Place|null)=>void}){
 const [query,setQuery]=useState(value?.label??''),[items,setItems]=useState<Place[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0);
 useEffect(()=>{if(value)setQuery(value.label);setItems([]);generation.current++;setBusy(false);},[value?.label]);
 useEffect(()=>()=>{generation.current++;},[]);
 async function search(){
  const token=++generation.current;setBusy(true);setItems([]);setError('');
  try{const result=JSON.parse(await NativeSafety.searchPlaces(query.trim())) as {items:Place[]};if(token===generation.current){setItems(result.items);if(!result.items.length)setError('No places found. Try adding the city name.');}}
  catch(e){if(token===generation.current)setError(e instanceof Error?e.message:'Could not search places. Please try again.');}
  finally{if(token===generation.current)setBusy(false);}
 }
 return <View><Field label={label} value={query} placeholder="Place or landmark, city" onChangeText={text=>{generation.current++;setQuery(text);setItems([]);setError('');setBusy(false);if(value)onChange(null);}}/>
  {!value&&<Button title={busy?'Searching…':'Search '+label.toLowerCase()} secondary disabled={busy||query.trim().length<3} onPress={()=>{void search();}}/>}
  {error?<Text accessibilityLiveRegion="polite" style={s.small}>{error}</Text>:null}
  {error&&query.trim().length>=3&&<Button title="Search this place in Maps" secondary onPress={()=>{void Linking.openURL('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query.trim())).catch(()=>setError('Could not open Maps. Try again when connected.'));}}/>}
  {items.map((item,i)=><Button key={i} title={item.label} secondary onPress={()=>{generation.current++;setQuery(item.label);setItems([]);onChange(item);}}/>)}
 </View>;
}
