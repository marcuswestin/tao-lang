import {
  expectDuplicateIdentifier,
  expectHumanMessagesContain,
  expectSomeHumanMessageSatisfies,
  expectTypeAssignabilityError,
} from './test-utils/diagnostics'
import {
  describe,
  expect,
  parseASTWithErrors,
  parseMultipleFiles,
  parseTaoFully,
  test,
} from './test-utils/test-harness'

describe('type checking — Stage 0 (Typir wiring):', () => {
  test('Typir services are reachable from the workspace', async () => {
    const multi = await parseMultipleFiles([
      {
        path: '/project/app.tao',
        code: `app StageZeroApp { ui V }\nview V { }\n`,
      },
    ])
    const typir = multi.workspace.getTypir()
    expect(typir).toBeDefined()
    expect(typir.Inference).toBeDefined()
    expect(typir.validation?.Collector).toBeDefined()
    expect(typir.factory).toBeDefined()
  })

  test('trivial document builds and validates with Typir wired', async () => {
    await parseTaoFully(`
      app StageZeroApp { ui V }
      view V { }
    `)
  })
})

describe('type checking — type declarations:', () => {
  test('type X is text parses and validates cleanly', async () => {
    await parseTaoFully(`
      type FirstName is text
      view V { }
    `)
  })

  test('type X is number parses and validates cleanly', async () => {
    await parseTaoFully(`
      type Age is number
      view V { }
    `)
  })

  test('type X is view parses and validates cleanly', async () => {
    await parseTaoFully(`
      type Slot is view
      view V { }
    `)
  })

  test('duplicate type name fails validation', async () => {
    const report = await parseASTWithErrors(`
      type FirstName is text
      type FirstName is number
      view V { }
    `)
    expectDuplicateIdentifier(report, 'FirstName')
  })
})

describe('type checking — typed literals:', () => {
  test('typed literal alias matches underlying primitive (text)', async () => {
    await parseTaoFully(`
      type Greeting is text
      alias Msg = Greeting "Hi"
      view V { }
    `)
  })

  test('typed literal alias matches underlying primitive (number)', async () => {
    await parseTaoFully(`
      type Age is number
      alias N = Age 40
      view V { }
    `)
  })

  test('typed literal rejects wrong primitive literal', async () => {
    const report = await parseASTWithErrors(`
      type Greeting is text
      alias Msg = Greeting 42
      view V { }
    `)
    const messages = report.getHumanErrorMessages()
    expect(messages.some(m => m.includes('not assignable') || m.includes('number'))).toBe(true)
  })

  test('bare literal alias validates without nominal promotion', async () => {
    await parseTaoFully(`
      alias Width = 30
      view V { }
    `)
  })
})

describe('type checking — view argument assignability:', () => {
  test('text argument accepts string literal', async () => {
    await parseTaoFully(`
      view B T text { }
      view V {
        B "hello"
      }
    `)
  })

  test('text argument rejects number literal', async () => {
    const report = await parseASTWithErrors(`
      view B T text { }
      view V {
        B 42
      }
    `)
    const messages = report.getHumanErrorMessages()
    expect(messages.some(m => m.includes('does not match any unbound parameter'))).toBe(true)
  })

  test('action argument accepts action declaration reference', async () => {
    await parseTaoFully(`
      view B T text, A action { }
      action H { }
      view V {
        B "x", H
      }
    `)
  })

  test('action argument rejects number literal', async () => {
    const report = await parseASTWithErrors(`
      view B A action { }
      view V {
        B 42
      }
    `)
    const messages = report.getHumanErrorMessages()
    expect(messages.some(m => m.includes('does not match any unbound parameter'))).toBe(true)
  })

  test('action argument rejects string literal', async () => {
    const report = await parseASTWithErrors(`
      view B A action { }
      view V {
        B "nope"
      }
    `)
    const messages = report.getHumanErrorMessages()
    expect(messages.some(m => m.includes('does not match any unbound parameter'))).toBe(true)
  })

  test('view parameter accepts bare view reference', async () => {
    await parseTaoFully(`
      view Panel B view { }
      view Child { }
      view V {
        Panel Child
      }
    `)
  })

  test('view parameter rejects string literal', async () => {
    const report = await parseASTWithErrors(`
      view Panel B view { }
      view V {
        Panel "nope"
      }
    `)
    const messages = report.getHumanErrorMessages()
    expect(messages.some(m => m.includes('does not match any unbound parameter'))).toBe(true)
  })

  test('view parameter rejects action reference', async () => {
    const report = await parseASTWithErrors(`
      view Panel B view { }
      action H { }
      view V {
        Panel H
      }
    `)
    const messages = report.getHumanErrorMessages()
    expect(messages.some(m => m.includes('does not match any unbound parameter'))).toBe(true)
  })
})

