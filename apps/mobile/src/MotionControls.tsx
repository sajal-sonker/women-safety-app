import React,{useState} from 'react';
import {Switch,Text,View} from 'react-native';
import NativeSafety from '../specs/NativeSafety';
import {Button,Card,Disclosure,s} from './components';
import type {MonitoringState} from './monitoring';
export function MotionControls({monitoring,busy,run}:{monitoring?:MonitoringState;busy:boolean;run:(action:()=>Promise<void>)=>Promise<void>}){
 const [consent,setConsent]=useState(false),[sensitive,setSensitive]=useState(false);
 const active=['MOTION_PREPARING','MOTION_ONLY_FOREGROUND'].includes(monitoring?.status??'');
 const voiceActive=['STARTING','ACTIVE_CONFIRMATION_ONLY'].includes(monitoring?.status??'');
 return <Card title="Motion check-in"><Text style={s.body}>Three short back-and-forth shakes bring up a check-in. Keep the app open.</Text>
  <Text style={s.pill}>{monitoring?.status==='MOTION_PREPARING'?'Getting ready…':active?'Ready for shakes':'Off'}</Text>
  <Text style={s.small}>No microphone. Shaking does not send SOS automatically.</Text>
  {monitoring?.reason==='MOTION_SENSOR_NOT_RESPONDING'&&<Text accessibilityRole="alert" style={s.notice}>Motion data isn’t arriving. Try starting again, or use Voice or the SOS button.</Text>}
  {voiceActive&&<Text style={s.notice}>Voice is listening. Stop it in the Voice tab before starting motion-only check-ins.</Text>}
  {!active&&<><View style={s.split}><Text style={s.option}>Allow motion checks while this app is open</Text><Switch accessibilityLabel="Consent to motion check-in" value={consent} onValueChange={setConsent}/></View>
   <Disclosure title="Adjust shake sensitivity"><View style={s.split}><Text style={s.option}>More responsive to lighter shakes</Text><Switch accessibilityLabel="More responsive shake detection" value={sensitive} onValueChange={setSensitive}/></View></Disclosure>
   <Button title="Start motion check-in" disabled={busy||!consent||voiceActive} onPress={()=>run(async()=>{await NativeSafety.startMonitoring(JSON.stringify({consent_version:'consent-v1',motion_consent:true,mode:'MOTION_ONLY_CONFIRMATION',duration_minutes:30,motion_sensitivity:sensitive?'SENSITIVE':'STANDARD'}));})}/>
  </>}
  {active&&<><Text style={s.small}>Hold your phone securely. Shake it left–right–left within about 2 seconds; don’t drop or hit it.</Text><Button title="Stop motion check-in" secondary onPress={()=>run(async()=>{await NativeSafety.stopMonitoring();setConsent(false);})}/></>}
 </Card>;
}
