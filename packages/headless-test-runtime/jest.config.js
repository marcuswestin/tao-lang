const sharedModuleNameMapper = require('../shared/jest-module-name-mapper.cjs')

module.exports = {
  preset: 'react-native',

  testMatch: ['<rootDir>/tests/*.jest-test.ts?(x)'],
  moduleNameMapper: sharedModuleNameMapper,
}
