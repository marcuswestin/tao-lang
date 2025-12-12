// assertNever throws an error when called, used for exhaustive type checking
// Example:
//   switch(expr.kind) {
//     case 'a': ...; break;
//     case 'b': ...; break;
//     default: assertNever(expr); // type error if not exhaustive
//   }
export function assertNever<T extends never>(_arg: T): never {
  throw new Error(`assertNever called`)
}
