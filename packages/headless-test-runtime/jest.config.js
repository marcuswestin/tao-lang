const sharedModuleNameMapper = require('../shared/jest-module-name-mapper.cjs')

module.exports = {
  preset: 'react-native',
  // testMatch differs from expo-runtime; moduleNameMapper is shared via ../shared/jest-module-name-mapper.cjs

  testMatch: ['<rootDir>/tests/*.jest-test.ts?(x)'],
  moduleNameMapper: sharedModuleNameMapper,
}
