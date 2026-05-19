import { i, PlatformApi } from '@instantdb/platform'
import { throwUserInputRejectionError } from '@shared/TaoErrors'
import {
  type TaoDataAdmin,
  type TaoDataAdminPushSchemaInput,
  type TaoDataProviderParams,
  taoDatasetFieldIsIndexed,
  type TaoDatasetFieldShape,
  taoDatasetFieldType,
  type TaoSerializedDataSchema,
} from '../../tao-data-client'

type InstantBaseFieldType =
  | ReturnType<typeof i.string>
  | ReturnType<typeof i.number>
  | ReturnType<typeof i.boolean>
  | ReturnType<typeof i.date>
  | ReturnType<typeof i.any>

type InstantFieldType =
  | InstantBaseFieldType
  | ReturnType<InstantBaseFieldType['optional']>
  | ReturnType<InstantBaseFieldType['indexed']>
  | ReturnType<ReturnType<InstantBaseFieldType['optional']>['indexed']>

const instantTypeFns: Record<string, () => InstantBaseFieldType> = {
  string: () => i.string(),
  number: () => i.number(),
  boolean: () => i.boolean(),
  date: () => i.date(),
}

/** InstantTaoDataAdmin pushes Tao schemas through the Instant Platform API. */
export class InstantDBTaoAdmin implements TaoDataAdmin {
  async pushSchema(input: TaoDataAdminPushSchemaInput): Promise<unknown> {
    const appId = this.requiredStringProviderParam(input.params, 'appId')
    const adminToken = this.requiredStringProviderParam(input.params, 'adminToken')
    const apiURI = this.optionalStringProviderParam(input.params, 'apiURI')
    const api = new PlatformApi({
      auth: { token: adminToken },
      ...(apiURI ? { apiURI } : {}),
    })
    const schema = this.buildInstantPlatformSchema(input.schemas)
    const body = input.overwrite ? { schema, overwrite: true as const } : { schema }
    return await api.schemaPush(appId, body)
  }
  private buildInstantPlatformSchema(schemas: readonly TaoSerializedDataSchema[]) {
    const entities: Record<string, ReturnType<typeof i.entity>> = {}
    const collectionOwners = new Map<string, string>()
    for (const schema of schemas) {
      for (const [collection, fields] of Object.entries(schema.shape.entities)) {
        const previousOwner = collectionOwners.get(collection)
        if (previousOwner !== undefined) {
          throwUserInputRejectionError(
            `Cannot push schema: collection '${collection}' is declared in both '${previousOwner}' and '${schema.name}'.`,
          )
        }
        collectionOwners.set(collection, schema.name)
        entities[collection] = i.entity(
          Object.fromEntries(
            Object.entries(fields).map(([fieldName, field]) => [fieldName, this.buildInstantPlatformAttr(field)]),
          ),
        )
      }
    }
    return i.schema({ entities, links: {} })
  }
  /** buildInstantPlatformAttr maps one serialized Tao field to an Instant attr definition. */
  private buildInstantPlatformAttr(field: TaoDatasetFieldShape): InstantFieldType {
    const fieldType = taoDatasetFieldType(field)
    const factory = instantTypeFns[fieldType]
    let attr: InstantFieldType = factory ? factory() : i.any()
    if (typeof field !== 'string') {
      if (field.optional === true || fieldType === 'any') {
        attr = attr.optional()
      }
      if (field.unique === true) {
        attr = attr.unique()
      }
      if (taoDatasetFieldIsIndexed(field)) {
        attr = attr.indexed()
      }
    }
    return attr
  }
  private requiredStringProviderParam(params: TaoDataProviderParams, name: string): string {
    const value = params[name]
    if (typeof value !== 'string' || value.length === 0) {
      throwUserInputRejectionError(`InstantDB schema push requires provider parameter '${name}'.`)
    }
    return value
  }

  private optionalStringProviderParam(params: TaoDataProviderParams, name: string): string | undefined {
    const value = params[name]
    if (value === undefined) {
      return undefined
    }
    if (typeof value !== 'string') {
      throwUserInputRejectionError(`InstantDB schema push provider parameter '${name}' must be a string.`)
    }
    return value
  }
}
