import React,{useState} from 'react';
import {Text} from 'react-native';
import NativeSafety from '../specs/NativeSafety';
import {Button,Card,Field,s} from './components';
export function Reauthenticate({onVerified}:{onVerified:()=>void}){
 const [sent,setSent]=useState(false),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function run(action:()=>Promise<void>){setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Could not verify this account. Request another code.');}finally{setBusy(false);}}
 return <Card title="Verify this account"><Text style={s.body}>A fresh phone verification is required before changing PINs. Your active alerts stay open.</Text>{error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}{sent?<><Field label="Account verification code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6}/><Button title="Verify account" disabled={busy||!/^\d{6}$/.test(code)} onPress={()=>run(async()=>{await NativeSafety.confirmReauthentication(code);setCode('');setSent(false);onVerified();})}/><Button title="Request another code" secondary disabled={busy} onPress={()=>{setSent(false);setCode('');}}/></>:<Button title="Send account verification code" disabled={busy} onPress={()=>run(async()=>{const result=JSON.parse(await NativeSafety.requestReauthentication());if(result.status==='VERIFIED')onVerified();else setSent(true);})}/>}</Card>;
}
