import {
  expectAnyHumanMessageSubstring,
  expectDuplicateIdentifier,
  expectHumanMessagesContain,
  expectSomeHumanMessageSatisfies,
  expectTypeAssignabilityError,
} from './test-utils/diagnostics'
import {
  defined,
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
        code: `app StageZeroApp { ui V }\nui V { render inject \`\`\`ts return null \`\`\` }\n`,
      },
    ])
    const typir = multi.workspace.getTypir()
    expect(typir).toMatchObject({
      Inference: defined,
      factory: defined,
      validation: { Collector: defined },
    })
  })

  test('trivial document builds and validates with Typir wired', async () => {
    await parseTaoFully(`
      app StageZeroApp { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })
})

describe('type checking — type declarations:', () => {
  test('type X is text parses and validates cleanly', async () => {
    await parseTaoFully(`
      type FirstName is text
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('type X is number parses and validates cleanly', async () => {
    await parseTaoFully(`
      type Age is number
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('type X is view parses and validates cleanly', async () => {
    await parseTaoFully(`
      type Slot is view
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('duplicate type name fails validation', async () => {
    const report = await parseASTWithErrors(`
      type FirstName is text
      type FirstName is number
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectDuplicateIdentifier(report, 'FirstName')
  })
})

describe('type checking — typed literals:', () => {
  test('typed literal alias matches underlying primitive (text)', async () => {
    await parseTaoFully(`
      type Greeting is text
      alias Msg = Greeting "Hi"
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('typed literal alias matches underlying primitive (number)', async () => {
    await parseTaoFully(`
      type Age is number
      alias N = Age 40
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('typed literal rejects wrong primitive literal', async () => {
    const report = await parseASTWithErrors(`
      type Greeting is text
      alias Msg = Greeting 42
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectAnyHumanMessageSubstring(report, ['not assignable', 'number'])
  })

  test('bare literal alias validates without nominal promotion', async () => {
    await parseTaoFully(`
      alias Width = 30
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })
})

describe('type checking — view argument assignability:', () => {
  test('text argument accepts string literal', async () => {
    await parseTaoFully(`
      ui B T text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        B "hello"
      }
    `)
  })

  test('text argument rejects number literal', async () => {
    const report = await parseASTWithErrors(`
      ui B T text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        B 42
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('action argument accepts action declaration reference', async () => {
    await parseTaoFully(`
      ui B T text, A action { render inject \`\`\`ts return null \`\`\` }
      action H { }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        B "x", H
      }
    `)
  })

  test('action argument rejects number literal', async () => {
    const report = await parseASTWithErrors(`
      ui B A action { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        B 42
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('action argument rejects string literal', async () => {
    const report = await parseASTWithErrors(`
      ui B A action { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        B "nope"
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('view parameter accepts bare view reference', async () => {
    await parseTaoFully(`
      ui Panel B view { render inject \`\`\`ts return null \`\`\` }
      ui Child { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        Panel Child
      }
    `)
  })

  test('view parameter rejects string literal', async () => {
    const report = await parseASTWithErrors(`
      ui Panel B view { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        Panel "nope"
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('view parameter rejects action reference', async () => {
    const report = await parseASTWithErrors(`
      ui Panel B view { render inject \`\`\`ts return null \`\`\` }
      action H { }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        Panel H
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })
})

describe('type checking — operators and string templates:', () => {
  test('text + text and number + number validate', async () => {
    await parseTaoFully(`
      alias A = "a" + "b"
      alias N = 1 + 2
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('text + number fails type checking', async () => {
    const report = await parseASTWithErrors(`
      alias Bad = "x" + 1
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, '+')
  })

  test('text repetition requires text on the left and number on the right', async () => {
    await parseTaoFully(`
      alias Repeated = "ha" * 3
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)

    const report = await parseASTWithErrors(`
      alias Bad = 3 * "ha"
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, '*')
  })

  test('string template interpolation accepts number operand', async () => {
    await parseTaoFully(
      ['state N = 1', 'alias S = "v ${N}"', 'ui V { render inject ```ts return null ``` }'].join('\n'),
    )
  })

  test('string template interpolation accepts boolean-typed parameter', async () => {
    // Boolean-typed view parameters are the only source of boolean values in Tao today (no `true`/`false` literal
    // syntax). This pins down the `boolean` branch of the interpolation allow-list so a future refactor of
    // `isDisplayablePrimitive` can't silently drop boolean support.
    await parseTaoFully(
      ['ui V Flag boolean {', '  render inject ```ts return null ```', '  alias S = "v=${Flag}"', '}'].join('\n'),
    )
  })

  test('string template interpolation rejects action operand', async () => {
    const report = await parseASTWithErrors(
      ['action H { }', 'alias S = "x ${action { }}"', 'ui V { render inject ```ts return null ``` }'].join('\n'),
    )
    expectHumanMessagesContain(report, 'interpolation')
  })

  test('string template interpolation rejects bare action name reference', async () => {
    const report = await parseASTWithErrors(
      ['action H { }', 'alias S = "x ${H}"', 'ui V { render inject ```ts return null ``` }'].join('\n'),
    )
    expectHumanMessagesContain(report, 'interpolation')
  })

  test('unary minus requires number operand', async () => {
    const report = await parseASTWithErrors(`
      alias Bad = -"x"
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, 'Unary')
  })

  test('typed literal rejects interpolation (must be constant literal)', async () => {
    // `FirstName "${x}"` would be a computed string, not a literal, which violates the nominal-literal contract of
    // `TypedLiteralExpression`. The validator rejects any template with at least one interpolation segment.
    const report = await parseASTWithErrors(
      [
        'type FirstName is text',
        'state N = 1',
        'alias Bad = FirstName "Hi ${N}"',
        'ui V { render inject ```ts return null ``` }',
      ].join('\n'),
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
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('typed struct literal infers as the declared struct type', async () => {
    await parseTaoFully(`
      type Person is { Name text, Age number }
      alias Ro = Person { Name "Ro", Age 40 }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('view parameter typed by a struct accepts a typed struct literal argument', async () => {
    await parseTaoFully(`
      type Person is { Name text, Age number }
      ui Show P Person { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        Show Person { Name "Ro", Age 40 }
      }
    `)
  })

  test('view parameter typed by a struct rejects a primitive argument', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Age number }
      ui Show P Person { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        Show "nope"
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('view parameter typed by a struct rejects a different nominal struct argument', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Age number }
      type Pet is { Name text, Age number }
      ui ShowPerson P Person { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        ShowPerson Pet { Name "Cat", Age 4 }
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('member access on struct-typed alias yields the declared field type', async () => {
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

  test('member access on struct-typed parameter yields the declared field type', async () => {
    await parseTaoFully(`
      type Person is { Name text, Age number }
      ui Profile P Person {
        render inject \`\`\`ts return null \`\`\`
        alias Display = "${'$'}{P.Name}"
      }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('member access on nested type parameter Person.Job yields the declared leaf field type', async () => {
    await parseTaoFully(`
      type Job is { Title text }
      type Person is { Name text, Job Job }
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui ShowJob J Person.Job {
        render inject \`\`\`ts return null \`\`\`
        Text J.Title
      }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        ShowJob Job { Title "Builder" }
      }
    `)
  })

  test('segmented type ref Person.Buddy where Buddy is the same nominal resolves without spurious errors', async () => {
    await parseTaoFully(`
      type Person is { Name text, Buddy Person }
      ui ShowBuddy B Person.Buddy { render inject \`\`\`ts return null \`\`\` }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('member access on Person.Job parameter rejects unknown nested field', async () => {
    const report = await parseASTWithErrors(`
      type Job is { Title text }
      type Person is { Name text, Job Job }
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui ShowJob J Person.Job {
        render inject \`\`\`ts return null \`\`\`
        Text J.WrongName
      }
      ui V {
        render inject \`\`\`ts return null \`\`\`
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
      ui ShowNumber Value number { render inject \`\`\`ts return null \`\`\` }
      ui ShowJob J Person.Job {
        render inject \`\`\`ts return null \`\`\`
        ShowNumber J.Title
      }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        ShowJob Job { Title "Builder" }
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('member access on struct-typed alias rejects field-type mismatch in view argument', async () => {
    const report = await parseASTWithErrors(`
      type Person is { Name text, Age number }
      ui ShowText Value text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        alias Ro = Person { Name "Ro", Age 40 }
        ShowText Ro.Age
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('struct type declared then used through a parameter renders without errors', async () => {
    await parseTaoFully(`
      type Person is { Name text }
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui Profile P Person {
        render inject \`\`\`ts return null \`\`\`
        Text P.Name
      }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        Profile Person { Name "Ro" }
      }
    `)
  })
})

describe('type checking — argument binding (views):', () => {
  test('arguments matched by type validate', async () => {
    await parseTaoFully(`
      ui Btn T text, A action { render inject \`\`\`ts return null \`\`\` }
      action H { }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        Btn "Go", H
      }
    `)
  })

  test('argument order is independent when types are distinct', async () => {
    await parseTaoFully(`
      ui Btn T text, A action { render inject \`\`\`ts return null \`\`\` }
      action H { }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        Btn H, "Go"
      }
    `)
  })

  test('argument with wrong type is rejected', async () => {
    const report = await parseASTWithErrors(`
      ui Btn T text { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        Btn 42
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('two same-type params with nominal-typed arguments validate', async () => {
    await parseTaoFully(`
      type Left is text
      type Right is text
      ui Pair Left, Right { render inject \`\`\`ts return null \`\`\` }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        Pair Left "L", Right "R"
      }
    `)
  })

  test('nominal type argument matching wrong parameter is rejected', async () => {
    const report = await parseASTWithErrors(`
      type Left is text
      type Right is text
      ui Pair Left, Right { render inject \`\`\`ts return null \`\`\` }
      ui V {
        Pair Left "L", Left "R"
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('arity mismatch — missing argument — is reported', async () => {
    const report = await parseASTWithErrors(`
      ui Btn T text, A action { render inject \`\`\`ts return null \`\`\` }
      ui V {
        Btn "Go"
      }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes('Missing argument') && m.includes('A'))
  })

  test('arity mismatch — extra argument — is reported', async () => {
    const report = await parseASTWithErrors(`
      ui Btn T text { render inject \`\`\`ts return null \`\`\` }
      action H { }
      ui V {
        Btn "Go", H
      }
    `)
    expectHumanMessagesContain(report, 'does not match any unbound parameter')
  })

  test('extra argument of same type is rejected', async () => {
    const report = await parseASTWithErrors(`
      ui Btn T text { render inject \`\`\`ts return null \`\`\` }
      ui V {
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
      ui SomeView { render inject \`\`\`ts return null \`\`\` }
      action Outer {
        do SomeView
      }
    `)
    expectSomeHumanMessageSatisfies(
      report,
      m =>
        (m.includes('do') && m.includes('action'))
        || m.includes("Could not resolve reference to ActionDeclaration named 'SomeView'"),
    )
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
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes("'foo'") && m.includes('uppercase'))
  })

  test('lowercase view name fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui myView { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes("'myView'") && m.includes('uppercase'))
  })

  test('lowercase parameter name fails validation', async () => {
    const report = await parseASTWithErrors(`
      ui V name text { render inject \`\`\`ts return null \`\`\` }
    `)
    expectSomeHumanMessageSatisfies(report, m => m.includes("'name'") && m.includes('uppercase'))
  })

  test('uppercase names pass validation', async () => {
    await parseTaoFully(`
      ui V Name text { render inject \`\`\`ts return null \`\`\` }
    `)
  })
})

describe('type checking — local parameter types (Phase 1):', () => {
  test('bare constructor in argument context resolves to callee-local type', async () => {
    await parseTaoFully(`
      ui Text Value text {
        render inject \`\`\`ts return null \`\`\`
      }
      ui Badge Title is text {
        render inject \`\`\`ts return null \`\`\`
        Text Title
      }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
        Badge Title "hello"
      }
    `)
  })

  test('two views with same-named local types do not cross-resolve', async () => {
    await parseTaoFully(`
      ui Text Value text {
        render inject \`\`\`ts return null \`\`\`
      }
      ui Badge Title is text {
        render inject \`\`\`ts return null \`\`\`
        Text Title
      }
      ui OtherBadge Title is text {
        render inject \`\`\`ts return null \`\`\`
        Text Title
      }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
        Badge Title "a"
        OtherBadge Title "b"
      }
    `)
  })

  test('local type in body references parameter value', async () => {
    await parseTaoFully(`
      ui Text Value text {
        render inject \`\`\`ts return null \`\`\`
      }
      ui Badge Title is text {
        render inject \`\`\`ts return null \`\`\`
        Text Title
      }
    `)
  })

  test('wrong value type for local param is rejected', async () => {
    const report = await parseASTWithErrors(`
      ui Badge Title is text { render inject \`\`\`ts return null \`\`\` }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
        Badge Title 42
      }
    `)
    expectTypeAssignabilityError(report)
  })
})

describe('type checking — dot-local parameter types (Phase 2):', () => {
  test('dot-local `.Title "x"` resolves and type-checks', async () => {
    await parseTaoFully(`
      ui Text Value text {
        render inject \`\`\`ts return null \`\`\`
      }
      ui Badge Title is text {
        render inject \`\`\`ts return null \`\`\`
        Text Title
      }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
        Badge .Title "hello"
      }
    `)
  })

  test('wrong value type for dot-local param is rejected', async () => {
    const report = await parseASTWithErrors(`
      ui Badge Title is text { render inject \`\`\`ts return null \`\`\` }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
        Badge .Title 123
      }
    `)
    expectTypeAssignabilityError(report)
  })

  test('dot-local struct-based `.Person { Name "Ro" }` type-checks', async () => {
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

  test('qualified struct-based `Profile.Person { Name "Ro" }` type-checks', async () => {
    await parseTaoFully(`
      type PersonData is { Name text }
      ui Profile Person is PersonData {
        render inject \`\`\`ts void 0 \`\`\`
      }
      ui Root {
        render inject \`\`\`ts return null \`\`\`
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
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('wrong value type for action dot-local param is rejected', async () => {
    const report = await parseASTWithErrors(`
      action Bump Step is number { }
      action Use {
        do Bump .Step "x"
      }
      ui V { render inject \`\`\`ts return null \`\`\` }
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
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })
})
