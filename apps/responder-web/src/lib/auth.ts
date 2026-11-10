'use client';
import {initializeApp,getApps} from 'firebase/app';
import {getAuth,connectAuthEmulator} from 'firebase/auth';
let configured=false;
export function browserAuth(){
 const projectId=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID??'demo-surakshaai';
 const app=getApps()[0]??initializeApp({projectId,apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY??'demo-api-key',authDomain:projectId+'.firebaseapp.com',appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID??'1:1234567890:web:demo'});
 const auth=getAuth(app);
 if(!configured&&projectId.startsWith('demo-')){
  if(!['localhost','127.0.0.1'].includes(window.location.hostname))throw Error('Demo authentication only works on loopback');
  connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  auth.settings.appVerificationDisabledForTesting=true;configured=true;
 }
 return auth;
}
