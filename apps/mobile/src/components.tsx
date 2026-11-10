import React from 'react';
import {Pressable,Text,View,TextInput,StyleSheet,type TextInputProps} from 'react-native';
export const colors={ink:'#f3efff',muted:'#b7accb',green:'#b794f6',paper:'#0d0a14',line:'#342a45',rose:'#f08ca7'};
export function Button({title,onPress,secondary=false,disabled=false}:{title:string,onPress:()=>void,secondary?:boolean,disabled?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={[s.button,secondary&&s.secondary,disabled&&{opacity:.45}]}><Text style={[s.buttonText,secondary&&{color:colors.green}]}>{title}</Text></Pressable>;
}
export function Card({title,children}:{title?:string,children:React.ReactNode}){return <View style={s.card}>{title&&<Text accessibilityRole="header" style={s.h2}>{title}</Text>}{children}</View>;}
export function Field({label,...props}:TextInputProps&{label:string}){return <View style={{marginBottom:12}}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#a89aba" style={s.input} {...props}/></View>;}
export const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:colors.paper},content:{padding:20,paddingBottom:100},header:{paddingHorizontal:20,paddingVertical:14,borderBottomWidth:1,borderColor:colors.line,backgroundColor:'#181220',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 brand:{fontSize:24,fontWeight:'700',color:colors.green},demo:{padding:8,textAlign:'center',fontSize:10,color:'#d4bcff',backgroundColor:'#2a2037'},
 title:{fontSize:32,color:colors.ink,fontFamily:'serif',marginBottom:14},h2:{fontSize:23,fontFamily:'serif',color:colors.ink,marginBottom:12},body:{fontSize:14,color:colors.muted,lineHeight:22,marginBottom:10},small:{fontSize:11,color:colors.muted,lineHeight:17,marginVertical:5},
 card:{padding:20,backgroundColor:'#181220',borderWidth:1,borderColor:colors.line,borderRadius:14,marginBottom:16},label:{fontSize:12,fontWeight:'600',color:colors.ink,marginBottom:6},input:{borderWidth:1,borderColor:'#50405f',borderRadius:8,padding:12,color:colors.ink,fontSize:15,minHeight:48,backgroundColor:'#181220'},
 button:{backgroundColor:'#7950ba',borderRadius:9,padding:14,minHeight:48,alignItems:'center',justifyContent:'center',marginVertical:5},buttonText:{fontSize:14,fontWeight:'600',color:'white',textAlign:'center'},secondary:{backgroundColor:'#271c3b',borderWidth:1,borderColor:'#50405f'},
 error:{padding:14,backgroundColor:'#361d32',color:'#ffc0d1',borderRadius:8,marginBottom:14},notice:{padding:14,backgroundColor:'#271c3b',color:'#d4bcff',borderRadius:8,marginBottom:14},row:{paddingVertical:12,borderBottomWidth:1,borderColor:colors.line},pill:{fontSize:10,fontWeight:'700',color:colors.green,backgroundColor:'#271c3b',padding:6,alignSelf:'flex-start',borderRadius:5,marginVertical:5},
 sos:{height:150,width:150,borderRadius:75,backgroundColor:"#9e4068",alignItems:'center',justifyContent:'center',alignSelf:'center',marginVertical:20,borderWidth:8,borderColor:'#553044'},sosText:{color:'white',fontSize:42,fontWeight:'700'},split:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:14}
});
