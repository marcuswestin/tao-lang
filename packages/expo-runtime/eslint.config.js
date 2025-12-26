// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    // Global ignores - must be in their own object with no other keys
    ignores: [
      '_gen-*/*',
    ],
  },
])
