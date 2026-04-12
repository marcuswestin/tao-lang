const sharedModuleNameMapper = require('../shared/jest-module-name-mapper.cjs')

module.exports = {
  preset: 'jest-expo',

  testMatch: ['<rootDir>/tests-expo-runtime/*.jest-test.ts?(x)'],
  moduleNameMapper: sharedModuleNameMapper,
}
