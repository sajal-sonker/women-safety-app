import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const python=process.env.ML_PYTHON??(existsSync('.tools/ml/Scripts/python.exe')?'.tools/ml/Scripts/python.exe':existsSync('.tools/ml/bin/python')?'.tools/ml/bin/python':'python');
const result=spawnSync(python,[...process.argv.slice(2)],{stdio:'inherit'});
if(result.error)throw Error('ML Python unavailable. Create an isolated environment using ml/runtime/requirements.txt and set ML_PYTHON.');
process.exitCode=result.status??1;
