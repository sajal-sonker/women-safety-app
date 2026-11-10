import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validate} from '../packages/contracts/src/index.ts';
import validSos from '../packages/contracts/fixtures/sos-create.json' with {type:'json'};
test('wire validation rejects privilege injection, bad units and unbounded coordinates',()=>{
 assert.equal(validate('ContactCreate',{name:'Test',phone_e164:'+16505550101',priority:1,invite_status:'VERIFIED'}),false);
 assert.equal(validate('Location',{lat:181,lon:2,accuracy_m:null,captured_at:'2026-11-10T12:00:00Z',source:'gps'}),false);
 assert.equal(validate('SosCreate',{trigger_type:'MANUAL',client_request_id:'7b1b773b-7f53-4983-bd20-7fa57216888a',triggered_at:'2026-11-10T12:00:00Z',location:null,location_status:'UNAVAILABLE'}),true);
 assert.equal(validate('SosCreate',validSos),true);
 assert.equal(validate('SosCreate',{trigger_type:'MANUAL',client_request_id:'wrong',triggered_at:'2026-11-10T12:00:00Z',location:null,location_status:'UNAVAILABLE'}),false);
});
