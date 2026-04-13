const sharedModuleNameMapper = require('../shared/jest-module-name-mapper.cjs')

module.exports = {
  preset: 'jest-expo',
  // testMatch is Expo-specific; moduleNameMapper is shared with headless-test-runtime via ../shared/jest-module-name-mapper.cjs

  testMatch: ['<rootDir>/tests-expo-runtime/*.jest-test.ts?(x)'],
  moduleNameMapper: sharedModuleNameMapper,
}
