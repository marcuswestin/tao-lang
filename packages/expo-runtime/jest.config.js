module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.jest-test.ts?(x)'],
  watchPathIgnorePatterns: ['./app/_gen-tao-compiler'],
  reporters: [
    ['jest-silent-reporter', { useDots: true, showWarnings: true, showPaths: true }],
  ],
}
