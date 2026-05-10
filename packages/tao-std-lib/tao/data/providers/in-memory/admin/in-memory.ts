import type { TaoDataAdmin, TaoDataAdminPushSchemaInput } from '../../tao-data-client'

/** MemoryTaoDataAdmin implements schema push as a no-op for harnesses and local tests. */
export class MemoryTaoDataAdmin implements TaoDataAdmin {
  async pushSchema(input: TaoDataAdminPushSchemaInput): Promise<unknown> {
    return {
      provider: 'Memory',
      schemas: input.schemas.map(schema => schema.name),
      overwrite: input.overwrite,
    }
  }
}
