module.exports = {
  preset: 'jest-expo',

  testMatch: ['<rootDir>/tests - expo-runtime/*.jest-test.ts?(x)'],
  moduleNameMapper: {
    '^@babel/runtime/(.*)$': '<rootDir>/node_modules/@babel/runtime/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/shared-src/$1',
  },
}
