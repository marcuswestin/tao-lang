import type { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import { makeValidater, type Reporter } from '../ValidationReporter'

/** dataSchemaValidationMessages are diagnostics for data schema blocks. */
export const dataSchemaValidationMessages = {
  duplicateEntityName: (name: string) => `Duplicate entity name '${name}'.`,
  duplicateEntityPluralName: (name: string) => `Duplicate entity plural name '${name}'.`,
  duplicateFieldName: (entity: string, field: string) => `Duplicate field '${field}' in entity '${entity}'.`,
  shorthandFieldNotAnEntity: (name: string) =>
    `Shorthand field '${name}' must match an entity name in this data block. Use '${name} <type>' for an explicit type.`,
  fieldRefNotInDataBlock: (name: string) =>
    `Field type '${name}' must reference an entity or type declared in this data block.`,
  entityNameMustBeUppercase: (name: string) => `Entity name '${name}' must begin with an uppercase letter.`,
  fieldNameMustBeUppercase: (name: string) => `Field name '${name}' must begin with an uppercase letter.`,
} as const

/** dataSchemaValidator holds Langium validation checks for data schema blocks. */
export const dataSchemaValidator: Pick<
  langium.ValidationChecks<AST.TaoLangAstType>,
  'DataDeclaration' | 'DataEntityDeclaration' | 'DataFieldDeclaration' | 'DataTypeDeclaration'
> = {
  DataDeclaration: makeValidater((node, report) => {
    validateNoDuplicateEntityNames(node, report)
  }),

  DataEntityDeclaration: makeValidater((node, report) => {
    validateEntityUppercaseNames(node, report)
    validateNoDuplicateFieldNames(node, report)
  }),

  DataFieldDeclaration: makeValidater((node, report) => {
    validateFieldUppercaseName(node, report)
    validateShorthandFieldType(node, report)
    validateFieldRefInDataBlock(node, report)
  }),

  DataTypeDeclaration: makeValidater((node, report) => {
    validateDataTypeUppercaseName(node, report)
  }),
}

/** validateNoDuplicateEntityNames rejects entities with duplicate singular or plural names. */
function validateNoDuplicateEntityNames(node: AST.DataDeclaration, report: Reporter<AST.DataDeclaration>): void {
  const entities = node.dataStatements.filter(AST.isDataEntityDeclaration)
  const seenNames = new Map<string, AST.DataEntityDeclaration>()
  const seenPluralNames = new Map<string, AST.DataEntityDeclaration>()

  for (const entity of entities) {
    const existingName = seenNames.get(entity.name)
    if (existingName) {
      report.error(dataSchemaValidationMessages.duplicateEntityName(entity.name), { node: entity, property: 'name' })
    }
    seenNames.set(entity.name, entity)

    const existingPlural = seenPluralNames.get(entity.pluralName)
    if (existingPlural) {
      report.error(
        dataSchemaValidationMessages.duplicateEntityPluralName(entity.pluralName),
        { node: entity, property: 'pluralName' },
      )
    }
    seenPluralNames.set(entity.pluralName, entity)
  }
}

/** validateEntityUppercaseNames reports non-uppercase entity singular and plural names. */
function validateEntityUppercaseNames(
  node: AST.DataEntityDeclaration,
  report: Reporter<AST.DataEntityDeclaration>,
): void {
  if (!startsUppercase(node.name)) {
    report.error(dataSchemaValidationMessages.entityNameMustBeUppercase(node.name), { node, property: 'name' })
  }
  if (!startsUppercase(node.pluralName)) {
    report.error(
      dataSchemaValidationMessages.entityNameMustBeUppercase(node.pluralName),
      { node, property: 'pluralName' },
    )
  }
}

/** validateNoDuplicateFieldNames rejects entities with duplicate field names. */
function validateNoDuplicateFieldNames(
  node: AST.DataEntityDeclaration,
  report: Reporter<AST.DataEntityDeclaration>,
): void {
  const seen = new Set<string>()
  for (const field of node.fields) {
    if (seen.has(field.name)) {
      report.error(
        dataSchemaValidationMessages.duplicateFieldName(node.name, field.name),
        { node: field, property: 'name' },
      )
    }
    seen.add(field.name)
  }
}

/** validateFieldUppercaseName reports non-uppercase field names. */
function validateFieldUppercaseName(
  node: AST.DataFieldDeclaration,
  report: Reporter<AST.DataFieldDeclaration>,
): void {
  if (!startsUppercase(node.name)) {
    report.error(dataSchemaValidationMessages.fieldNameMustBeUppercase(node.name), { node, property: 'name' })
  }
}

/** validateDataTypeUppercaseName reports non-uppercase data type names. */
function validateDataTypeUppercaseName(
  node: AST.DataTypeDeclaration,
  report: Reporter<AST.DataTypeDeclaration>,
): void {
  if (!startsUppercase(node.name)) {
    report.error(dataSchemaValidationMessages.entityNameMustBeUppercase(node.name), { node, property: 'name' })
  }
}

/** validateShorthandFieldType rejects shorthand fields whose name doesn't match an entity or data-scoped type in the data block. */
function validateShorthandFieldType(
  node: AST.DataFieldDeclaration,
  report: Reporter<AST.DataFieldDeclaration>,
): void {
  if (node.type !== undefined) {
    return
  }
  if (node.metadata.length > 0) {
    return
  }
  const dataDecl = findParentDataDeclaration(node)
  if (!dataDecl) {
    return
  }
  const entityNames = new Set(
    dataDecl.dataStatements.filter(AST.isDataEntityDeclaration).map(e => e.name),
  )
  const typeNames = new Set(
    dataDecl.dataStatements.filter(AST.isDataTypeDeclaration).map(t => t.name),
  )
  if (!entityNames.has(node.name) && !typeNames.has(node.name)) {
    report.error(
      dataSchemaValidationMessages.shorthandFieldNotAnEntity(node.name),
      { node, property: 'name' },
    )
  }
}

/** validateFieldRefInDataBlock rejects field type named/array refs that don't point to entities or types in the data block. */
function validateFieldRefInDataBlock(
  node: AST.DataFieldDeclaration,
  report: Reporter<AST.DataFieldDeclaration>,
): void {
  if (!node.type) {
    return
  }
  const fieldType = node.type
  const ref = fieldType.namedRef?.ref ?? fieldType.arrayRef?.ref
  if (!ref) {
    return
  }
  if (AST.isDataEntityDeclaration(ref) || AST.isDataTypeDeclaration(ref)) {
    return
  }
  if (AST.isTypeDeclaration(ref)) {
    return
  }
  const refName = fieldType.namedRef?.$refText ?? fieldType.arrayRef?.$refText ?? '?'
  report.error(
    dataSchemaValidationMessages.fieldRefNotInDataBlock(refName),
    { node, property: 'type' },
  )
}

/** findParentDataDeclaration walks up from a node to find the enclosing DataDeclaration. */
function findParentDataDeclaration(node: AST.Node): AST.DataDeclaration | undefined {
  let current: AST.Node | undefined = node.$container
  while (current) {
    if (AST.isDataDeclaration(current)) {
      return current
    }
    current = current.$container
  }
  return undefined
}

/** startsUppercase returns true when the first character is an uppercase letter. */
function startsUppercase(name: string): boolean {
  const first = name.charAt(0)
  return first !== '' && first === first.toUpperCase() && first !== first.toLowerCase()
}
