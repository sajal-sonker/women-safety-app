import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {copyFile,lstat,mkdir,readFile,rename,unlink,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export function vpnOrigin(config){
 let url;try{url=new URL(config.api_origin);}catch{throw Error('Private VPN configuration is missing or invalid.');}
 if(config.private_only!==true||url.protocol!=='https:'||!url.hostname.endsWith('.ts.net')||url.hostname==='.ts.net'||url.port||url.username||url.password||url.search||url.hash||url.pathname!=='/'||config.auth_port!==9099||config.firebase_project!=='demo-surakshaai')throw Error('Expected the existing private HTTPS Tailscale demo endpoint.');
 return url.origin;
}
async function digest(path){
 const stat=await lstat(path);if(!stat.isFile())throw Error('Expected a regular APK file.');
 const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);
 return {size:stat.size,sha256:hash.digest('hex')};
}
function matches(receipt,origin,contract,revision,actual){
 if(receipt.version!==1||receipt.api_origin!==origin||receipt.contract_sha256!==contract||receipt.source_revision!==revision||receipt.size!==actual.size||receipt.sha256!==actual.sha256)throw Error('APK does not match this VPN build. Rebuild with build-private-vpn-phone.ps1 before publishing.');
}
export async function recordVpnBuild({apk,buildConfig,receiptPath,config,contract,revision}){
 const origin=vpnOrigin(config),source=await readFile(buildConfig,'utf8');
 const field=name=>{const match=source.match(new RegExp('String '+name+' = ("[^"\\r\\n]*");'));return match?JSON.parse(match[1]):null;};
 if(field('API_BASE_URL')!==origin||field('APPLICATION_ID')!=='com.surakshaai.demo'||field('FIREBASE_PROJECT_ID')!=='demo-surakshaai'||!/boolean CONTROLLED_DEMO = true;/.test(source))throw Error('Build configuration is not the intended private VPN Demo.');
 const receipt={version:1,api_origin:origin,contract_sha256:contract,source_revision:revision,...await digest(apk),built_at:new Date().toISOString()};
 await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');return receipt;
}
export async function verifyVpnArtifact({apk,receiptPath,config,contract,revision}){
 const receipt=JSON.parse(await readFile(receiptPath,'utf8'));matches(receipt,vpnOrigin(config),contract,revision,await digest(apk));return receipt;
}
export async function publishVpnArtifact(options){
 const receipt=await verifyVpnArtifact(options),folder=options.publishFolder;
 await mkdir(folder,{recursive:true});const temporary=join(folder,randomUUID()+'.apk');
 try{
  await copyFile(options.apk,temporary);
  matches(receipt,vpnOrigin(options.config),options.contract,options.revision,await digest(temporary));
  await rename(temporary,join(folder,'aegis-demo.apk'));
  await writeFile(join(folder,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 }finally{await unlink(temporary).catch(()=>{});}
 return receipt;
}
