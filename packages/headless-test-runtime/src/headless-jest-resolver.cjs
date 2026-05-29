'use strict'

/** Resolve generated app-shell imports to the platform-neutral fallback in headless tests. */
module.exports = function headlessJestResolver(request, options) {
  if (request.endsWith('/tao-runtime/AppShell')) {
    return options.defaultResolver(`${request}.tsx`, options)
  }
  return options.defaultResolver(request, options)
}
