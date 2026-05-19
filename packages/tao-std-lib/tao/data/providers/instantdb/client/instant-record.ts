import { Assert } from '../../../../tao-runtime/runtime-utils'

/** assertInstantRecordMatchesEntityDecl throws on unknown keys or bad primitives; returns `record` for a linear call site. */
export function assertInstantRecordMatchesEntityDecl(
  collection: string,
  fieldTypes: Readonly<Record<string, string>>,
  record: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of Object.keys(record)) {
    Assert(
      key === 'id' || key in fieldTypes,
      `Instant insert ${collection}: unknown field ${
        JSON.stringify(key)
      } (not declared on this collection for Instant)`,
    )
    if (key === 'id') {
      continue
    }
    const declared = fieldTypes[key]
    Assert(declared !== undefined, `Instant insert ${collection}: missing field type for ${JSON.stringify(key)}`)
    assertValueMatchesDeclaredTaoField(collection, key, declared, record[key])
  }
  return record
}

function assertValueMatchesDeclaredTaoField(
  collection: string,
  field: string,
  declared: string,
  value: unknown,
): void {
  if (value === null || value === undefined) {
    return
  }
  if (declared === 'string') {
    Assert(typeof value === 'string', `Instant insert ${collection}.${field}: expected string`)
    return
  }
  if (declared === 'number') {
    Assert(typeof value === 'number', `Instant insert ${collection}.${field}: expected number`)
    return
  }
  if (declared === 'date') {
    Assert(typeof value === 'number', `Instant insert ${collection}.${field}: expected Unix millisecond date`)
    return
  }
  if (declared === 'boolean') {
    Assert(typeof value === 'boolean', `Instant insert ${collection}.${field}: expected boolean`)
    return
  }
}
