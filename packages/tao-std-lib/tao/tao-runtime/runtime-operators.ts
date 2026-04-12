export const OperatorMap = {
  '=': <T>(_curr: T, operand: T) => operand as number,
  '+=': <T>(curr: T, operand: T) => (curr as number) + (operand as number),
  '-=': <T>(curr: T, operand: T) => (curr as number) - (operand as number),
} as const
