import { validationMessages } from '@compiler/validation/tao-lang-validator'
import {
  expectDuplicateIdentifier,
  expectHasHumanErrors,
  expectHumanMessagesContain,
  expectNoHumanMessageContains,
  expectSomeHumanMessageSatisfies,
} from './test-utils/diagnostics'
import {
  describe,
  expect,
  parseASTWithErrors,
  parseMultipleFiles,
  parseTaoFully,
  test,
} from './test-utils/test-harness'

describe('validation — integration smoke (full pipeline):', () => {
  test('needle test', async () => {
    const needle = Math.random().toString(36).substring(2, 15)
    const code = `
        app KitchenSink { ui RootView }
        ui RootView { render Text "${needle}" {} }
        ui Text Value text {
            render inject \`\`\`ts return <RN.Text>{_ViewProps.Value}</RN.Text> \`\`\`
        }
    `
    const result = await parseTaoFully(code)
    result.statements.first.as_AppDeclaration.expect('name').toBe('KitchenSink')
  })

  test('action nested in a view validates', async () => {
    await parseTaoFully(`
      ui V {
        render inject \`\`\`ts return null \`\`\`
        action A {
          inject \`\`\`ts void 0 \`\`\`
        }
      }
    `)
  })

  test('duplicate parameter and alias name in same view fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui V X text {
        render inject \`\`\`ts return null \`\`\`
        alias X = 1
      }
    `)
    expectDuplicateIdentifier(report, 'X')
  })
})

describe('material render root validation:', () => {
  test('ui declaration without a render root fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui V { }
    `)
    expectHumanMessagesContain(report, validationMessages.missingRenderRoot('ui', 'V'))
  })

  test('duplicate top-level render roots fail validation', async () => {
    const report = await parseASTWithErrors(`
      ui V {
        render inject \`\`\`ts return null \`\`\`
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    expectHumanMessagesContain(report, validationMessages.duplicateRenderRoot)
  })

  test('nested render roots fail validation', async () => {
    const report = await parseASTWithErrors(`
      layout Row { render inject \`\`\`ts return null \`\`\` }
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render Row {
          render Text "nested"
        }
      }
    `)
    expectHumanMessagesContain(report, validationMessages.nestedRenderRoot)
  })

  test('render root cannot target an action', async () => {
    const report = await parseASTWithErrors(`
      action DoIt { }
      ui V {
        render DoIt
      }
    `)
    expectHumanMessagesContain(report, validationMessages.renderMustReferenceView)
  })
})

describe('caller children validation:', () => {
  test('frame with one static @@children validates and accepts caller children', async () => {
    await parseTaoFully(`
      frame Stack { render inject \`\`\`ts return null \`\`\` }
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      frame Card {
        render Stack {
          @@children
        }
      }
      ui Root {
        render Card {
          Text "inside"
        }
      }
    `)
  })

  test('ordinary frame without @@children fails validation', async () => {
    const report = await parseASTWithErrors(`
      frame Stack { render inject \`\`\`ts return null \`\`\` }
      frame Card {
        render Stack { }
      }
    `)
    expectHumanMessagesContain(report, validationMessages.missingChildrenSplice('frame', 'Card'))
  })

  test('@@children in ui fails validation', async () => {
    const report = await parseASTWithErrors(`
      frame Stack { render inject \`\`\`ts return null \`\`\` }
      ui Bad {
        render Stack {
          @@children
        }
      }
    `)
    expectHumanMessagesContain(report, validationMessages.childrenSpliceInUi)
  })

  test('duplicate @@children fails validation', async () => {
    const report = await parseASTWithErrors(`
      frame Stack { render inject \`\`\`ts return null \`\`\` }
      frame Card {
        render Stack {
          @@children
          @@children
        }
      }
    `)
    expectHumanMessagesContain(report, validationMessages.duplicateChildrenSplice)
  })

  test('@@children inside guard is not static', async () => {
    const report = await parseASTWithErrors(`
      frame Stack { render inject \`\`\`ts return null \`\`\` }
      frame Card {
        render Stack {
          guard {
            @@children
          }
        }
      }
    `)
    expectHumanMessagesContain(report, validationMessages.childrenSpliceMustBeStatic)
  })

  test('ui calls reject unnamed caller children', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui Leaf { render inject \`\`\`ts return null \`\`\` }
      ui Root {
        render Leaf {
          Text "extra"
        }
      }
    `)
    expectHumanMessagesContain(report, validationMessages.uiCallCannotHaveChildren)
  })

  test('ui calls reject caller container layout specs', async () => {
    const report = await parseASTWithErrors(`
      ui Leaf { render inject \`\`\`ts return null \`\`\` }
      ui Root {
        render Leaf [gap 8]
      }
    `)
    expectHumanMessagesContain(report, validationMessages.uiCallCannotHaveContainerLayout)
  })
})

