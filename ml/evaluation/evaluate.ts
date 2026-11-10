import {readFile} from 'node:fs/promises';
import {datasetGraduation,verifyFiles,type Recording} from './protocol.ts';
import {eventMetrics} from './events.ts';
import {sha256,verifyFreeze,type PredictionFile} from './freeze.ts';
const path=process.argv[2];
if(!path){console.log(JSON.stringify({status:'BLOCKED_EXTERNAL',automatic_dispatch:false,baseline:'BUNDLED_YAMNET_CONFIRMATION_ONLY',reason:'No consented held-out phrase/detector evaluation supplied. Run ml:smoke for actual bundled-model execution.'},null,2));process.exitCode=2;}
else{
 const rawManifest=await readFile(path,'utf8'),rows=JSON.parse(rawManifest) as Recording[];await verifyFiles(rows);const result=datasetGraduation(rows);
 const predictionsPath=process.argv[3];let metrics:unknown='NOT_EVALUATED';
 if(predictionsPath){if(!process.argv[4])throw Error('Supply the separate validation freeze artifact; a boolean is not proof of a pre-test freeze');const input=JSON.parse(await readFile(predictionsPath,'utf8')) as PredictionFile,frozen=verifyFreeze(rows,input,await readFile(process.argv[4],'utf8'),sha256(rawManifest));metrics=eventMetrics(input.recordings,frozen.threshold);}
 const measured=metrics as ReturnType<typeof eventMetrics>;
 const eventGate=typeof metrics==='object'&&Object.values(measured.per_class).every(c=>c.support>=150&&c.recall!==null&&c.recall>=.9&&c.recall_95pct_lower>=.85&&c.precision!==null&&c.precision>=.9)&&measured.negative_hours>=30&&measured.false_alarm_95pct_upper_per_hour!==null&&measured.false_alarm_95pct_upper_per_hour<=.1;
 console.log(JSON.stringify({...result,model_metrics:metrics,event_metrics_gate:eventGate?'REPORTED_METRICS_PASS_ONLY':'FAIL_OR_NOT_EVALUATED',device_metrics:'NOT_EVALUATED',graduation:'INDEPENDENT_DEVICE_AND_MODEL_REVIEW_REQUIRED'},null,2));process.exitCode=result.status==='BLOCKED_EXTERNAL'||!eventGate?2:0;
}
