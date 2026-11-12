import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {Linking} from 'react-native';
import {FakeCallScreen} from '../src/FakeCallScreen';
import {VoiceCheckIn} from '../src/VoiceCheckIn';
import {PlacePicker,demoPlaces} from '../src/PlacePicker';
import NativeSafety from '../specs/NativeSafety';
jest.mock('../specs/NativeSafety',()=>({__esModule:true,default:{searchPlaces:jest.fn()}}));
beforeEach(()=>jest.clearAllMocks());

test('incoming call offers answer and decline, then an answered timer and end action',async()=>{
 const answer=jest.fn(),end=jest.fn();let tree:Renderer.ReactTestRenderer;
 await act(async()=>{tree=Renderer.create(<FakeCallScreen label="A friend" onAnswer={answer} onEnd={end}/>);});
 const button=(name:string)=>tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel===name)[0];
 await act(async()=>button('Answer call').props.onPress());expect(answer).toHaveBeenCalledTimes(1);
 await act(async()=>{tree!.update(<FakeCallScreen label="A friend" answeredAt={Date.now()-65000} onAnswer={answer} onEnd={end}/>);});
 expect(JSON.stringify(tree!.toJSON())).toContain('01:05');expect(button('Answer call')).toBeUndefined();
 await act(async()=>button('End call').props.onPress());expect(end).toHaveBeenCalledTimes(1);
 await act(async()=>tree!.unmount());
});
test('check-in/countdown is a visible modal and never sends SOS merely by rendering',async()=>{
 const send=jest.fn(),cancel=jest.fn();let tree:Renderer.ReactTestRenderer;
 await act(async()=>{tree=Renderer.create(<VoiceCheckIn monitoring={{status:'ACTIVE_CONFIRMATION_ONLY',remaining_seconds:100,check_in:true,auto_dispatch:true,auto_sos_seconds:9}} onSend={send} onCancel={cancel}/>);});
 expect(JSON.stringify(tree!.toJSON())).toContain('Sending SOS in 9s');expect(send).not.toHaveBeenCalled();
 const button=tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel==='Cancel SOS — I’m okay')[0];await act(async()=>button.props.onPress());expect(cancel).toHaveBeenCalledTimes(1);
 await act(async()=>tree!.unmount());
});
test('place search runs only on explicit Search, accepts a named result and rejects stale replies',async()=>{
 let reply:(value:string)=>void=()=>{};(NativeSafety.searchPlaces as jest.Mock).mockImplementationOnce(()=>new Promise(resolve=>{reply=resolve;}));
 const change=jest.fn();let tree:Renderer.ReactTestRenderer;
 await act(async()=>{tree=Renderer.create(<PlacePicker label="Destination" value={null} onChange={change}/>);});
 const input=()=>tree!.root.findAll(n=>n.props.accessibilityLabel==='Destination'&&n.props.onChangeText)[0];
 await act(async()=>input().props.onChangeText('Lucknow library'));expect(NativeSafety.searchPlaces).not.toHaveBeenCalled();
 const button=()=>tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel==='Search destination')[0];
 let pending:Promise<void>;await act(async()=>{pending=button().props.onPress();});
 await act(async()=>input().props.onChangeText('Different library'));
 await act(async()=>{reply(JSON.stringify({items:[{label:'Old result',lat:26.85,lon:80.94,source:'PHONE'}]}));await pending;});
 expect(JSON.stringify(tree!.toJSON())).not.toContain('Old result');expect(change).not.toHaveBeenCalled();
 (NativeSafety.searchPlaces as jest.Mock).mockResolvedValueOnce(JSON.stringify({items:[{label:'City Library',lat:26.85,lon:80.94,source:'PHONE'}]}));
 await act(async()=>button().props.onPress());
 const choose=tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel==='City Library')[0];await act(async()=>choose.props.onPress());expect(change).toHaveBeenCalledWith(expect.objectContaining({label:'City Library',source:'PHONE'}));
 await act(async()=>tree!.unmount());
});
test('editing a selected place retains the typed name instead of clearing it',async()=>{
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<PlacePicker label="Starting point" value={demoPlaces[0]} onChange={()=>tree!.update(<PlacePicker label="Starting point" value={null} onChange={jest.fn()}/>)}/>);});
 const input=()=>tree!.root.findAll(n=>n.props.accessibilityLabel==='Starting point'&&n.props.onChangeText)[0];await act(async()=>input().props.onChangeText('New place'));expect(input().props.value).toBe('New place');
 await act(async()=>tree!.unmount());
});
test('unavailable place service offers an explicit Maps search fallback',async()=>{
 (NativeSafety.searchPlaces as jest.Mock).mockRejectedValueOnce(Error('Place search is unavailable'));
 const open=jest.spyOn(Linking,'openURL').mockResolvedValue(true as never);let tree:Renderer.ReactTestRenderer;
 await act(async()=>{tree=Renderer.create(<PlacePicker label="Destination" value={null} onChange={jest.fn()}/>);});
 const input=tree!.root.findAll(n=>n.props.accessibilityLabel==='Destination'&&n.props.onChangeText)[0];await act(async()=>input.props.onChangeText('City library'));
 const button=(label:string)=>tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel===label)[0];await act(async()=>button('Search destination').props.onPress());
 expect(open).not.toHaveBeenCalled();await act(async()=>button('Search this place in Maps').props.onPress());expect(open).toHaveBeenCalledWith('https://www.google.com/maps/search/?api=1&query=City%20library');
 await act(async()=>tree!.unmount());open.mockRestore();
});
