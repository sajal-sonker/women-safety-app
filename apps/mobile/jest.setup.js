jest.mock('react-native-safe-area-context',()=>require('react-native-safe-area-context/jest/mock').default);
jest.mock('@maplibre/maplibre-react-native',()=>{
  const {View}=require('react-native');
  return {Map:View,Camera:View,GeoJSONSource:View,Layer:View};
});
