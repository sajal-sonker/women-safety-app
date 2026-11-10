module.exports = {
  testTimeout: 30000,
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-native-safe-area-context)/)'],
  setupFiles: ['./jest.setup.js'],
};
