/** sleep resolves after the given delay in milliseconds. */
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