describe('statement placement validation:', () => {
  test('state update in view body fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui V {
        render inject \`\`\`ts return null \`\`\`
        state S = 1
        set S = 2
      }
    `)
    expectHumanMessagesContain(report, validationMessages.viewBody)
  })

  test('use statement in view body fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui V {
        render inject \`\`\`ts return null \`\`\`
        use X from a/b
      }
    `)
    expectHumanMessagesContain(report, validationMessages.viewBody)
  })

  test('view render at file level fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      Text "hi"
    `)
    expectHumanMessagesContain(report, validationMessages.topLevel)
  })

  test('state update at file level fails validation', async () => {
    const report = await parseASTWithErrors(`
      state X = 1
      set X = 2
    `)
    expectHumanMessagesContain(report, validationMessages.topLevel)
  })

  test('module declaration in view body fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Outer {
        render inject \`\`\`ts return null \`\`\`
        hide ui Inner { }
      }
    `)
    expectHumanMessagesContain(report, validationMessages.viewBody)
  })

  test('view render in action body fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        action A {
          Text "x"
        }
      }
    `)
    expectHumanMessagesContain(report, validationMessages.actionBody)
  })

  test('view render in inline action expression body fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui Btn T text, A action { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        Btn "x", action {
          Text "bad"
        }
      }
    `)
    expectHumanMessagesContain(report, validationMessages.actionBody)
  })

  test('state update in inline action expression is allowed (same as named action body)', async () => {
    await parseTaoFully(`
      ui B T text, A action { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        state S = 0
        B "b", action { set S = 1 }
      }
    `)
  })

  test('state update in action body is allowed (not in view body)', async () => {
    await parseTaoFully(`
      ui V {
        render inject \`\`\`ts return null \`\`\`
        state S = 1
        action A {
          set S = 2
        }
      }
    `)
  })

  test('app declaration in view body fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui V {
        render inject \`\`\`ts return null \`\`\`
        ui X { render inject \`\`\`ts return null \`\`\` }
        app A { ui X }
      }
    `)
    expectHumanMessagesContain(report, validationMessages.viewBody)
  })

  test('action render (do …) inside an action body is allowed', async () => {
    await parseTaoFully(`
      action LogEvent M text { }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        action Outer {
          do LogEvent "submitted"
        }
      }
    `)
  })

  test('action render (do …) at file level fails validation', async () => {
    const report = await parseASTWithErrors(`
      action A { }
      do A
    `)
    expectHumanMessagesContain(report, validationMessages.topLevel)
  })

  test('action render (do …) in a view body fails validation', async () => {
    const report = await parseASTWithErrors(`
      action A { }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        do A
      }
    `)
    expectHumanMessagesContain(report, validationMessages.viewBody)
  })

  test('action render targeting a view declaration fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui SomeView { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        action Outer {
          do SomeView
        }
      }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m =>
        (m.includes("'do'") && m.includes('view'))
        || m.includes("Could not resolve reference to ActionDeclaration named 'SomeView'"),
    )
  })
})

