const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { rewriteBundleMapSources } = require('./tao-source-map-rewrite.cjs')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

config.transformerPath = require.resolve('./tao-expo-chain-transform-worker.cjs')

/** GEN_DIR is the Tao SDK compile output root (`tao-app`); must match `rewriteBundleMapSources` callers and tests. */
const GEN_DIR = path.join(__dirname, '_gen', 'tao-app')

/** bufferChunk normalizes a write/end chunk to a Buffer (encoding applies only to string chunks). */
function bufferChunk(chunk, encodingOrCb) {
  return Buffer.isBuffer(chunk)
    ? chunk
    : Buffer.from(chunk, typeof encodingOrCb === 'string' ? encodingOrCb : undefined)
}

/** tryRewriteSourceMap returns rewritten JSON if `body` is a v3 source map, otherwise returns it unchanged. */
function tryRewriteSourceMap(body) {
  const trimmed = body.trimStart()
  if (!trimmed.startsWith('{') || !trimmed.includes('"sources"')) {
    return body
  }
  return rewriteBundleMapSources(body, GEN_DIR)
}

/** bufferResponseBody intercepts res.write/end to collect the full body, passes it through `transform`, then sends the result. */
function bufferResponseBody(res, transform) {
  const chunks = []
  const origWrite = res.write.bind(res)
  const origEnd = res.end.bind(res)

  res.write = (chunk, encodingOrCb, cb) => {
    if (chunk) {
      chunks.push(bufferChunk(chunk, encodingOrCb))
    }
    const callback = typeof encodingOrCb === 'function' ? encodingOrCb : cb
    if (typeof callback === 'function') {
      callback()
    }
    return true
  }

  res.end = (chunk, encodingOrCb, cb) => {
    if (chunk) {
      chunks.push(bufferChunk(chunk, encodingOrCb))
    }
    res.write = origWrite
    res.end = origEnd

    const original = Buffer.concat(chunks).toString('utf8')
    let out
    try {
      out = transform(original)
    } catch {
      out = original
    }
    if (out !== original) {
      try {
        res.removeHeader('Content-Length')
      } catch { /* ignore */ }
    }

    const outBuf = Buffer.from(out, 'utf8')
    const callback = typeof encodingOrCb === 'function' ? encodingOrCb : cb
    return typeof callback === 'function'
      ? origEnd.call(res, outBuf, callback)
      : origEnd.call(res, outBuf, encodingOrCb)
  }
}

/** createTaoBundleMapRewriteMiddleware wraps `inner` so JSON `.map` responses get Tao source map rewrites. */
function createTaoBundleMapRewriteMiddleware(inner) {
  return (req, res, next) => {
    if (!(req.url || '').includes('.map')) {
      return inner(req, res, next)
    }
    bufferResponseBody(res, tryRewriteSourceMap)
    return inner(req, res, next)
  }
}

const prevEnhance = config.server?.enhanceMiddleware
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const chain = prevEnhance ? prevEnhance(middleware, server) : middleware
    return createTaoBundleMapRewriteMiddleware(chain)
  },
}

module.exports = config
