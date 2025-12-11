import type { ValidationAcceptor, ValidationChecks } from 'langium'
import type { TaoServices } from '../../tao-compiler'
import type { Person, TaoLangAstType } from '../gen-tao-parser/ast'

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: TaoServices) {
  const registry = services.validation.ValidationRegistry
  const validator = services.validation.TaoLangValidator
  const checks: ValidationChecks<TaoLangAstType> = {
    Person: validator.checkPersonStartsWithCapital,
  }
  registry.register(checks, validator)
}

/**
 * Implementation of custom validations.
 */
export class TaoLangValidator {
  checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
    if (person.name) {
      const firstChar = person.name.substring(0, 1)
      if (firstChar.toUpperCase() !== firstChar) {
        accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' })
      }
    }
  }
}