describe('state update RHS edge cases (parse + validate):', () => {
  test('set file-level state from file-level alias (=)', async () => {
    await parseTaoFully(`
      state A = 10
      alias B = 20
      ui V {
        render inject \`\`\`ts return null \`\`\`
        action CopyAliasToState {
          set A = B
        }
      }
    `)
  })

  test('set file-level state from another file-level state with expression', async () => {
    await parseTaoFully(`
      state A = 1
      state B = 2
      ui V {
        render inject \`\`\`ts return null \`\`\`
        action Combine {
          set B = A + 3
        }
      }
    `)
  })

  test('set view state from file-level state and alias in expression', async () => {
    await parseTaoFully(`
      state FileN = 100
      alias Offset = 7
      ui V {
        render inject \`\`\`ts return null \`\`\`
        state LocalN = 0
        action InitFromFileAndAlias {
          set LocalN = FileN + Offset
        }
      }
    `)
  })

  test('set file-level state from view state (=)', async () => {
    await parseTaoFully(`
      state FileS = 0
      ui V {
        render inject \`\`\`ts return null \`\`\`
        state LocalS = 5
        action PushUp {
          set FileS = LocalS
        }
      }
    `)
  })

  test('set with += using another state on RHS', async () => {
    await parseTaoFully(`
      state Base = 3
      state Acc = 10
      ui V {
        render inject \`\`\`ts return null \`\`\`
        action AddBase {
          set Acc += Base
        }
      }
    `)
  })

  test('unary minus in RHS expression', async () => {
    await parseTaoFully(`
      state A = 5
      state B = 0
      ui V {
        render inject \`\`\`ts return null \`\`\`
        action T {
          set B = -A + 10
        }
      }
    `)
  })
})

describe('parameter declaration validation:', () => {
  test('duplicate parameter names in a view parameter list fail validation', async () => {
    const report = await parseASTWithErrors(`
      ui V X text, X text {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    expectDuplicateIdentifier(report, 'X')
  })

  test('duplicate parameter names in an action parameter list fail validation', async () => {
    const report = await parseASTWithErrors(`
      ui V {
        render inject \`\`\`ts return null \`\`\`
        action A X text, X text {
          inject \`\`\`ts void 0 \`\`\`
        }
      }
    `)
    expectDuplicateIdentifier(report, 'X')
  })

  test('parameter name same as nested view declaration in body fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui V X text {
        render inject \`\`\`ts return null \`\`\`
        ui X {
          render inject \`\`\`ts return null \`\`\`
        }
      }
    `)
    expectDuplicateIdentifier(report, 'X')
  })

  test('distinct parameter names in one view validate', async () => {
    await parseTaoFully(`
      ui V A text, B text {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
  })

  test('shorthand parameter resolves local type declarations', async () => {
    await parseTaoFully(`
      type Title is text
      ui V Title { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('shorthand parameter reports imported-type hint for non-local types', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/workspace/types.tao',
        code: `
          share type Person is text
        `,
      },
      {
        path: '/workspace/main.tao',
        code: `
          use Person from ./types
          ui V Person { render inject \`\`\`ts return null \`\`\` }
        `,
      },
    ])
    expectHumanMessagesContain(
      result.getErrors(),
      "Parameter shorthand 'Person'",
      'including imported types',
    )
  })
})

