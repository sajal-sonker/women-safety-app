import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {AppState} from 'react-native';
import App from '../src/App';
let mockState={uid:null as string|null,phone:null as string|null,intent:null as null|{client_request_id:string,state:string,event_id:null,error:null},position:null,location_status:'STOPPED',decoy:false,fake_call:null as {label:string;ringing:boolean}|null};
let mockDisplayName='Demo';
let mockReceivedItems:unknown[]=[];
const mockApi=jest.fn(async(path:string,method='GET',body='')=>{
 if(path==='/me'){if(method==='PATCH')mockDisplayName=JSON.parse(body).display_name;return JSON.stringify({display_name:mockDisplayName});}
 if(path==='/received-alerts')return JSON.stringify({items:mockReceivedItems,next_cursor:null});
 return JSON.stringify({items:[],next_cursor:null});
});
jest.mock('../specs/NativeSafety',()=>({__esModule:true,default:{
 initialize:jest.fn(async()=>JSON.stringify(mockState)),getSafetyState:jest.fn(async()=>JSON.stringify(mockState)),
 startPhone:jest.fn(async()=>'{"status":"CODE_SENT"}'),
 confirmPhone:jest.fn(async()=>{mockState={...mockState,uid:'owner-demo',phone:'+16505550101'};return '{}';}),
 enterPin:jest.fn(async(_pin:string,practice:boolean)=>JSON.stringify({screen:practice?'NOTES':'HOME',practice})),
 clearAccount:jest.fn(async()=>{mockState={...mockState,uid:null,phone:null};return '{}';}),
 onSafetyChange:jest.fn(()=>({remove:jest.fn()})),apiRequest:(...args:unknown[])=>mockApi(args[0] as string,args[1] as string,args[2] as string),
 activateSos:jest.fn(async()=>{mockState={...mockState,intent:{client_request_id:'f970b49d-a4a5-4d26-a410-939687629090',state:'LOCAL_PENDING',event_id:null,error:null}};return JSON.stringify(mockState.intent);})
}}));
beforeEach(()=>{jest.useFakeTimers();mockDisplayName='Demo';mockApi.mockClear();mockState={uid:null,phone:null,intent:null,position:null,location_status:'STOPPED',decoy:false,fake_call:null};});
afterEach(()=>jest.useRealTimers());
test('phone sign-in and emergency dialer remain available before authentication',async()=>{
 let tree:Renderer.ReactTestRenderer;
 await act(async()=>{tree=Renderer.create(<App/>);});
 const buttons=tree!.root.findAll(n=>n.props.accessibilityRole==='button');
 expect(buttons.some(n=>n.props.accessibilityLabel==='Open dialer · 112')).toBe(true);
 expect(tree!.root.findAll(n=>n.props.accessibilityLabel==='Phone number').length).toBeGreaterThan(0);
 await act(async()=>tree!.unmount());
});
test('expired-code retry and sign-out return to a fresh phone verification form',async()=>{
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<App/>);});
 const button=(label:string)=>tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel===label)[0];
 await act(async()=>{button('Send verification code').props.onPress();});
 expect(button('Verify and continue')).toBeDefined();
 await act(async()=>{button('Change number or resend').props.onPress();});
 expect(button('Send verification code')).toBeDefined();
 await act(async()=>{button('Send verification code').props.onPress();});
 await act(async()=>{button('Verify and continue').props.onPress();});
 expect(button('Alert trusted contacts')).toBeDefined();
 const more=tree!.root.findAll(n=>n.props.accessibilityLabel==='More, tab, 5 of 5'&&typeof n.props.onPress==='function')[0];
 await act(async()=>{more.props.onPress();});
 await act(async()=>{button('Open settings').props.onPress();});
 await act(async()=>{button('Sign out').props.onPress();});
 expect(button('Send verification code')).toBeDefined();expect(button('Verify and continue')).toBeUndefined();
 await act(async()=>tree!.unmount());
});
test('manual activation shows local pending truthfully rather than claiming delivery',async()=>{
 mockState={...mockState,uid:'owner-demo',phone:'+16505550101'};
 let tree:Renderer.ReactTestRenderer;
 await act(async()=>{tree=Renderer.create(<App/>);});
 const button=tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel==='Alert trusted contacts')[0];
 expect(button).toBeDefined();
 await act(async()=>{button.props.onPress();});
 const text=JSON.stringify(tree!.toJSON());
 expect(text).toContain('Saved on this phone');
 expect(text).toContain('Not sent or outcome unknown');
 expect(text).not.toContain('DELIVERED');
 await act(async()=>tree!.unmount());
});

