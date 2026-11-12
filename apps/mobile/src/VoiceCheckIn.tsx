import React from 'react';
import {Modal,StyleSheet,Text,View} from 'react-native';
import {Button,colors,s} from './components';
import type {MonitoringState} from './monitoring';
export function VoiceCheckIn({monitoring,onCancel,onSend}:{monitoring?:MonitoringState;onCancel:()=>void;onSend:()=>void}){
 const seconds=monitoring?.auto_sos_seconds??0;
 const visible=!!monitoring&&!['STOPPED','DEGRADED'].includes(monitoring.status)&&(!!monitoring.check_in||seconds>0);
 return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
  <View style={popup.shade}><View accessibilityViewIsModal style={popup.card}>
   <View style={popup.symbol}><Text style={popup.symbolText}>♡</Text></View>
   <Text accessibilityRole="header" style={popup.title}>{seconds>0?'Sending SOS in '+seconds+'s':'Do you need help?'}</Text>
   <Text accessibilityLiveRegion="polite" style={popup.body}>{seconds>0?'Repeated help words were heard. Your contacts will be alerted unless you cancel.':monitoring?.decision==='MOTION_CHECK_IN'?'We noticed repeated shaking. Are you okay? You can request SOS if you need help.':'We heard a help word or a sudden sound. You can alert your trusted people now.'}</Text>
   <Text style={s.small}>Demo · messages are simulated</Text>
   <Button title="Request SOS now" onPress={onSend}/>
   <Button title={seconds>0?'Cancel SOS — I’m okay':'I’m okay'} secondary onPress={onCancel}/>
  </View></View>
 </Modal>;
}
const popup=StyleSheet.create({shade:{flex:1,backgroundColor:'#06030cdd',justifyContent:'center',padding:24},card:{backgroundColor:'#23172e',borderRadius:28,padding:24,borderWidth:1,borderColor:'#70506e'},symbol:{width:60,height:60,borderRadius:30,backgroundColor:'#4b2843',alignItems:'center',justifyContent:'center',alignSelf:'center',marginBottom:20},symbolText:{color:colors.rose,fontSize:34},title:{color:colors.ink,fontSize:27,fontWeight:'700',textAlign:'center',marginBottom:14},body:{color:colors.muted,fontSize:16,lineHeight:24,textAlign:'center',marginBottom:10}});
