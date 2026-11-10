// Generated fixtures exercise plumbing only. A tiny dataset must fail graduation.
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const folder=resolve('.local/training-smoke'),manifest=resolve(folder,'manifest.json');
if(!existsSync(manifest))throw Error('Run ml:training-smoke first with the training environment.');
const rows=JSON.parse(readFileSync(manifest,'utf8'));
if(rows.length!==24||rows.some(r=>r.license!=='GENERATED_TOOLCHAIN_TEST_ONLY'||r.device!=='GENERATED'||!Array.isArray(r.events)))throw Error('Only the generated training-smoke fixture is allowed. Regenerate it with ml:training-smoke.');
function run(args,expected=0){const result=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:16*1024*1024});if(result.error||result.status!==expected)throw Error('Workflow smoke failed: '+args[0]+'\n'+result.stdout+'\n'+result.stderr);return result.stdout;}
const candidate=resolve(folder,'candidate/candidate.tflite'),descriptor=resolve(folder,'candidate/candidate.json');
const validation=resolve(folder,'validation-predictions.json'),freeze=resolve(folder,'freeze.json'),test=resolve(folder,'test-predictions.json');
const predict=['scripts/ml-python.mjs','ml/runtime/predict.py',manifest,'--model',candidate,'--descriptor',descriptor];
run([...predict,'--split','validation','--output',validation]);
run(['--import','tsx','ml/evaluation/calibrate.ts',manifest,validation,freeze]);
run([...predict,'--split','test','--freeze',freeze,'--output',test]);
const report=JSON.parse(run(['--import','tsx','ml/evaluation/evaluate.ts',manifest,test,freeze],2));
if(report.status!=='BLOCKED_EXTERNAL'||report.event_metrics_gate!=='FAIL_OR_NOT_EVALUATED'||report.automatic_dispatch!==false)throw Error('Generated tiny dataset incorrectly graduated');
writeFileSync(resolve(folder,'workflow-report.json'),JSON.stringify(report,null,2),{mode:0o600});
console.log(JSON.stringify({status:'PASS_GENERATED_WORKFLOW_ONLY',stages:['train/export (prerequisite)','validation inference','threshold freeze','test inference','event evaluation'],graduation:'CORRECTLY_BLOCKED',accuracy:'NOT_MEASURED',automatic_dispatch:false},null,2));
