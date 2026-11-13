import React,{useState} from 'react';
import {Linking,ScrollView,Text,View} from 'react-native';
import {api,type Model} from './api';
import {Button,Card,Disclosure,Field,s} from './components';

export function AssistancePoints(){
 const [shops,setShops]=useState<Model<'Shop'>[]>([]),[reports,setReports]=useState<Model<'Report'>[]>([]);
 const [description,setDescription]=useState(''),[category,setCategory]=useState<'LIGHTING'|'HARASSMENT'|'ROAD_OBSTRUCTION'|'OTHER_CONDITION'>('LIGHTING');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function run(action:()=>Promise<void>){setBusy(true);setMessage('');setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Could not complete this action. Please retry.');}finally{setBusy(false);}}
 const search=(query:string)=>run(async()=>{await Linking.openURL('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query));});
 return <ScrollView contentContainerStyle={s.content}>
  <Text style={s.title}>Find nearby help</Text>
  <Text style={s.body}>Open Maps to look for real places near you. Check opening hours and call ahead when possible; this app has not verified their availability.</Text>
  {error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {message&&<Text accessibilityLiveRegion="polite" style={s.notice}>{message}</Text>}
  <Card title="Search around your location">
   <Button title="Police stations in Maps" disabled={busy} onPress={()=>search('police stations near me')}/>
   <Button title="Hospitals in Maps" secondary disabled={busy} onPress={()=>search('hospitals near me')}/>
   <Button title="Pharmacies in Maps" secondary disabled={busy} onPress={()=>search('pharmacies near me')}/>
   <Text style={s.small}>Maps opens only when you tap. Its location permissions and results are controlled by your map provider.</Text>
  </Card>
  <Card title="Need immediate help?"><Text style={s.body}>Use Home to alert your verified trusted contacts, or open the emergency dialer.</Text><Button title="Open 112 dialer" secondary onPress={()=>run(async()=>{await Linking.openURL('tel:112');})}/></Card>
  <Disclosure title="Explore the fictional Lucknow demo">
   <Text style={s.small}>These sample shops are invented. They are not real assistance locations and are not near your current position. A real participating-shop network has not been enrolled yet.</Text>
   <Button title="Load sample shops" secondary disabled={busy} onPress={()=>run(async()=>{setShops((await api<Model<'Shops'>>('/safe-shops?lat=26.85&lon=80.946&radius_m=1500')).items);})}/>
   {shops.map(shop=><Card key={shop.id} title={shop.name}><Text style={s.body}>Fictional listing · {shop.open_status==='CLOSED'?'sample hours say closed':shop.open_status==='UNKNOWN'?'sample availability unknown':'sample hours say open'}</Text><Text style={s.small}>{shop.distance_m===null?'':Math.round(shop.distance_m)+' m from the sample map centre'}</Text></Card>)}
   <Disclosure title="Try a sample road-condition report">
    <Text style={s.small}>This example uses the fictional Lucknow sample location. It does not report an incident at your current location. Reports remain private pending moderation.</Text>
    {(['LIGHTING','HARASSMENT','ROAD_OBSTRUCTION','OTHER_CONDITION']as const).map(value=><Button key={value} title={(value===category?'Selected: ':'')+value.toLowerCase().replaceAll('_',' ')} secondary onPress={()=>setCategory(value)}/>)}
    <Field label="Sample report description" value={description} onChangeText={setDescription} maxLength={1000} multiline/>
    <Button title="Submit sample for moderation" disabled={busy} onPress={()=>run(async()=>{
     await api('/incident-reports','POST',{category,location:{lat:26.85,lon:80.946,accuracy_m:null,captured_at:new Date().toISOString(),source:'manual'},happened_at:new Date().toISOString(),description});
     setDescription('');setReports((await api<Model<'Reports'>>('/incident-reports/mine')).items);setMessage('Sample report submitted for moderation.');
    })}/>
    <Button title="My submitted reports" secondary disabled={busy} onPress={()=>run(async()=>{setReports((await api<Model<'Reports'>>('/incident-reports/mine')).items);})}/>
    {reports.map(report=><View key={report.id} style={s.row}><Text style={s.body}>{report.category.toLowerCase().replaceAll('_',' ')} · {report.status.toLowerCase()}</Text>{report.status!=='WITHDRAWN'&&<Button title="Withdraw report" secondary disabled={busy} onPress={()=>run(async()=>{await api('/incident-reports/'+report.id+'/withdraw','POST',{});setReports((await api<Model<'Reports'>>('/incident-reports/mine')).items);})}/>}</View>)}
   </Disclosure>
  </Disclosure>
 </ScrollView>;
}
