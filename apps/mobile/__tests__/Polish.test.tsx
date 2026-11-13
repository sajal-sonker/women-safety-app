import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {Linking} from 'react-native';
import {AdvancedControls} from '../src/AdvancedControls';
import {Reauthenticate} from '../src/Reauthenticate';
import {AssistancePoints} from '../src/AssistancePoints';
import NativeSafety from '../specs/NativeSafety';
jest.mock('../src/api',()=>({api:jest.fn(async()=>({items:[]}))}));
jest.mock('../specs/NativeSafety',()=>({__esModule:true,default:{
 configurePins:jest.fn(async()=>'{}'),enterPin:jest.fn(async()=>'{"screen":"HOME"}'),resetPins:jest.fn(async()=>'{}'),
 requestReauthentication:jest.fn(async()=>'{"status":"CODE_SENT"}'),confirmReauthentication:jest.fn(async()=>'{"status":"VERIFIED"}'),setFocusedKeys:jest.fn(async()=>'{}')
}}));
const refresh=jest.fn(async()=>{});
function button(tree:Renderer.ReactTestRenderer,label:string){return tree.root.findAll(n=>n.props?.accessibilityRole==='button'&&n.props?.accessibilityLabel===label)[0];}
function field(tree:Renderer.ReactTestRenderer,label:string){return tree.root.findAll(n=>n.props?.accessibilityLabel===label&&n.props.onChangeText)[0];}
beforeEach(()=>{jest.clearAllMocks();});

test('invalid or matching PINs explain the problem without calling native authentication',async()=>{
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<AdvancedControls state={{}} section="pin" refresh={refresh}/>);});
 await act(async()=>{field(tree!,'Normal PIN').props.onChangeText('1234');field(tree!,'Duress PIN').props.onChangeText('4321');});
 await act(async()=>button(tree!,'Save PINs').props.onPress());
 expect(JSON.stringify(tree!.toJSON())).toContain('6 to 12 digits');expect(NativeSafety.configurePins).not.toHaveBeenCalled();
 await act(async()=>{field(tree!,'Normal PIN').props.onChangeText('123456');field(tree!,'Duress PIN').props.onChangeText('123456');});
 await act(async()=>button(tree!,'Save PINs').props.onPress());
 expect(JSON.stringify(tree!.toJSON())).toContain('Choose different');expect(NativeSafety.configurePins).not.toHaveBeenCalled();
 await act(async()=>tree!.unmount());
});
test('recent-auth PIN error offers same-account verification instead of forcing sign-out',async()=>{
 (NativeSafety.configurePins as jest.Mock).mockRejectedValueOnce(Object.assign(Error('Verify your phone again here.'),{code:'RECENT_AUTH_REQUIRED'}));
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<AdvancedControls state={{}} section="pin" refresh={refresh}/>);});
 await act(async()=>{field(tree!,'Normal PIN').props.onChangeText('123456');field(tree!,'Duress PIN').props.onChangeText('654321');});
 await act(async()=>button(tree!,'Save PINs').props.onPress());
 expect(button(tree!,'Send account verification code')).toBeDefined();
 await act(async()=>tree!.unmount());
});
test('step-up verifies the existing identity and clears its entered code after confirmation',async()=>{
 const verified=jest.fn();let tree:Renderer.ReactTestRenderer;
 await act(async()=>{tree=Renderer.create(<Reauthenticate onVerified={verified}/>);});
 await act(async()=>button(tree!,'Send account verification code').props.onPress());
 await act(async()=>field(tree!,'Account verification code').props.onChangeText('123456'));
 await act(async()=>button(tree!,'Verify account').props.onPress());
 expect(NativeSafety.requestReauthentication).toHaveBeenCalledTimes(1);expect(NativeSafety.confirmReauthentication).toHaveBeenCalledWith('123456');expect(verified).toHaveBeenCalledTimes(1);
 expect(field(tree!,'Account verification code')).toBeUndefined();await act(async()=>tree!.unmount());
});
test('volume shortcut reflects actual native armed state and makes foreground limits visible',async()=>{
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<AdvancedControls state={{volume_shortcut:{enabled:true,progress:2,status:'READY'}}} section="advanced" refresh={refresh}/>);});
 const toggle=tree!.root.findAll(n=>n.props?.accessibilityLabel==='Enable focused volume experiment'&&n.props.onValueChange)[0];
 expect(toggle.props.value).toBe(true);expect(JSON.stringify(tree!.toJSON())).toContain('2 of 4 taps');expect(JSON.stringify(tree!.toJSON())).toContain('lock screen');
 await act(async()=>toggle.props.onValueChange(false));expect(NativeSafety.setFocusedKeys).toHaveBeenCalledWith(false);
 await act(async()=>tree!.unmount());
});
test('real help search is distinct from fictional listings and opens Maps only after a tap',async()=>{
 const open=jest.spyOn(Linking,'openURL').mockResolvedValue(true as never);let tree:Renderer.ReactTestRenderer;
 await act(async()=>{tree=Renderer.create(<AssistancePoints/>);});
 expect(open).not.toHaveBeenCalled();expect(button(tree!,'Load sample shops')).toBeUndefined();
 await act(async()=>button(tree!,'Police stations in Maps').props.onPress());
 expect(open).toHaveBeenCalledWith('https://www.google.com/maps/search/?api=1&query=police%20stations%20near%20me');
 await act(async()=>button(tree!,'Explore the fictional Lucknow demo').props.onPress());
 expect(JSON.stringify(tree!.toJSON())).toContain('not near your current position');expect(button(tree!,'Load sample shops')).toBeDefined();
 await act(async()=>tree!.unmount());open.mockRestore();
});
