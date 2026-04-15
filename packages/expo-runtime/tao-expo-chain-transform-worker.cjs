'use strict'

// Custom Metro transform worker for Tao Expo runtime.
// Patches module resolution then delegates to Expo's upstream worker.
//
// Bundle Tao source maps are applied in metro.config.js (middleware rewrites `.map` JSON).
// See Docs/Features/SourceMapping-Plan.md.

const { patchNodeModuleResolver } = require('@expo/metro-config/build/transform-worker/utils/moduleMapper')
patchNodeModuleResolver()

const upstream = require('@expo/metro-config/build/transform-worker/transform-worker')
const SELF = require.resolve('./tao-expo-chain-transform-worker.cjs')

/** getCacheKey extends Expo's cache key so edits to this wrapper invalidate transforms. */
function getCacheKey(config) {
  return [SELF, 'tao-worker-v1', upstream.getCacheKey(config)].join('$')
}

module.exports = { ...upstream, getCacheKey }