describe('objects and nested state updates:', () => {
  test('object state and nested set validate', async () => {
    await parseTaoFully(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        state Pet = { name "c", age 1 }
        action Bump {
          set Pet.age = Pet.age + 1
        }
      }
    `)
  })

  test('duplicate object property names fail validation', async () => {
    const report = await parseASTWithErrors(`
      ui V {
        render inject \`\`\`ts return null \`\`\`
        alias O = { x 1, x 2 }
      }
    `)
    expectHumanMessagesContain(report, "Duplicate object property 'x'")
  })

  test('set on alias target fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui V {
        render inject \`\`\`ts return null \`\`\`
        alias A = 1
        action B {
          set A = 2
        }
      }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("'set' can only target a state binding") && m.includes('alias'),
    )
  })

  test('set on view parameter fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui V N number {
        render inject \`\`\`ts return null \`\`\`
        action A {
          set N = 1
        }
      }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("'set' can only target a state binding") && m.includes('parameter'),
    )
  })

  test('object alias, member access, string concat, and deep set path validate', async () => {
    await parseTaoFully(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        alias Foo = { bar "bar", baz "baz" }
        state Cat = { name "cat", age 1, human { name "Ro", age 40 } }
        action Rename { set Cat.name = "dog" }
        action AgeHuman { set Cat.human.age = Cat.human.age + 1 }
        Text "Cat \${Cat.name} in \${Cat.human.name}, age \${Cat.human.age} with \${Foo.bar}" { }
        Text Foo.baz { }
      }
    `)
  })

  test('set with parenthesized expression receiver does not parse (member access must start with a name)', async () => {
    const report = await parseASTWithErrors(`
      ui V {
        render inject \`\`\`ts return null \`\`\`
        state S = { a 1 }
        action A { set (1 + 2).x = 1 }
      }
    `)
    expectHasHumanErrors(report)
  })

  test('set with object literal receiver does not parse (member access must start with a name)', async () => {
    const report = await parseASTWithErrors(`
      ui V {
        render inject \`\`\`ts return null \`\`\`
        state S = 1
        action A { set { a 1 }.a = 2 }
      }
    `)
    expectHasHumanErrors(report)
  })

  test('Text value with object-shaped alias fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        alias O = { x 1 }
        Text O
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('Text value with object-shaped state fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        state Cat = { name "cat" }
        Text Cat
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('string literal plus object-shaped alias fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        alias O = { x 1 }
        Text "a" + O
      }
    `)
    expectHumanMessagesContain(report, validationMessages.objectNotAllowedInPlusOperator)
  })

  test('object-shaped alias on left of + (non-string right) fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        alias O = { x 1 }
        alias N = 2
        Text O + N
      }
    `)
    expectHumanMessagesContain(report, validationMessages.objectNotAllowedInPlusOperator)
  })

  test('object-shaped alias on right of + (non-string left) fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        alias O = { x 1 }
        alias N = 2
        Text N + O
      }
    `)
    expectHumanMessagesContain(report, validationMessages.objectNotAllowedInPlusOperator)
  })

  test('object-shaped value on a non-Text view render argument fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Foo X text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        alias O = { a 1 }
        Foo O
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('member access to unknown property on state object fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        state Cat = { name "cat" }
        Text Cat.missing { }
      }
    `)
    expectHumanMessagesContain(report, "Property 'missing' does not exist")
  })

  test('member access to unknown property on alias object fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        alias O = { a 1 }
        Text O.b { }
      }
    `)
    expectHumanMessagesContain(report, "Property 'b' does not exist")
  })

  test('member access on scalar alias fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        alias A = 1
        Text A.x { }
      }
    `)
    expectHumanMessagesContain(report, "Cannot access property 'x'")
  })

  test('member access on scalar state fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        state S = 1
        Text S.x { }
      }
    `)
    expectHumanMessagesContain(report, "Cannot access property 'x'")
  })

  test('deep member access descending into scalar field fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        state Cat = { name "cat", age 1 }
        Text Cat.age.nope { }
      }
    `)
    expectHumanMessagesContain(report, "Cannot access property 'nope'")
  })

  test('set target on unknown nested property fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui V {
        state Cat = { name "cat", human { name "Ro" } }
        action A { set Cat.human.missing = "x" }
      }
    `)
    expectHumanMessagesContain(report, "Property 'missing' does not exist")
  })

  test('set target on scalar state with .prop fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui V {
        state S = 1
        action A { set S.x = 2 }
      }
    `)
    expectHumanMessagesContain(report, "Cannot access property 'x'")
  })

  test('set target descending through a scalar mid-segment fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui V {
        state S = { a 1 }
        action A { set S.a.b = 2 }
      }
    `)
    expectHumanMessagesContain(report, "Cannot access property 'b'")
  })

  test('member access to missing terminal segment on a nested object fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        alias O = { a { b 1 } }
        Text O.a.missing { }
      }
    `)
    expectHumanMessagesContain(report, "Property 'missing' does not exist")
  })
})

