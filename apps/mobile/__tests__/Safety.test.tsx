import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import App from '../src/App';
let mockState={uid:null as string|null,phone:null as string|null,intent:null as null|{client_request_id:string,state:string,event_id:null,error:null},position:null,location_status:'STOPPED'};
const mockApi=jest.fn(async(path:string)=>{
 if(path==='/me')return JSON.stringify({display_name:'Demo'});
 return JSON.stringify({items:[],next_cursor:null});
});
jest.mock('../specs/NativeSafety',()=>({__esModule:true,default:{
 initialize:jest.fn(async()=>JSON.stringify(mockState)),getSafetyState:jest.fn(async()=>JSON.stringify(mockState)),
 onSafetyChange:jest.fn(()=>({remove:jest.fn()})),apiRequest:(...args:unknown[])=>mockApi(args[0] as string),
 activateSos:jest.fn(async()=>{mockState={...mockState,intent:{client_request_id:'f970b49d-a4a5-4d26-a410-939687629090',state:'LOCAL_PENDING',event_id:null,error:null}};return JSON.stringify(mockState.intent);})
}}));
beforeEach(()=>{jest.useFakeTimers();mockState={uid:null,phone:null,intent:null,position:null,location_status:'STOPPED'};});
afterEach(()=>jest.useRealTimers());
test('phone sign-in and emergency dialer remain available before authentication',async()=>{
 let tree:Renderer.ReactTestRenderer;
 await act(async()=>{tree=Renderer.create(<App/>);});
 const buttons=tree!.root.findAll(n=>n.props.accessibilityRole==='button');
 expect(buttons.some(n=>n.props.accessibilityLabel==='Open dialer · 112')).toBe(true);
 expect(tree!.root.findAll(n=>n.props.accessibilityLabel==='Phone number').length).toBeGreaterThan(0);
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
 expect(text).toContain('LOCAL PENDING');
 expect(text).toContain('Not sent or outcome unknown');
 expect(text).not.toContain('DELIVERED');
 await act(async()=>tree!.unmount());
});
