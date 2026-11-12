import React,{useEffect,useRef,useState} from 'react';
import {Text} from 'react-native';
import {Button,Card,Field,s} from './components';
export function ProfileSettings({name,phone,loaded,save}:{name:string;phone:string;loaded:boolean;save:(name:string)=>Promise<void>}){
 const [draft,setDraft]=useState(name),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const mounted=useRef(true);
 useEffect(()=>{setDraft(name);},[name]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 async function submit(){
  setBusy(true);setMessage('');
  try{await save(draft.trim());if(mounted.current)setMessage('Your name is saved.');}
  catch(e){if(mounted.current)setMessage(e instanceof Error?e.message:'Could not save your name. Please try again.');}
  finally{if(mounted.current)setBusy(false);}
 }
 return <Card title="Your profile"><Field label="Your name" value={draft} onChangeText={setDraft} maxLength={80} autoCapitalize="words" editable={loaded&&!busy} placeholder="What should we call you?"/><Text style={s.small}>{phone}</Text><Button title="Save name" disabled={!loaded||busy||!draft.trim()} onPress={()=>{void submit();}}/>{message?<Text accessibilityLiveRegion="polite" style={s.notice}>{message}</Text>:null}</Card>;
}
