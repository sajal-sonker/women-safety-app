import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {PermissionsAndroid} from 'react-native';
import {AudioMonitoringControls} from '../src/AudioMonitoringControls';
import NativeSafety from '../specs/NativeSafety';
import {api} from '../src/api';
jest.mock('../src/api',()=>({api:jest.fn(async()=>({}))}));
jest.mock('../specs/NativeSafety',()=>({__esModule:true,default:{startMonitoring:jest.fn(async()=>'{}'),stopMonitoring:jest.fn(async()=>'{}'),dismissMonitoringCheckIn:jest.fn(async()=>'{}'),activateSos:jest.fn(async()=>'{}')}}));
const run=async(action:()=>Promise<void>)=>action();
beforeEach(()=>{jest.clearAllMocks();});
test('phrase monitoring requires explicit consent and requests local phrase analysis',async()=>{
 jest.spyOn(PermissionsAndroid,'requestMultiple').mockResolvedValue({[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]:PermissionsAndroid.RESULTS.GRANTED} as never);
 let tree:Renderer.ReactTestRenderer;
 await act(async()=>{tree=Renderer.create(<AudioMonitoringControls busy={false} run={run} setNotice={jest.fn()}/>);});
 const start=()=>tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel==='Start listening')[0];
 expect(start().props.accessibilityState.disabled).toBe(true);
 const toggle=tree!.root.findAll(n=>n.props.accessibilityLabel==='Consent to audio, motion and phrase monitoring'&&n.props.onValueChange)[0];
 await act(async()=>{toggle.props.onValueChange(true);});
 expect(start().props.accessibilityState.disabled).toBe(false);
 await act(async()=>{await start().props.onPress();});
 expect(api).toHaveBeenCalledWith('/me/consents','PATCH',{version:'consent-v1',monitoring:true});
 expect(JSON.parse((NativeSafety.startMonitoring as jest.Mock).mock.calls[0][0])).toMatchObject({phrase_consent:true,audio_consent:true,mode:'CONFIRMATION_ONLY'});
 expect(NativeSafety.activateSos).not.toHaveBeenCalled();await act(async()=>tree!.unmount());
});
test('Help and Bachao prompts identify the word and never dispatch without a press',async()=>{
 for(const [phrase,decision]of[['HELP','HELP_CHECK_IN'],['BACHAO','BACHAO_CHECK_IN']]as const){
  let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<AudioMonitoringControls busy={false} run={run} setNotice={jest.fn()} monitoring={{status:'ACTIVE_CONFIRMATION_ONLY',remaining_seconds:100,check_in:true,decision,phrase_status:'ACTIVE',phrase_recognition:true,last_phrase:phrase}}/>);});
  const text=JSON.stringify(tree!.toJSON());expect(text).toContain(phrase==='HELP'?'Heard “Help”':'Heard “Bachao / बचाओ”');expect(text).toContain('No SOS was sent');expect(NativeSafety.activateSos).not.toHaveBeenCalled();
  const request=tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel==='Request SOS now')[0];await act(async()=>{await request.props.onPress();});expect(NativeSafety.activateSos).toHaveBeenLastCalledWith('MANUAL');await act(async()=>tree!.unmount());jest.clearAllMocks();
 }
});
test('unavailable phrase model remains visibly unavailable',async()=>{
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<AudioMonitoringControls busy={false} run={run} setNotice={jest.fn()} monitoring={{status:'DEGRADED',remaining_seconds:0,check_in:false,phrase_status:'UNAVAILABLE',reason:'PHRASE_MODEL_UNAVAILABLE'}}/>);});
 expect(JSON.stringify(tree!.toJSON())).toContain('Listening stopped');expect(JSON.stringify(tree!.toJSON())).not.toContain('PHRASE_MODEL_UNAVAILABLE');const details=tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel==='Session details')[0];await act(async()=>{details.props.onPress();});expect(JSON.stringify(tree!.toJSON())).toContain('PHRASE_MODEL_UNAVAILABLE');expect(NativeSafety.activateSos).not.toHaveBeenCalled();await act(async()=>tree!.unmount());
});
test('microphone denial prevents starting and preserves manual SOS path',async()=>{
 jest.spyOn(PermissionsAndroid,'requestMultiple').mockResolvedValue({[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]:PermissionsAndroid.RESULTS.DENIED} as never);
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<AudioMonitoringControls busy={false} run={run} setNotice={jest.fn()}/>);});
 const toggle=tree!.root.findAll(n=>n.props.accessibilityLabel==='Consent to audio, motion and phrase monitoring'&&n.props.onValueChange)[0];await act(async()=>{toggle.props.onValueChange(true);});
 const button=tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel==='Start listening')[0];await act(async()=>{await expect(button.props.onPress()).rejects.toThrow('Manual SOS remains available');});expect(NativeSafety.startMonitoring).not.toHaveBeenCalled();expect(api).not.toHaveBeenCalled();await act(async()=>tree!.unmount());
});
test('Stop releases local monitoring even when server consent withdrawal is offline',async()=>{
 (api as jest.Mock).mockRejectedValueOnce(Error('offline'));const notice=jest.fn();
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<AudioMonitoringControls busy={false} run={run} setNotice={notice} monitoring={{status:'ACTIVE_CONFIRMATION_ONLY',remaining_seconds:100,check_in:false,phrase_status:'ACTIVE',microphone:true}}/>);});
 const stop=tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel==='Stop listening')[0];await act(async()=>{await stop.props.onPress();});expect(NativeSafety.stopMonitoring).toHaveBeenCalledTimes(1);expect(notice).toHaveBeenCalledWith(expect.stringContaining('Listening stopped on this phone. Consent sync'));expect(NativeSafety.activateSos).not.toHaveBeenCalled();await act(async()=>tree!.unmount());
});
test('withdrawal during permission dialog cancels a late start',async()=>{
 let grant:(value:never)=>void=()=>{};
 jest.spyOn(PermissionsAndroid,'requestMultiple').mockImplementation(()=>new Promise(resolve=>{grant=resolve;}) as never);
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<AudioMonitoringControls busy={false} run={run} setNotice={jest.fn()}/>);});
 const toggle=()=>tree!.root.findAll(n=>n.props.accessibilityLabel==='Consent to audio, motion and phrase monitoring'&&n.props.onValueChange)[0];await act(async()=>{toggle().props.onValueChange(true);});
 const button=tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel==='Start listening')[0];let pending:Promise<void>;await act(async()=>{pending=button.props.onPress();});
 await act(async()=>{toggle().props.onValueChange(false);});
 await act(async()=>{grant({[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]:PermissionsAndroid.RESULTS.GRANTED} as never);await pending;});
 expect(NativeSafety.stopMonitoring).toHaveBeenCalledTimes(1);expect(NativeSafety.startMonitoring).not.toHaveBeenCalled();expect(api).not.toHaveBeenCalledWith('/me/consents','PATCH',{version:'consent-v1',monitoring:true});await act(async()=>tree!.unmount());
});
test('Stop during a pending server consent request prevents a late native start',async()=>{
 jest.spyOn(PermissionsAndroid,'requestMultiple').mockResolvedValue({[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]:PermissionsAndroid.RESULTS.GRANTED} as never);
 let consentReply:(value:unknown)=>void=()=>{};(api as jest.Mock).mockImplementationOnce(()=>new Promise(resolve=>{consentReply=resolve;}));
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<AudioMonitoringControls busy={false} run={run} setNotice={jest.fn()}/>);});
 const toggle=tree!.root.findAll(n=>n.props.accessibilityLabel==='Consent to audio, motion and phrase monitoring'&&n.props.onValueChange)[0];await act(async()=>{toggle.props.onValueChange(true);});
 const button=(label:string)=>tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel===label)[0];let pending:Promise<void>;await act(async()=>{pending=button('Start listening').props.onPress();});
 await act(async()=>{await button('Cancel start').props.onPress();});
 await act(async()=>{consentReply({});await pending;});
 expect(NativeSafety.startMonitoring).not.toHaveBeenCalled();expect(NativeSafety.stopMonitoring).toHaveBeenCalledTimes(1);expect(api).toHaveBeenLastCalledWith('/me/consents','PATCH',{version:'consent-v1',monitoring:false});await act(async()=>tree!.unmount());
});
test('recognized labels use Android-safe live announcements and hide diagnostics by default',async()=>{
 for(const phrase of ['HELP','BACHAO'] as const){
  let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<AudioMonitoringControls busy={false} run={run} setNotice={jest.fn()} monitoring={{status:'ACTIVE_CONFIRMATION_ONLY',remaining_seconds:100,check_in:false,microphone:true,phrase_recognition:true,phrase_status:'ACTIVE',last_phrase:phrase,windows:12,native_pss_kb:123456}}/>);});
  expect(tree!.root.findAll(n=>n.props.accessibilityRole==='status')).toHaveLength(0);
  expect(tree!.root.findAll(n=>n.props.accessibilityLiveRegion==='polite').length).toBeGreaterThan(0);
  const text=JSON.stringify(tree!.toJSON());expect(text).toContain('Heard ');expect(text).not.toContain('123456');expect(text).not.toContain('ACTIVE_CONFIRMATION_ONLY');
  const details=tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel==='Session details')[0];await act(async()=>{details.props.onPress();});expect(JSON.stringify(tree!.toJSON())).toContain('123456');
  await act(async()=>tree!.unmount());
 }
});