test('a received alert banner opens the same app inbox and can return to its own contacts',async()=>{
 AppState.currentState='active';mockReceivedItems=[{grant_id:'demo-grant',kind:'SOS_READ',shared_name:'Synthetic sibling',started_at:new Date().toISOString(),expires_at:new Date(Date.now()+60000).toISOString()}];
 mockState={...mockState,uid:'owner-demo',phone:'+16505550101'};
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<App/>);});
 const button=(label:string)=>tree!.root.findAll(n=>n.props?.accessibilityRole==='button'&&n.props?.accessibilityLabel===label)[0];
 await act(async()=>button('Open incoming invitations and alerts').props.onPress());
 expect(button('Check for updates')).toBeDefined();
 expect(button('Open received SOS')).toBeDefined();
 await act(async()=>button('My contacts').props.onPress());expect(button('Add a contact')).toBeDefined();
 await act(async()=>tree!.unmount());mockReceivedItems=[];
});
test('navigation has five tabs and optional tools open one at a time',async()=>{
 mockState={...mockState,uid:'owner-demo',phone:'+16505550101'};
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<App/>);});
 const labels=new Set(tree!.root.findAll(n=>typeof n.props.accessibilityLabel==='string'&&/tab, \d of 5/.test(n.props.accessibilityLabel)).map(n=>n.props.accessibilityLabel));expect(labels.size).toBe(5);
 const button=(label:string)=>tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel===label)[0];
 await act(async()=>{button('Manage voice check-in').props.onPress();});
 expect(button('Start listening')).toBeDefined();expect(button('Save PINs')).toBeUndefined();
 const more=tree!.root.findAll(n=>n.props.accessibilityLabel==='More, tab, 5 of 5'&&typeof n.props.onPress==='function')[0];await act(async()=>more.props.onPress());
 expect(button('Motion check-in')).toBeDefined();expect(button('Fake call')).toBeDefined();await act(async()=>{button('Fake call').props.onPress();});
 expect(button('Start fake call')).toBeDefined();expect(button('Save PINs')).toBeUndefined();
 await act(async()=>tree!.unmount());
});
test('hamburger profile name updates the personal Home greeting',async()=>{
 mockState={...mockState,uid:'owner-demo',phone:'+16505550101'};
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<App/>);});
 const button=(label:string)=>tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel===label)[0];
 await act(async()=>button('Open settings').props.onPress());
 const input=tree!.root.findAll(n=>n.props.accessibilityLabel==='Your name'&&n.props.onChangeText)[0];await act(async()=>input.props.onChangeText('Sajal Kumar'));
 await act(async()=>button('Save name').props.onPress());
 expect(mockApi).toHaveBeenCalledWith('/me','PATCH',JSON.stringify({display_name:'Sajal Kumar'}));
 const home=tree!.root.findAll(n=>n.props.accessibilityLabel==='Home, tab, 1 of 5'&&typeof n.props.onPress==='function')[0];await act(async()=>home.props.onPress());
 expect(JSON.stringify(tree!.toJSON())).toContain('All well, Sajal?');
 await act(async()=>tree!.unmount());
});
test('PIN practice stays in the tool and a normal shortcut returns Home',async()=>{
 mockState={...mockState,uid:'owner-demo',phone:'+16505550101'};
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<App/>);});
 const button=(label:string)=>tree!.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel===label)[0];
 const tab=(label:string)=>tree!.root.findAll(n=>n.props.accessibilityLabel===label&&typeof n.props.onPress==='function')[0];
 await act(async()=>tab('More, tab, 5 of 5').props.onPress());await act(async()=>button('App PIN & duress').props.onPress());
 const field=()=>tree!.root.findAll(n=>n.props.accessibilityLabel==='Enter app PIN'&&n.props.onChangeText)[0];await act(async()=>field().props.onChangeText('654321'));
 await act(async()=>button('Rehearse PIN without sending').props.onPress());expect(JSON.stringify(tree!.toJSON())).toContain('would open notes. No SOS requested.');
 const practice=tree!.root.findAll(n=>n.props.accessibilityLabel==='Practice PIN without SOS'&&n.props.onValueChange)[0];await act(async()=>practice.props.onValueChange(false));await act(async()=>field().props.onChangeText('654321'));
 await act(async()=>button('Use PIN shortcut').props.onPress());expect(tree!.root.findAll(n=>n.props.accessibilityLabel==='Home, tab, 1 of 5'&&(n.props['aria-selected']===true||n.props.accessibilityState?.selected===true)).length).toBeGreaterThan(0);
 await act(async()=>tree!.unmount());
});
test('journey uses named places and exposes no coordinate form',async()=>{
 mockState={...mockState,uid:'owner-demo',phone:'+16505550101'};
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<App/>);});
 const tab=tree!.root.findAll(n=>n.props.accessibilityLabel==='Journey, tab, 3 of 5'&&typeof n.props.onPress==='function')[0];await act(async()=>tab.props.onPress());
 const text=JSON.stringify(tree!.toJSON());expect(text).toContain('Community centre');expect(text).toContain('Riverside café');expect(text).not.toContain('Origin latitude');expect(text).not.toContain('Destination latitude');expect(text).not.toContain('Depart in hours');
 await act(async()=>tree!.unmount());
});
test('decoy screen omits safety contacts, emergency status and delivery claims',async()=>{
 mockState={...mockState,uid:'owner-demo',decoy:true,intent:{client_request_id:'f970b49d-a4a5-4d26-a410-939687629090',state:'OUTCOME_UNKNOWN',event_id:null,error:null}};
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<App/>);});const text=JSON.stringify(tree!.toJSON());expect(text).toContain('Notes');expect(text).not.toContain('OUTCOME UNKNOWN');expect(text).not.toContain('Alert trusted contacts');expect(text).not.toContain('SOS status');await act(async()=>tree!.unmount());
});
test('simulated call view is dismissible and does not show SOS controls',async()=>{
 mockState={...mockState,uid:'owner-demo',fake_call:{label:'Practice friend',ringing:true}};let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<App/>);});const text=JSON.stringify(tree!.toJSON());expect(text).toContain('In-app call simulation');expect(text).toContain('Decline call');expect(text).not.toContain('Alert trusted contacts');await act(async()=>tree!.unmount());
});
