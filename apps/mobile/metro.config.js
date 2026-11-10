const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path=require('path');
const root=path.resolve(__dirname,'../..');
module.exports=mergeConfig(getDefaultConfig(__dirname),{
  watchFolders:[root],
  resolver:{nodeModulesPaths:[path.resolve(__dirname,'node_modules'),path.resolve(root,'node_modules')]}
});
