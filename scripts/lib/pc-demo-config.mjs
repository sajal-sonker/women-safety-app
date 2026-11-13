export function pcDemoEnvironment(profile,inherited={}){
 let database;
 try{database=new URL(profile.DATABASE_URL);}catch{throw Error('PC profile needs a local DATABASE_URL.');}
 if(!['postgres:','postgresql:'].includes(database.protocol)||!['127.0.0.1','localhost'].includes(database.hostname))throw Error('PC mode requires local PostgreSQL; the saved Supabase connection is a separate profile.');
 if(profile.APP_ENV!=='local'||profile.HOST!=='127.0.0.1'||profile.PORT!=='4001')throw Error('PC mode requires APP_ENV=local, HOST=127.0.0.1 and PORT=4001.');
 if(!profile.FIREBASE_PROJECT_ID?.startsWith('demo-')||!/^127\.0\.0\.1:9099$/.test(profile.FIREBASE_AUTH_EMULATOR_HOST??''))throw Error('PC mode requires the loopback demo authentication emulator.');
 if(profile.SMS_PROVIDER!=='fake'||profile.PUSH_PROVIDER!=='fake')throw Error('PC demo uses fake delivery providers.');
 if(!/^[a-f0-9]{64}$/i.test(profile.DATA_KEY_HEX??'')||(profile.RECEIPT_SECRET??'').length<32)throw Error('Retain the existing local encryption and receipt secrets in the private PC profile.');
 const environment={...inherited,...profile,NEXT_PUBLIC_FIREBASE_PROJECT_ID:profile.FIREBASE_PROJECT_ID,NEXT_PUBLIC_FIREBASE_API_KEY:'demo-api-key',NEXT_PUBLIC_FIREBASE_APP_ID:'1:1234567890:web:demo',API_BASE_URL:'http://127.0.0.1:4001'};
 for(const key of ['FIREBASE_ADMIN_CREDENTIALS_JSON','GOOGLE_APPLICATION_CREDENTIALS','GOOGLE_CLOUD_PROJECT','FIREBASE_CONFIG'])delete environment[key];
 if(!profile.ERASURE_LEDGER_PATH)delete environment.ERASURE_LEDGER_PATH;
 return environment;
}
