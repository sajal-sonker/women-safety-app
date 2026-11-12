import React,{useEffect,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {colors} from './components';

export function FakeCallScreen({label,answeredAt,onAnswer,onEnd}:{label:string;answeredAt?:number;onAnswer:()=>void;onEnd:()=>void}){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{if(!answeredAt)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[answeredAt]);
 const seconds=Math.max(0,Math.floor((now-(answeredAt??now))/1000));
 const duration=Math.floor(seconds/60).toString().padStart(2,'0')+':'+(seconds%60).toString().padStart(2,'0');
 return <ScrollView style={{flex:1,backgroundColor:'#151020'}} contentContainerStyle={call.screen}>
  <Text style={call.eyebrow}>{answeredAt?'CALL IN PROGRESS':'INCOMING CALL'}</Text>
  <View style={call.avatar}><Text style={call.initial}>{label.trim().charAt(0).toUpperCase()||'♡'}</Text></View>
  <Text style={call.name}>{label}</Text>
  <Text accessibilityLiveRegion="polite" style={call.status}>{answeredAt?duration:'Mobile · ringing…'}</Text>
  <Text style={call.simulation}>In-app call simulation</Text>
  <View style={call.space}/>
  <View style={call.actions}>
   <View style={call.action}><Pressable accessibilityRole="button" accessibilityLabel={answeredAt?'End call':'Decline call'} onPress={onEnd} style={[call.circle,call.decline]}><PhoneGlyph end/></Pressable><Text style={call.caption}>{answeredAt?'End':'Decline'}</Text></View>
   {!answeredAt&&<View style={call.action}><Pressable accessibilityRole="button" accessibilityLabel="Answer call" onPress={onAnswer} style={[call.circle,call.answer]}><PhoneGlyph/></Pressable><Text style={call.caption}>Answer</Text></View>}
  </View>
 </ScrollView>;
}
function PhoneGlyph({end=false}:{end?:boolean}){return <View accessible={false} style={{width:34,height:34,transform:[{rotate:end?'135deg':'-25deg'}]}}><View style={{position:'absolute',left:7,top:5,width:22,height:24,borderLeftWidth:5,borderBottomWidth:5,borderColor:'white',borderBottomLeftRadius:19}}/><View style={{position:'absolute',left:4,top:1,width:9,height:13,borderRadius:3,backgroundColor:'white'}}/><View style={{position:'absolute',left:22,top:23,width:12,height:9,borderRadius:3,backgroundColor:'white'}}/></View>;}
const call=StyleSheet.create({screen:{flexGrow:1,backgroundColor:'#151020',padding:28,alignItems:'center',paddingTop:48,paddingBottom:52},eyebrow:{color:colors.muted,fontSize:12,letterSpacing:3,marginBottom:42},avatar:{width:118,height:118,borderRadius:59,backgroundColor:'#352344',borderWidth:1,borderColor:'#684562',alignItems:'center',justifyContent:'center'},initial:{color:'#edb8d0',fontSize:52,fontWeight:'500'},name:{color:colors.ink,fontSize:32,fontWeight:'600',textAlign:'center',marginTop:26},status:{color:colors.muted,fontSize:17,marginTop:12},simulation:{color:'#af96b8',fontSize:12,marginTop:14},space:{flex:1},actions:{flexDirection:'row',justifyContent:'space-evenly',width:'100%',gap:32},action:{alignItems:'center',gap:14},circle:{width:76,height:76,borderRadius:38,alignItems:'center',justifyContent:'center'},decline:{backgroundColor:'#bd486c'},answer:{backgroundColor:'#367e68'},phone:{fontSize:36,color:'white'},caption:{color:colors.ink,fontSize:15},footer:{fontSize:11,color:colors.muted,marginTop:44,marginBottom:8},inCall:{flexDirection:'row',gap:50,marginBottom:50},soft:{color:colors.muted,fontSize:26}});