describe('type checking — operators and string templates:', () => {
  test('text + text and number + number validate', async () => {
    await parseTaoFully(`
      alias A = "a" + "b"
      alias N = 1 + 2
      view V { }
    `)
  })

  test('text + number fails type checking', async () => {
    const report = await parseASTWithErrors(`
      alias Bad = "x" + 1
      view V { }
    `)
    expectHumanMessagesContain(report, '+')
  })

  test('text repetition requires text on the left and number on the right', async () => {
    await parseTaoFully(`
      alias Repeated = "ha" * 3
      view V { }
    `)

    const report = await parseASTWithErrors(`
      alias Bad = 3 * "ha"
      view V { }
    `)
    expectHumanMessagesContain(report, '*')
  })

  test('string template interpolation accepts number operand', async () => {
    await parseTaoFully(['state N = 1', 'alias S = "v ${N}"', 'view V { }'].join('\n'))
  })

  test('string template interpolation accepts boolean-typed parameter', async () => {
    // Boolean-typed view parameters are the only source of boolean values in Tao today (no `true`/`false` literal
    // syntax). This pins down the `boolean` branch of the interpolation allow-list so a future refactor of
    // `isDisplayablePrimitive` can't silently drop boolean support.
    await parseTaoFully(['view V Flag boolean {', '  alias S = "v=${Flag}"', '}'].join('\n'))
  })

  test('string template interpolation rejects action operand', async () => {
    const report = await parseASTWithErrors(
      ['action H { }', 'alias S = "x ${action { }}"', 'view V { }'].join('\n'),
    )
    expectHumanMessagesContain(report, 'interpolation')
  })

  test('string template interpolation rejects bare action name reference', async () => {
    const report = await parseASTWithErrors(['action H { }', 'alias S = "x ${H}"', 'view V { }'].join('\n'))
    expectHumanMessagesContain(report, 'interpolation')
  })

  test('unary minus requires number operand', async () => {
    const report = await parseASTWithErrors(`
      alias Bad = -"x"
      view V { }
    `)
    expectHumanMessagesContain(report, 'Unary')
  })

  test('typed literal rejects interpolation (must be constant literal)', async () => {
    // `FirstName "${x}"` would be a computed string, not a literal, which violates the nominal-literal contract of
    // `TypedLiteralExpression`. The validator rejects any template with at least one interpolation segment.
    const report = await parseASTWithErrors(
      ['type FirstName is text', 'state N = 1', 'alias Bad = FirstName "Hi ${N}"', 'view V { }'].join('\n'),
    )
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes('Typed literal') && m.includes('interpolation'),
    )
  })
})

