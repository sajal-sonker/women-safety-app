import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {recordVpnBuild,verifyVpnArtifact,publishVpnArtifact,vpnOrigin} from '../scripts/lib/private-vpn-artifact.mjs';
import {checkVpnEndpoints} from '../scripts/lib/pc-demo-readiness.mjs';
const {Response}=globalThis;

const config={private_only:true,api_origin:'https://demo.fixture.ts.net',auth_port:9099,firebase_project:'demo-surakshaai'};
const contract='synthetic-contract';
async function fixture(run){
 const folder=await mkdtemp(join(tmpdir(),'aegis-vpn-artifact-'));
 const options={apk:join(folder,'build.apk'),buildConfig:join(folder,'BuildConfig.java'),receiptPath:join(folder,'receipt.json'),publishFolder:join(folder,'published'),config,contract,revision:'synthetic-source-revision'};
 try{await writeFile(options.apk,'synthetic APK fixture, never installed');await writeFile(options.buildConfig,'String API_BASE_URL = "'+config.api_origin+'"; String APPLICATION_ID = "com.surakshaai.demo"; String FIREBASE_PROJECT_ID = "demo-surakshaai"; boolean CONTROLLED_DEMO = true;');await run(options);}
 finally{assert.equal(dirname(resolve(folder)),resolve(tmpdir()));assert.ok(basename(folder).startsWith('aegis-vpn-artifact-'));await rm(folder,{recursive:true,force:true});}
}
test('publishing keeps a verified fixed APK when a later USB build replaces the Gradle output',()=>fixture(async options=>{
 await recordVpnBuild(options);await publishVpnArtifact(options);
 await writeFile(options.apk,'a different USB build');
 assert.equal(await readFile(join(options.publishFolder,'aegis-demo.apk'),'utf8'),'synthetic APK fixture, never installed');
 await verifyVpnArtifact({...options,apk:join(options.publishFolder,'aegis-demo.apk'),receiptPath:join(options.publishFolder,'receipt.json')});
 await assert.rejects(publishVpnArtifact(options),/does not match/);
 assert.equal(await readFile(join(options.publishFolder,'aegis-demo.apk'),'utf8'),'synthetic APK fixture, never installed');
}));
test('a localhost or different-server build cannot be recorded for private VPN phones',()=>fixture(async options=>{
 for(const endpoint of ['http://127.0.0.1:4001','https://other.fixture.ts.net']){
  await writeFile(options.buildConfig,'String API_BASE_URL = "'+endpoint+'"; String APPLICATION_ID = "com.surakshaai.demo"; String FIREBASE_PROJECT_ID = "demo-surakshaai"; boolean CONTROLLED_DEMO = true;');
  await assert.rejects(recordVpnBuild(options),/not the intended/);
 }
}));
test('changed contract, endpoint or file bytes invalidate a recorded VPN APK',()=>fixture(async options=>{
 await recordVpnBuild(options);
 await assert.rejects(verifyVpnArtifact({...options,contract:'new-contract'}),/does not match/);
 await assert.rejects(verifyVpnArtifact({...options,revision:'new-app-source'}),/does not match/);
 await assert.rejects(verifyVpnArtifact({...options,config:{...config,api_origin:'https://other.fixture.ts.net'}}),/does not match/);
 await writeFile(options.apk,'changed');await assert.rejects(verifyVpnArtifact(options),/does not match/);
}));
test('public, credential-bearing and non-demo endpoint configurations are refused',()=>{
 for(const invalid of [{api_origin:'http://demo.fixture.ts.net'},{api_origin:'https://public.example.test'},{api_origin:'https://user:password@demo.fixture.ts.net'},{api_origin:'https://demo.fixture.ts.net/secret'},{api_origin:'https://demo.fixture.ts.net?query=secret'},{private_only:false},{auth_port:443},{firebase_project:'real-project'}])assert.throws(()=>vpnOrigin({...config,...invalid}));
});

function healthy(url){return url.includes(':8443')?new Response(null,{headers:{'content-type':'application/vnd.android.package-archive','content-length':'123','x-aegis-apk-source':'verified-published'}}):Response.json(url.includes('/health/')?{status:'OK'}:{});}
test('server readiness checks the private API, auth and fixed download without mutations',async()=>{
 const calls=[];const checks=await checkVpnEndpoints({origin:config.api_origin,size:123,request:async(url,options)=>{calls.push([url,options.method,options.redirect]);return healthy(url);}});
 assert.ok(checks.every(check=>check.ready));assert.deepEqual(calls.map(call=>call.slice(1)),[['GET','error'],['GET','error'],['HEAD','error']]);
 assert.ok(calls.some(call=>call[0]==='http://demo.fixture.ts.net:9099/emulator/v1/projects/demo-surakshaai/config'));
});
test('old download helpers or wrong-sized APKs cannot pass readiness',async()=>{
 for(const headers of [{'content-length':'123','content-type':'application/vnd.android.package-archive'},{'content-length':'999','content-type':'application/vnd.android.package-archive','x-aegis-apk-source':'verified-published'}]){
  const checks=await checkVpnEndpoints({origin:config.api_origin,size:123,request:async url=>url.includes(':8443')?new Response(null,{headers}):healthy(url)});
  assert.equal(checks.find(check=>check.label==='Published VPN APK').ready,false);
 }
});
test('unreachable services and a non-ready database are reported as failures',async()=>{
 const checks=await checkVpnEndpoints({origin:config.api_origin,size:123,request:async url=>{if(url.includes(':9099'))throw Error('synthetic outage');if(url.includes('/health/'))return Response.json({status:'NOT_READY'});return healthy(url);}});
 assert.equal(checks.find(check=>check.label==='Private API + database').ready,false);assert.equal(checks.find(check=>check.label==='Private demo authentication').ready,false);
});
