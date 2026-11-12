import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {MotionControls} from '../src/MotionControls';
import {VoiceCheckIn} from '../src/VoiceCheckIn';
import {AudioMonitoringControls} from '../src/AudioMonitoringControls';
import NativeSafety from '../specs/NativeSafety';
jest.mock('../specs/NativeSafety',()=>({__esModule:true,default:{startMonitoring:jest.fn(async()=>'{}'),stopMonitoring:jest.fn(async()=>'{}'),activateSos:jest.fn()}}));
const run=async(action:()=>Promise<void>)=>action();
beforeEach(()=>jest.clearAllMocks());
test('motion start requires consent and supplies session sensitivity without auto SOS',async()=>{
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<MotionControls busy={false} run={run}/>);});
 const button=(label:string)=>tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel===label)[0];
 expect(button('Start motion check-in').props.accessibilityState.disabled).toBe(true);
 const toggle=(label:string)=>tree!.root.findAll(n=>n.props.accessibilityLabel===label&&n.props.onValueChange)[0];
 await act(async()=>{toggle('Consent to motion check-in').props.onValueChange(true);button('Adjust shake sensitivity').props.onPress();});
 await act(async()=>toggle('More responsive shake detection').props.onValueChange(true));
 await act(async()=>button('Start motion check-in').props.onPress());
 expect(JSON.parse((NativeSafety.startMonitoring as jest.Mock).mock.calls[0][0])).toMatchObject({mode:'MOTION_ONLY_CONFIRMATION',motion_consent:true,motion_sensitivity:'SENSITIVE'});expect(NativeSafety.activateSos).not.toHaveBeenCalled();
 await act(async()=>tree!.unmount());
});
test('voice conflict is explained and blocks starting another motion session',async()=>{
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<MotionControls busy={false} run={run} monitoring={{status:'ACTIVE_CONFIRMATION_ONLY',remaining_seconds:100,check_in:false}}/>);});
 const toggle=tree!.root.findAll(n=>n.props.accessibilityLabel==='Consent to motion check-in'&&n.props.onValueChange)[0];await act(async()=>toggle.props.onValueChange(true));
 const start=tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel==='Start motion check-in')[0];expect(start.props.accessibilityState.disabled).toBe(true);expect(JSON.stringify(tree!.toJSON())).toContain('Stop it in the Voice tab');
 await act(async()=>tree!.unmount());
});
test('ready session offers Stop and motion prompt uses its own wording without dispatch',async()=>{
 let tree:Renderer.ReactTestRenderer;const state={status:'MOTION_ONLY_FOREGROUND',remaining_seconds:100,check_in:true,decision:'MOTION_CHECK_IN'};
 await act(async()=>{tree=Renderer.create(<><MotionControls busy={false} run={run} monitoring={state}/><VoiceCheckIn monitoring={state} onCancel={jest.fn()} onSend={jest.fn()}/></>);});
 expect(JSON.stringify(tree!.toJSON())).toContain('We noticed repeated shaking');expect(JSON.stringify(tree!.toJSON())).toContain('Ready for shakes');
 const stop=tree!.root.findAll(n=>n.props?.accessibilityRole==='button'&&n.props?.accessibilityLabel==='Stop motion check-in')[0];await act(async()=>stop.props.onPress());expect(NativeSafety.stopMonitoring).toHaveBeenCalledTimes(1);expect(NativeSafety.activateSos).not.toHaveBeenCalled();
 await act(async()=>tree!.unmount());
});
test('missing motion samples give a motion message without a false microphone failure',async()=>{
 let tree:Renderer.ReactTestRenderer;const state={status:'DEGRADED',remaining_seconds:0,check_in:false,decision:'MOTION_CHECK_IN',reason:'MOTION_SENSOR_NOT_RESPONDING'};
 await act(async()=>{tree=Renderer.create(<><MotionControls busy={false} run={run} monitoring={state}/><AudioMonitoringControls busy={false} run={run} setNotice={jest.fn()} monitoring={state}/></>);});
 const text=JSON.stringify(tree!.toJSON());expect(text).toContain('Motion data isn’t arriving');expect(text).not.toContain('Listening stopped');expect(NativeSafety.activateSos).not.toHaveBeenCalled();await act(async()=>tree!.unmount());
});
