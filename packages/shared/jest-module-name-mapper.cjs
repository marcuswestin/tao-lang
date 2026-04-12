'use strict'

/** Common `moduleNameMapper` for Tao Jest packages under `packages/*` (sibling `shared` + hoisted `@babel/runtime`). */
module.exports = {
  '^@babel/runtime/(.*)$': '<rootDir>/node_modules/@babel/runtime/$1',
  '^@shared/(.*)$': '<rootDir>/../shared/shared-src/$1',
}
