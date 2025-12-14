import { TaoLangTerminals } from './_gen-tao-parser/ast'

export type File = {
  path: string
}

export type CompileResult = {
  code: string
}

export function compile(opts: { file: File }): CompileResult {
  const { file } = opts
  console.log(file, TaoLangTerminals)
  return {
    code: `
      import { View, Text } from 'react-native';
      export function TestView() {
        return (
          <View>
            <Text>
              Hello World from compiled app: ${file.path}
            </Text>
          </View>
        )
      }
    `,
  }
}
