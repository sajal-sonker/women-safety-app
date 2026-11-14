import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {recordVpnBuild,publishVpnArtifact} from './lib/private-vpn-artifact.mjs';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));
try{
 const config=JSON.parse(await readFile('.local/vpn.json','utf8'));
 const contract=createHash('sha256').update(await readFile('packages/contracts/openapi.yaml')).digest('hex');
 const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const options={apk:'apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk',receiptPath:'.local/vpn-apk.json',config,contract,revision};
 if(process.argv[2]==='record')await recordVpnBuild({...options,buildConfig:'apps/mobile/android/app/build/generated/source/buildConfig/demo/com/surakshaai/BuildConfig.java'});
 else if(process.argv[2]==='publish')await publishVpnArtifact({...options,publishFolder:'.local/published'});
 else throw Error('Use record after a successful VPN build, or publish.');
 console.log('Verified private VPN APK '+process.argv[2]+' complete.');
}catch(error){console.error(error.code==='ENOENT'?'VPN build/configuration is missing. Run this on the existing server PC and build with scripts/build-private-vpn-phone.ps1 first.':error.message);process.exitCode=1;}
