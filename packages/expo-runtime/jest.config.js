const sharedModuleNameMapper = require('../shared/jest-module-name-mapper.cjs')

module.exports = {
  preset: 'jest-expo',
  // testMatch is Expo-specific; moduleNameMapper is shared with headless-test-runtime via ../shared/jest-module-name-mapper.cjs

  testMatch: ['<rootDir>/tests-expo-runtime/*.jest-test.ts?(x)'],
  moduleNameMapper: {
    ...sharedModuleNameMapper,
    '^react$': '<rootDir>/node_modules/react',
    '^react/jsx-dev-runtime$': '<rootDir>/node_modules/react/jsx-dev-runtime',
    '^react/jsx-runtime$': '<rootDir>/node_modules/react/jsx-runtime',
    '^react-native$': '<rootDir>/node_modules/react-native',
    '^react-native-safe-area-context$': '<rootDir>/tests-expo-runtime/safe-area-context-mock.tsx',
  },
}
