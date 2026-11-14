// Read-only checks for the existing server. No accounts, alerts or devices are changed.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parse} from 'dotenv';
import {pcDemoEnvironment} from './lib/pc-demo-config.mjs';
import {verifyVpnArtifact,vpnOrigin} from './lib/private-vpn-artifact.mjs';
import {checkVpnEndpoints} from './lib/pc-demo-readiness.mjs';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));
try{
 pcDemoEnvironment(parse(await readFile('.local/pc.env','utf8')),{});
 const config=JSON.parse(await readFile('.local/vpn.json','utf8')),origin=vpnOrigin(config);
 const contract=createHash('sha256').update(await readFile('packages/contracts/openapi.yaml')).digest('hex');
 const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const receipt=await verifyVpnArtifact({apk:'.local/published/aegis-demo.apk',receiptPath:'.local/published/receipt.json',config,contract,revision});
 const checks=await checkVpnEndpoints({origin,size:receipt.size});
 console.log('READY Private profile and published APK endpoint/contract/checksum');
 for(const check of checks)console.log((check.ready?'READY ':'NEEDS_ACTION ')+check.label);
 process.exitCode=checks.every(check=>check.ready)?0:1;
 console.log('Still test both physical phones on mobile data: invitation, SOS, response and resolution. Keep the receiver app open.');
}catch(error){
 console.error(error.code==='ENOENT'?'Run this on the previously configured server PC. Its private profile or verified published APK is missing; follow docs/PC_VPN_DEMO.md.':error.message);
 process.exitCode=1;
}