describe('type checking — struct/item types:', () => {
  test('struct type declaration registers as a nominal Typir type', async () => {
    await parseTaoFully(`
      type Person is { Name text, Age number }
      view V { }
    `)
  })

  test('typed struct literal infers as the declared struct type', async () => {
    await parseTaoFully(`
      type Person is { Name text, Age number }
      alias Ro = Person { Name "Ro", Age 40 }
      view V { }
    `)
  })

  test('view parameter typed by a struct accepts a typed struct literal argument', async () => {
    await parseTaoFully(`
      type Person is { Name text, Age number }
      view Show P Person { }
      view V {
        Show Person { Name "Ro", Age 40 }
      }
    `)
  })

  test('view parameter typed by a struct rejects a primitive argument', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Age number }
      view Show P Person { }
      view V {
        Show "nope"
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('view parameter typed by a struct rejects a different nominal struct argument', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Age number }
      type Pet is { Name text, Age number }
      view ShowPerson P Person { }
      view V {
        ShowPerson Pet { Name "Cat", Age 4 }
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('member access on struct-typed alias yields the declared field type', async () => {
    await parseTaoFully(`
      type Person is { Name text, Age number }
      view Text Value text { }
      view V {
        alias Ro = Person { Name "Ro", Age 40 }
        Text Ro.Name
      }
    `)
  })

  test('member access on struct-typed parameter yields the declared field type', async () => {
    await parseTaoFully(`
      type Person is { Name text, Age number }
      view Profile P Person {
        alias Display = "${'$'}{P.Name}"
      }
      view V { }
    `)
  })

  test('member access on nested type parameter Person.Job yields the declared leaf field type', async () => {
    await parseTaoFully(`
      type Job is { Title text }
      type Person is { Name text, Job Job }
      view Text Value text { }
      view ShowJob J Person.Job {
        Text J.Title
      }
      view V {
        ShowJob Job { Title "Builder" }
      }
    `)
  })

  test('segmented type ref Person.Buddy where Buddy is the same nominal resolves without spurious errors', async () => {
    await parseTaoFully(`
      type Person is { Name text, Buddy Person }
      view ShowBuddy B Person.Buddy { }
      view V { }
    `)
  })

  test('member access on Person.Job parameter rejects unknown nested field', async () => {
    const report = await parseASTWithErrors(`
      type Job is { Title text }
      type Person is { Name text, Job Job }
      view Text Value text { }
      view ShowJob J Person.Job {
        Text J.WrongName
      }
      view V {
        ShowJob Job { Title "Builder" }
      }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m => m.includes("Field 'WrongName'") && m.includes("type 'Person.Job'"),
    )
  })

  test('member access on Person.Job parameter rejects field-type mismatch in view argument', async () => {
    const report = await parseASTWithErrors(`
      type Job is { Title text }
      type Person is { Name text, Job Job }
      view ShowNumber Value number { }
      view ShowJob J Person.Job {
        ShowNumber J.Title
      }
      view V {
        ShowJob Job { Title "Builder" }
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('member access on struct-typed alias rejects field-type mismatch in view argument', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Age number }
      view ShowText Value text { }
      view V {
        alias Ro = Person { Name "Ro", Age 40 }
        ShowText Ro.Age
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('struct type declared then used through a parameter renders without errors', async () => {
    await parseTaoFully(`
      type Person is { Name text }
      view Text Value text { }
      view Profile P Person {
        Text P.Name
      }
      view V {
        Profile Person { Name "Ro" }
      }
    `)
  })
})

describe('type checking — argument binding (views):', () => {
  test('arguments matched by type validate', async () => {
    await parseTaoFully(`
      view Btn T text, A action { }
      action H { }
      view V {
        Btn "Go", H
      }
    `)
  })

  test('argument order is independent when types are distinct', async () => {
    await parseTaoFully(`
      view Btn T text, A action { }
      action H { }
      view V {
        Btn H, "Go"
      }
    `)
  })

  test('argument with wrong type is rejected', async () => {
    const report = await parseASTWithErrors(`
      view Btn T text { }
      view V {
        Btn 42
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('two same-type params with nominal-typed arguments validate', async () => {
    await parseTaoFully(`
      type Left is text
      type Right is text
      view Pair Left, Right { }
      view V {
        Pair Left "L", Right "R"
      }
    `)
  })

  test('nominal type argument matching wrong parameter is rejected', async () => {
    const report = await parseASTWithErrors(`
      type Left is text
      type Right is text
      view Pair Left, Right { }
      view V {
        Pair Left "L", Left "R"
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('arity mismatch — missing argument — is reported', async () => {
    const report = await parseASTWithErrors(`
      view Btn T text, A action { }
      view V {
        Btn "Go"
      }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes('Missing argument') && m.includes('A'))
  })

  test('arity mismatch — extra argument — is reported', async () => {
    const report = await parseASTWithErrors(`
      view Btn T text { }
      action H { }
      view V {
        Btn "Go", H
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('extra argument of same type is rejected', async () => {
    const report = await parseASTWithErrors(`
      view Btn T text { }
      view V {
        Btn "A", "B"
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })
})

describe('type checking — argument binding (actions):', () => {
  test('bare argument binds by type when callee has a unique-typed parameter', async () => {
    await parseTaoFully(`
      action BumpAction Step number { }
      action Outer {
        do BumpAction -1
      }
    `)
  })

  test("bare reference argument binds by type via the alias's value type", async () => {
    await parseTaoFully(`
      action BumpAction Step number { }
      action Outer {
        alias TwoDown = -2
        do BumpAction TwoDown
      }
    `)
  })

  test('argument with no matching parameter type fails (number param, text value)', async () => {
    const report = await parseASTWithErrors(`
      action BumpAction Step number { }
      action Outer {
        do BumpAction "hi"
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('ambiguous argument under collision (two params of the same type) is a hard error', async () => {
    const report = await parseASTWithErrors(`
      action LogPair First text, Second text { }
      action Outer {
        do LogPair "a"
      }
    `)
    expectHumanMessagesContain(report, 'matches multiple unbound parameters')
  })

  test('do <Action> with type-matched arguments validates when types are distinct', async () => {
    await parseTaoFully(`
      action LogEvent M text, L number { }
      action Outer {
        do LogEvent "submitted", 1
      }
    `)
  })

  test('do <Action> accepts permuted argument order when types are distinct', async () => {
    await parseTaoFully(`
      action LogEvent M text, L number { }
      action Outer {
        do LogEvent 1, "submitted"
      }
    `)
  })

  test('do <Action> rejects argument whose type does not match any parameter', async () => {
    const report = await parseASTWithErrors(`
      action LogEvent M text, L number { }
      action H { }
      action Outer {
        do LogEvent "x", H
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('do <Action> reports type mismatch on resolved binding', async () => {
    const report = await parseASTWithErrors(`
      action LogEvent M text { }
      action Outer {
        do LogEvent 42
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('do referencing a non-action declaration is rejected', async () => {
    const report = await parseASTWithErrors(`
      view SomeView { }
      action Outer {
        do SomeView
      }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes('do') && m.includes('action'))
  })

  test('do <Action> reports missing argument', async () => {
    const report = await parseASTWithErrors(`
      action LogEvent M text, L number { }
      action Outer {
        do LogEvent "x"
      }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes('Missing argument') && m.includes('L'))
  })
})

describe('type checking — uppercase name enforcement:', () => {
  test('lowercase alias name fails validation', async () => {
    const report = await parseASTWithErrors(`
      alias foo = 1
      view V { }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes("'foo'") && m.includes('uppercase'))
  })

  test('lowercase view name fails validation', async () => {
    const report = await parseASTWithErrors(`
      view myView { }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes("'myView'") && m.includes('uppercase'))
  })

  test('lowercase parameter name fails validation', async () => {
    const report = await parseASTWithErrors(`
      view V name text { }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes("'name'") && m.includes('uppercase'))
  })

  test('uppercase names pass validation', async () => {
    await parseTaoFully(`
      view V Name text { }
    `)
  })
})

describe('type checking — local parameter types (Phase 1):', () => {
  test('bare constructor in argument context resolves to callee-local type', async () => {
    await parseTaoFully(`
      view Text Value text {
        inject \`\`\`ts return null \`\`\`
      }
      view Badge Title is text {
        Text Title
      }
      view Root {
        Badge Title "hello"
      }
    `)
  })

  test('two views with same-named local types do not cross-resolve', async () => {
    await parseTaoFully(`
      view Text Value text {
        inject \`\`\`ts return null \`\`\`
      }
      view Badge Title is text {
        Text Title
      }
      view OtherBadge Title is text {
        Text Title
      }
      view Root {
        Badge Title "a"
        OtherBadge Title "b"
      }
    `)
  })

  test('local type in body references parameter value', async () => {
    await parseTaoFully(`
      view Text Value text {
        inject \`\`\`ts return null \`\`\`
      }
      view Badge Title is text {
        Text Title
      }
    `)
  })

  test('wrong value type for local param is rejected', async () => {
    const report = await parseASTWithErrors(`
      view Badge Title is text { }
      view Root {
        Badge Title 42
      }
    `)
    expectTypeAssignabilityError(report)
  })
})

describe('type checking — dot-local parameter types (Phase 2):', () => {
  test('dot-local `.Title "x"` resolves and type-checks', async () => {
    await parseTaoFully(`
      view Text Value text {
        inject \`\`\`ts return null \`\`\`
      }
      view Badge Title is text {
        Text Title
      }
      view Root {
        Badge .Title "hello"
      }
    `)
  })

  test('wrong value type for dot-local param is rejected', async () => {
    const report = await parseASTWithErrors(`
      view Badge Title is text { }
      view Root {
        Badge .Title 123
      }
    `)
    expectTypeAssignabilityError(report)
  })

  test('dot-local struct-based `.Person { Name "Ro" }` type-checks', async () => {
    await parseTaoFully(`
      type PersonData is { Name text }
      view Profile Person is PersonData {
        inject \`\`\`ts void 0 \`\`\`
      }
      view Root {
        Profile .Person { Name "Ro" }
      }
    `)
  })

  test('qualified struct-based `Profile.Person { Name "Ro" }` type-checks', async () => {
    await parseTaoFully(`
      type PersonData is { Name text }
      view Profile Person is PersonData {
        inject \`\`\`ts void 0 \`\`\`
      }
      view Root {
        Profile Profile.Person { Name "Ro" }
      }
    `)
  })
})

describe('type checking — action local parameter types (Phase 3):', () => {
  test('all three call forms type-check for action local params', async () => {
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
      view V { }
    `)
  })

  test('wrong value type for action dot-local param is rejected', async () => {
    const report = await parseASTWithErrors(`
      action Bump Step is number { }
      action Use {
        do Bump .Step "x"
      }
      view V { }
    `)
    expectTypeAssignabilityError(report)
  })

  test('qualified outside-argument alias S = Bump.Step 3 has type Bump.Step', async () => {
    await parseTaoFully(`
      state Counter = 0
      action Bump Step is number {
        set Counter += Step
      }
      alias S = Bump.Step 3
      view V { }
    `)
  })
})