describe('struct/item type validation:', () => {
  test('flat struct type declaration validates cleanly', async () => {
    await parseTaoFully(`
      type Person is { Name text, Age number }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('typed struct literal with all fields validates cleanly', async () => {
    await parseTaoFully(`
      type Person is { Name text, Age number }
      alias Ro = Person { Name "Ro", Age 40 }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('typed struct literal with extra field fails validation', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Age number }
      alias Bad = Person { Name "Ro", Age 40, Extra "oops" }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("Field 'Extra'") && m.includes("type 'Person'"),
    )
  })

  test('typed struct literal missing a field fails validation', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Age number }
      alias Bad = Person { Name "Ro" }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("Missing field 'Age'") && m.includes("type 'Person'"),
    )
  })

  test('typed struct literal with wrong field shape (object where primitive expected) fails validation', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Age number }
      alias Bad = Person { Name "Ro", Age { Inner 1 } }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("Field 'Person.Age'") && m.includes('number literal'),
    )
  })

  test('nested typed struct literal with unknown inner field fails validation', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Job { Title text } }
      alias Bad = Person { Name "Ro", Job { Wrong "x" } }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("Field 'Wrong'") && m.includes("type 'Person.Job'"),
    )
  })

  test('nested typed struct literal missing inner field fails validation', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Job { Title text, Salary number } }
      alias Bad = Person { Name "Ro", Job { Title "Builder" } }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("Missing field 'Salary'") && m.includes("type 'Person.Job'"),
    )
  })

  test('nested typed struct literal with wrong inner field shape (object where primitive expected) fails validation', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Job { Title text } }
      alias Bad = Person { Name "Ro", Job { Title { Nope 1 } } }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("Field 'Person.Job.Title'") && m.includes('text literal'),
    )
  })

  test('typed struct literal with primitive value where struct expected fails validation', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text }
      alias Bad = Person "hello"
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes('Person') && m.includes('struct literal'))
  })

  test('struct type declaration with duplicate field name fails validation', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Name number }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, "Duplicate struct field 'Name'")
  })

  test('struct field with lowercase name fails validation', async () => {
    const report = await parseASTWithErrors(`
      type Person is { name text }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes("'name'") && m.includes('uppercase'))
  })

  test('member access on typed struct alias resolves declared field', async () => {
    await parseTaoFully(`
      type Person is { Name text, Age number }
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        alias Ro = Person { Name "Ro", Age 40 }
        Text Ro.Name
      }
    `)
  })

  test('member access on typed struct alias with unknown field fails validation', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Age number }
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        alias Ro = Person { Name "Ro", Age 40 }
        Text Ro.Missing
      }
    `)
    expectHumanMessagesContain(report, "Property 'Missing'")
  })

  test('nested type reference Person.Job validates against declared nested struct', async () => {
    await parseTaoFully(`
      type Person is { Name text, Job { Title text } }
      ui ShowJob J Person.Job { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('nested type reference to missing nested type fails validation', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text }
      ui ShowJob J Person.Missing { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes('Person') && m.includes('Missing'))
  })

  test('member access on struct-typed parameter rejects unknown field', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Age number }
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui Profile P Person {
        render inject \`\`\`ts return null \`\`\`
        Text P.Missing
      }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("Field 'Missing'") && m.includes("type 'Person'"),
    )
  })

  test('member access on Person.Job parameter rejects unknown nested field', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Job { Title text } }
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui ShowJob J Person.Job {
        render inject \`\`\`ts return null \`\`\`
        Text J.NotAField
      }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("Field 'NotAField'") && m.includes("type 'Person.Job'"),
    )
  })

  test('member access on primitive-typed parameter rejects any property', async () => {
    const report = await parseASTWithErrors(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui Line N number {
        render inject \`\`\`ts return null \`\`\`
        Text N.Too
      }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes('Too') && m.includes('not an object'))
  })

  test('unresolved view ref does not spuriously report object-in-view-arg for struct literal', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Age number }
      ui Show P Person { render inject \`\`\`ts return null \`\`\` }
      ui V {
        MissingView Person { Name "Ro", Age 40 }
      }
    `)
    expectNoHumanMessageContains(report, 'Object-shaped values')
    expectHasHumanErrors(report)
  })

  test('struct literal argument to struct-typed parameter does not spuriously report object-in-view-arg', async () => {
    await parseTaoFully(`
      type Person is { Name text, Age number }
      ui Show P Person { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        Show Person { Name "Ro", Age 40 }
      }
    `)
  })
})

