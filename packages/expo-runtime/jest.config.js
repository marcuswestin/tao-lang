module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.jest-test.ts?(x)'],
  reporters: [
    ['jest-silent-reporter', { useDots: true, showWarnings: true, showPaths: true }],
  ],
}
