// @ts-nocheck
// eslint-disable-next-line import/no-unresolved
const path = require('path')
const sharedModuleNameMapper = require('../shared/jest-module-name-mapper.cjs')

module.exports = {
  preset: 'react-native',
  // testMatch differs from expo-runtime; moduleNameMapper is shared via ../shared/jest-module-name-mapper.cjs

  testMatch: ['<rootDir>/tests/*.jest-test.ts?(x)'],
  moduleNameMapper: sharedModuleNameMapper,
  // Scenario compiles emit under repo `.builds/`; modulePaths lets Jest resolve `react-native` for modules loaded from there.
  modulePaths: [path.join(__dirname, 'node_modules')],
}