describe('compile errors:', () => {
  test('missing view reference in app ui produces linking error with expected message', async () => {
    const multi = await parseMultipleFiles([
      {
        path: '/project/app.tao',
        code: `app CompileErrorApp {
    ui MissingView
}
`,
      },
    ])

    const errorReport = multi.getErrors()
    expectHasHumanErrors(errorReport)
    expectSomeHumanMessageSatisfies(
      errorReport,
      msg => msg.includes('MissingView') && msg.includes('Could not resolve reference'),
    )
  })
})

describe('local parameter types validation:', () => {
  test('localSuperType param does not trigger shorthand-not-a-type error', async () => {
    await parseTaoFully(`
      ui Badge Title is text {
        render inject \`\`\`ts void 0 \`\`\`
      }
    `)
  })

  test('view with both localSuperType and explicit params validates', async () => {
    await parseTaoFully(`
      ui Card Title is text, Size number {
        render inject \`\`\`ts void 0 \`\`\`
      }
    `)
  })
})

describe('dot-local type ref validation (Phase 2):', () => {
  test('Badge .Title "x" passes validation', async () => {
    await parseTaoFully(`
      ui Badge Title is text {
        render inject \`\`\`ts void 0 \`\`\`
      }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
        Badge .Title "x"
      }
    `)
  })

  test('.Title outside argument context errors', async () => {
    const report = await parseASTWithErrors(`
      ui Badge Title is text { render inject \`\`\`ts return null \`\`\` }
      alias X = .Title "x"
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("'.Title'") && m.includes('argument position'),
    )
  })

  test('.Subtitle errors when callee has no such local type', async () => {
    const report = await parseASTWithErrors(`
      ui Badge Title is text { render inject \`\`\`ts return null \`\`\` }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
        Badge .Subtitle "x"
      }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes("'.Subtitle'") && m.includes('Badge'))
  })

  test('.Subtitle errors even if global Subtitle type exists (no fallback)', async () => {
    const report = await parseASTWithErrors(`
      type Subtitle is text
      ui Badge Title is text { render inject \`\`\`ts return null \`\`\` }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
        Badge .Subtitle "x"
      }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes("'.Subtitle'") && m.includes('Badge'))
  })

  test('.Person struct literal validates fields', async () => {
    await parseTaoFully(`
      type PersonData is { Name text }
      ui Profile Person is PersonData {
        render inject \`\`\`ts void 0 \`\`\`
      }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
        Profile .Person { Name "Ro" }
      }
    `)
  })

  test('.Person struct literal rejects unknown field', async () => {
    const report = await parseASTWithErrors(`
      type PersonData is { Name text }
      ui Profile Person is PersonData { render inject \`\`\`ts return null \`\`\` }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
        Profile .Person { Name "Ro", Age 30 }
      }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes('Age') && m.includes('does not exist'))
  })

  test('.Person struct literal rejects missing field', async () => {
    const report = await parseASTWithErrors(`
      type PersonData is { Name text, Age number }
      ui Profile Person is PersonData { render inject \`\`\`ts return null \`\`\` }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
        Profile .Person { Name "Ro" }
      }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes('Age') && m.includes('Missing'))
  })

  test('Badge .Title "x" does not emit ambiguity warning', async () => {
    await parseTaoFully(`
      type Title is text
      ui Badge Title is text {
        render inject \`\`\`ts void 0 \`\`\`
      }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
        Badge .Title "x"
      }
    `)
  })

  test('ambiguity warning mentions .Title for bare constructors', async () => {
    const report = await parseASTWithErrors(`
      type Title is text
      ui Badge Title is text { render inject \`\`\`ts return null \`\`\` }
      ui Root {
        Badge Title "x"
      }
    `)
    const warnings = report.diagnostics.filter(d => d.severity === 2)
    expect(warnings.some(d => d.message.includes("'.Title'") && d.message.includes('Badge.Title'))).toBe(true)
  })
})

describe('action local parameter types (Phase 3):', () => {
  test('action with localSuperType param does not trigger shorthand-not-a-type error', async () => {
    await parseTaoFully(`
      action Bump Step is number {
        inject \`\`\`ts void 0 \`\`\`
      }
    `)
  })

  test('do Bump .Step 3 passes validation', async () => {
    await parseTaoFully(`
      state Counter = 0
      action Bump Step is number {
        set Counter += Step
      }
      action Use {
        do Bump .Step 3
      }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('.Amount errors when action callee has no such local type', async () => {
    const report = await parseASTWithErrors(`
      action Bump Step is number { }
      action Use {
        do Bump .Amount 3
      }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes("'.Amount'") && m.includes('Bump'))
  })

  test('.Step outside argument context still errors', async () => {
    const report = await parseASTWithErrors(`
      action Bump Step is number { }
      alias X = .Step 3
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("'.Step'") && m.includes('argument position'),
    )
  })

  test('ambiguity warning for bare constructor in action call', async () => {
    const report = await parseASTWithErrors(`
      type Step is number
      action Bump Step is number { }
      action Use {
        do Bump Step 3
      }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    const warnings = report.diagnostics.filter(d => d.severity === 2)
    expect(warnings.some(d => d.message.includes("'.Step'") && d.message.includes('Bump.Step'))).toBe(true)
  })

  test('no ambiguity warning for explicit .Step and Bump.Step in action call', async () => {
    await parseTaoFully(`
      type Step is number
      state Counter = 0
      action Bump Step is number {
        set Counter += Step
      }
      action Use {
        do Bump .Step 3
        do Bump Bump.Step 4
      }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('qualified outside-argument: alias S = Bump.Step 3 validates without dot-context errors', async () => {
    await parseTaoFully(`
      state Counter = 0
      action Bump Step is number {
        set Counter += Step
      }
      alias S = Bump.Step 3
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('no global fallback for .Amount when global Amount exists on action callee', async () => {
    const report = await parseASTWithErrors(`
      type Amount is number
      action Bump Step is number { }
      action Use {
        do Bump .Amount 3
      }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes("'.Amount'") && m.includes('Bump'))
  })

  test('all three call forms pass validation', async () => {
    await parseTaoFully(`
      state Counter = 0
      action Bump Step is number {
        set Counter += Step
      }
      action Use {
        do Bump Step 1
        do Bump Bump.Step 2
        do Bump .Step 3
      }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('view and action with same name triggers duplicate identifier error (callee identity guardrail)', async () => {
    const report = await parseASTWithErrors(`
      ui Bump Step is text { render inject \`\`\`ts return null \`\`\` }
      action Bump Step is number { }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes('Duplicate') && m.includes('Bump'))
  })
})
