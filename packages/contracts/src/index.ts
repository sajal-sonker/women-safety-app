import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schemas from './generated/schema.json' with {type:'json'};
export type {components,paths} from './generated/api.ts';
export {CONTRACT_SHA256} from './generated/hash.ts';
const ajv=new Ajv({strict:false,allErrors:true});
addFormats(ajv);
for(const [name,schema] of Object.entries(schemas))ajv.addSchema(schema,'#/components/schemas/'+name);
export const validate=(name:string,data:unknown)=>ajv.getSchema('#/components/schemas/'+name)?.(data)??false;
