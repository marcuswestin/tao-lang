import { AST } from '@parser/parser'
import { switch_safe } from '@shared'
import {
  collectionSlugFromPlural,
  dataFieldPrimitiveType as taoDataFieldPrimitiveType,
} from '../../query/query-model'

/** Codegen-time field shape narrowed to known Tao primitives; structurally assignable to `TaoDatasetFieldShape` in tao-data-client. */
export type TaoSerializedDatasetFieldShape = string | {
  type: 'string' | 'number' | 'boolean' | 'date' | 'any'
  optional?: boolean
  unique?: boolean
  indexed?: boolean
}

export type TaoSerializedDatasetShape = {
  entities: Record<string, Record<string, TaoSerializedDatasetFieldShape>>
  links: Record<string, unknown>
}

/** Codegen-time schema; structurally assignable to `TaoSerializedDataSchema` in tao-data-client. */
export type TaoSerializedDataSchema = {
  name: string
  shape: TaoSerializedDatasetShape
}

/** collectSerializedDataSchemas returns every top-level Tao data schema in the compiled module graph. */
export function collectSerializedDataSchemas(taoFiles: readonly AST.TaoFile[]): TaoSerializedDataSchema[] {
  const schemas: TaoSerializedDataSchema[] = []
  for (const taoFile of taoFiles) {
    for (const stmt of taoFile.statements) {
      const declaration = AST.isModuleDeclaration(stmt) ? stmt.declaration : stmt
      if (AST.isDataDeclaration(declaration)) {
        schemas.push(dataDeclarationToSerializedSchema(declaration))
      }
    }
  }
  return schemas
}

/** dataDeclarationToSerializedSchema maps a Tao `data` declaration to the provider-neutral schema shape. */
export function dataDeclarationToSerializedSchema(decl: AST.DataDeclaration): TaoSerializedDataSchema {
  const entities: TaoSerializedDatasetShape['entities'] = {}
  for (const entity of decl.dataStatements.filter(AST.isDataEntityDeclaration)) {
    entities[collectionSlugFromPlural(entity.pluralName)] = Object.fromEntries(
      entity.fields.map(field => [field.name, dataFieldToRuntimeFieldShape(field)]),
    )
  }
  return {
    name: decl.name,
    shape: {
      entities,
      links: {},
    },
  }
}

/** dataFieldToRuntimeFieldShape maps Tao fields and metadata to the shared provider shape. */
export function dataFieldToRuntimeFieldShape(field: AST.DataFieldDeclaration): TaoSerializedDatasetFieldShape {
  const shape: Extract<TaoSerializedDatasetFieldShape, { type: string }> = {
    type: serializedDataFieldPrimitiveType(field),
  }
  for (const meta of field.metadata) {
    if (meta.kind === 'optional') {
      shape.optional = true
    } else if (meta.kind === 'unique') {
      shape.unique = true
      shape.indexed = true
    } else if (meta.kind === 'indexed') {
      shape.indexed = true
    }
  }
  return shape
}

/** serializedDataFieldPrimitiveType maps a Tao data field to a provider-neutral primitive type name. */
function serializedDataFieldPrimitiveType(
  field: AST.DataFieldDeclaration,
): 'string' | 'number' | 'boolean' | 'date' | 'any' {
  const primitive = taoDataFieldPrimitiveType(field)
  if (!primitive) {
    return 'any'
  }
  return switch_safe(primitive, {
    text: () => 'string',
    number: () => 'number',
    boolean: () => 'boolean',
    date: () => 'date',
    action: () => 'any',
    view: () => 'any',
  })
}
