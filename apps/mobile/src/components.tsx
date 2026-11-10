import React from 'react';
import {Pressable,Text,View,TextInput,StyleSheet,type TextInputProps} from 'react-native';
export const colors={ink:'#233d35',muted:'#63756b',green:'#27695c',paper:'#f6f5ef',line:'#dce4da',rose:'#a94f5a'};
export function Button({title,onPress,secondary=false,disabled=false}:{title:string,onPress:()=>void,secondary?:boolean,disabled?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={[s.button,secondary&&s.secondary,disabled&&{opacity:.45}]}><Text style={[s.buttonText,secondary&&{color:colors.green}]}>{title}</Text></Pressable>;
}
export function Card({title,children}:{title?:string,children:React.ReactNode}){return <View style={s.card}>{title&&<Text accessibilityRole="header" style={s.h2}>{title}</Text>}{children}</View>;}
export function Field({label,...props}:TextInputProps&{label:string}){return <View style={{marginBottom:12}}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#829186" style={s.input} {...props}/></View>;}
export const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:colors.paper},content:{padding:20,paddingBottom:100},header:{paddingHorizontal:20,paddingVertical:14,borderBottomWidth:1,borderColor:colors.line,backgroundColor:'white',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 brand:{fontSize:24,fontWeight:'700',color:colors.green},demo:{padding:8,textAlign:'center',fontSize:10,color:'#665a44',backgroundColor:'#ece8dc'},
 title:{fontSize:32,color:colors.ink,fontFamily:'serif',marginBottom:14},h2:{fontSize:23,fontFamily:'serif',color:colors.ink,marginBottom:12},body:{fontSize:14,color:colors.muted,lineHeight:22,marginBottom:10},small:{fontSize:11,color:colors.muted,lineHeight:17,marginVertical:5},
 card:{padding:20,backgroundColor:'white',borderWidth:1,borderColor:colors.line,borderRadius:14,marginBottom:16},label:{fontSize:12,fontWeight:'600',color:colors.ink,marginBottom:6},input:{borderWidth:1,borderColor:'#cbd7cd',borderRadius:8,padding:12,color:colors.ink,fontSize:15,minHeight:48,backgroundColor:'white'},
 button:{backgroundColor:colors.green,borderRadius:9,padding:14,minHeight:48,alignItems:'center',justifyContent:'center',marginVertical:5},buttonText:{fontSize:14,fontWeight:'600',color:'white',textAlign:'center'},secondary:{backgroundColor:'#e7eee4',borderWidth:1,borderColor:'#d7e2d2'},
 error:{padding:14,backgroundColor:'#f8e5e8',color:'#8f3440',borderRadius:8,marginBottom:14},notice:{padding:14,backgroundColor:'#e3efdf',color:'#326746',borderRadius:8,marginBottom:14},row:{paddingVertical:12,borderBottomWidth:1,borderColor:colors.line},pill:{fontSize:10,fontWeight:'700',color:colors.green,backgroundColor:'#e9f0e5',padding:6,alignSelf:'flex-start',borderRadius:5,marginVertical:5},
 sos:{height:150,width:150,borderRadius:75,backgroundColor:colors.rose,alignItems:'center',justifyContent:'center',alignSelf:'center',marginVertical:20,borderWidth:8,borderColor:'#e9cdd0'},sosText:{color:'white',fontSize:42,fontWeight:'700'},split:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:14}
});
