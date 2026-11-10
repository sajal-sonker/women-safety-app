import {readFile} from 'node:fs/promises';
import {datasetGraduation,verifyFiles,type Recording} from './protocol.ts';
const path=process.argv[2];
if(!path){console.log(JSON.stringify({status:'BLOCKED_EXTERNAL',automatic_dispatch:false,reason:'No licensed, consented dataset or trained model supplied. See ml/MODEL_CARD.md.'},null,2));process.exitCode=2;}
else{const rows=JSON.parse(await readFile(path,'utf8')) as Recording[];await verifyFiles(rows);const result=datasetGraduation(rows);console.log(JSON.stringify({...result,model_metrics:'NOT_EVALUATED',device_metrics:'NOT_EVALUATED'},null,2));process.exitCode=result.status==='BLOCKED_EXTERNAL'?2:0;}
