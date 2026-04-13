'use strict'

/** Common `moduleNameMapper` for Tao Jest packages under `packages/*` (sibling `shared` + hoisted `@babel/runtime`). */
module.exports = {
  '^@babel/runtime/(.*)$': '<rootDir>/node_modules/@babel/runtime/$1',
  '^@compiler$': '<rootDir>/../compiler/tao-compiler.ts',
  '^@compiler/(.*)$': '<rootDir>/../compiler/compiler-src/$1',
  '^@formatter/(.*)$': '<rootDir>/../formatter/src/$1',
  '^@parser$': '<rootDir>/../parser/src/parser.ts',
  '^@parser/(.*)$': '<rootDir>/../parser/src/$1',
  '^@shared$': '<rootDir>/../shared/shared-src/shared.ts',
  '^@shared/(.*)$': '<rootDir>/../shared/shared-src/$1',
}
