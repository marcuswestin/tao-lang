import { dataSchemaValidationMessages, forCreateMessages, queryValidationMessages } from '@compiler/validation/data'
import { validationMessages } from '@compiler/validation/tao-lang-validator'
import { expectHumanMessagesContain } from './test-utils/diagnostics'
import { describe, parseASTWithErrors, parseTaoFully, test } from './test-utils/test-harness'

describe('validation — app provider:', () => {
  test('duplicate app provider fails validation', async () => {
    const report = await parseASTWithErrors(`
      app MyApp {
        provider Memory { }
        provider InstantDB { appId "test" }
        ui Root
      }
      ui Root { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, validationMessages.duplicateAppProvider)
  })

  test('unknown app provider fails validation', async () => {
    const report = await parseASTWithErrors(`
      app MyApp {
        provider AcmeDb { url "x" }
        ui Root
      }
      ui Root { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, validationMessages.unknownAppDataProvider('AcmeDb'))
  })
})

describe('validation — data schema:', () => {
  test('valid data block passes validation', async () => {
    await parseTaoFully(`
      data MyData {
        type Status is text
        People Person {
          Name text,
          Email text optional unique,
        }
        Events Event {
          Title text,
          Host Person,
        }
      }
    `)
  })

  test('valid data block with shorthand fields passes validation', async () => {
    await parseTaoFully(`
      data MyData {
        People Person { Name text }
        Events Event { Title text }
        Rsvps Rsvp {
          Event,
          Person,
        }
      }
    `)
  })

  test('valid data block with to-many fields passes validation', async () => {
    await parseTaoFully(`
      data MyData {
        People Person {
          Name text,
          Events [Event],
        }
        Events Event {
          Title text,
        }
      }
    `)
  })

  test('duplicate entity name fails validation', async () => {
    const report = await parseASTWithErrors(`
      data MyData {
        People Person { Name text }
        Items Person { Title text }
      }
    `)
    expectHumanMessagesContain(report, dataSchemaValidationMessages.duplicateEntityName('Person'))
  })

  test('duplicate entity plural name fails validation', async () => {
    const report = await parseASTWithErrors(`
      data MyData {
        People Person { Name text }
        People Item { Title text }
      }
    `)
    expectHumanMessagesContain(report, dataSchemaValidationMessages.duplicateEntityPluralName('People'))
  })

  test('duplicate field name fails validation', async () => {
    const report = await parseASTWithErrors(`
      data MyData {
        People Person {
          Name text,
          Name number,
        }
      }
    `)
    expectHumanMessagesContain(report, dataSchemaValidationMessages.duplicateFieldName('Person', 'Name'))
  })

  test('shorthand field not matching entity fails validation', async () => {
    const report = await parseASTWithErrors(`
      data MyData {
        People Person { Name text }
        Rsvps Rsvp {
          Unknown,
        }
      }
    `)
    expectHumanMessagesContain(report, dataSchemaValidationMessages.shorthandFieldNotAnEntity('Unknown'))
  })

  test('data block at file level alongside app/view passes', async () => {
    await parseTaoFully(`
      data MyData {
        People Person { Name text }
      }
      app MyApp { ui MyView }
      ui MyView { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('full target app data block passes validation', async () => {
    await parseTaoFully(`
      data MeetupData {
        type Status is text
        People Person {
          Name text,
          Email text optional unique,
          Events [Event],
          Rsvps [Rsvp],
        }
        Events Event {
          Title text,
          Host Person,
          Ordering number,
          Rsvps [Rsvp],
        }
        Rsvps Rsvp {
          Event,
          Person,
          Status default "going",
        }
      }
    `)
  })
})

describe('validation — for / create:', () => {
  test('create in view body fails', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Items Item { N text }
      }
      query D.Items as Rows { N }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        create D.Item { N "x" }
      }
      app A { ui V }
    `)
    expectHumanMessagesContain(
      report,
      'Only ui/frame/layout/alias/state/action/inject statements are allowed in a UI body.',
    )
  })

  test('for in action body fails', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Items Item { N text }
      }
      query D.Items as Rows { N }
      action X {
        for I in Rows { }
      }
      app A { ui V }
      ui V { render Text "x" }
    `)
    expectHumanMessagesContain(
      report,
      'Only state/action/inject and set (state update) statements are allowed in an action body.',
    )
  })

  test('for over singular query alias fails', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Items Item { N text }
      }
      query D.Item as One { id = "item-1", N }
      app A { ui V }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        for X in One { Text "x" }
      }
    `)
    expectHumanMessagesContain(report, forCreateMessages.forCollectionNotListQuery)
  })

  test('query nested inside for body fails', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Items Item { N text }
      }
      query D.Items as Rows { N }
      app A { ui V }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        for X in Rows {
          query D.Items as Inner { N }
          Text "x"
        }
      }
    `)
    expectHumanMessagesContain(report, forCreateMessages.forBodyNoQuery)
  })

  test('guard nested inside for body fails', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Items Item { N text }
      }
      query D.Items as Rows { N }
      app A { ui V }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        for X in Rows {
          guard { Text "loading" }
          Text "x"
        }
      }
    `)
    expectHumanMessagesContain(report, forCreateMessages.forBodyNoGuard)
  })

  test('create with unknown field fails', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Items Item { N text }
      }
      action X {
        create D.Item { Unknown "a" }
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, forCreateMessages.createUnknownField('Unknown'))
  })

  test('legacy IDB reference in injected TypeScript fails', async () => {
    const report = await parseASTWithErrors(`
      action X {
        inject raw \`\`\`ts
        IDB.initFromRegisteredSchemas()
        \`\`\`
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, validationMessages.legacyIDBInjection)
  })

  test('strict row-handle update passes for scalar and single-link fields', async () => {
    await parseTaoFully(`
      data D {
        Events Event { Title text }
        Rsvps Rsvp {
          Status text,
          Event,
        }
      }
      action MarkGoing Rsvp, Event {
        update Rsvp {
          Status "going",
          Event Event
        }
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('strict row-handle update passes inside inline action bodies', async () => {
    await parseTaoFully(`
      data D {
        Rsvps Rsvp { Status text }
      }
      query D.Rsvps as Rsvps { Status }
      app A { ui V }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        for Rsvp in Rsvps {
          Button "Mark", action {
            update Rsvp {
              Status "going"
            }
          }
        }
      }
      ui Button Title text, Action action {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
  })

  test('update target must be a row handle', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Rsvps Rsvp { Status text }
      }
      alias RsvpAlias = "not a row"
      action X {
        update RsvpAlias { Status "going" }
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, forCreateMessages.updateTargetMustBeRowHandle)
  })

  test('update rejects plural query aliases and explicitly typed scalar parameters', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Rsvps Rsvp { Status text }
      }
      query D.Rsvps as AllRsvps { Status }
      action X Rsvp text {
        update AllRsvps { Status "going" }
        update Rsvp { Status "going" }
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(
      report,
      forCreateMessages.updateTargetMustBeRowHandle,
      forCreateMessages.updateTargetMustBeRowHandle,
    )
  })

  test('update validates fields and deferred relationship replacements', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Tags Tag { Name text }
        Rsvps Rsvp {
          Status text,
          Tags [Tag],
        }
      }
      action X Rsvp {
        update Rsvp {
          Unknown "x",
          Tags Tags
        }
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(
      report,
      forCreateMessages.updateUnknownField('Unknown'),
      forCreateMessages.updateToManyRelationshipDeferred('Tags'),
    )
  })

  test('date fields reject direct assignment literals', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Events Event { StartsAt date }
      }
      action X Event {
        update Event {
          StartsAt 123
        }
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, forCreateMessages.dateFieldLiteralUnsupported('StartsAt'))
  })
})

describe('validation — selection-block data queries:', () => {
  test('singular query with unique equality passes validation', async () => {
    await parseTaoFully(`
      data D {
        People Person {
          Email text unique,
          Name text,
        }
      }
      query D.Person {
        Email = "ro@example.test",
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('singular query with optional unique equality passes validation', async () => {
    await parseTaoFully(`
      data D {
        People Person {
          Email text optional unique,
          Name text,
        }
      }
      query D.Person {
        Email = "ro@example.test",
        Name,
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('singular query with id equality passes validation', async () => {
    await parseTaoFully(`
      data D {
        People Person {
          Email text,
          Name text,
        }
      }
      query D.Person {
        id = "00000000-0000-0000-0000-000000000001",
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('singular query without id or unique equality fails validation', async () => {
    const report = await parseASTWithErrors(`
      data D {
        People Person {
          Email text,
          Name text,
        }
      }
      query D.Person {
        Name = "Ro",
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, queryValidationMessages.queryOneNeedsUniqueWhere)
  })

  test('singular query without a selection block fails validation', async () => {
    const report = await parseASTWithErrors(`
      data D {
        People Person {
          Email text unique,
          Name text,
        }
      }
      query D.Person as CurrentPerson
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, queryValidationMessages.queryOneNeedsUniqueWhere)
  })

  test('singular query requires equality on the unique field', async () => {
    const report = await parseASTWithErrors(`
      data D {
        People Person {
          Email text unique,
          Name text,
        }
      }
      query D.Person {
        Email != "ro@example.test",
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, queryValidationMessages.queryOneNeedsUniqueWhere)
  })

  test('nested relationship path requires a selection block', async () => {
    const report = await parseASTWithErrors(`
      data D {
        People Person { Name text }
        Events Event { Title text, Host Person }
      }
      query D.Events {
        Host.Name = "Ro",
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(
      report,
      queryValidationMessages.queryNestedRelationshipPath('Host.Name'),
    )
  })

  test('nested relationship block with predicate passes validation', async () => {
    await parseTaoFully(`
      data D {
        People Person { Name text }
        Events Event { Title text, Host Person }
      }
      query D.Events {
        Title,
        Host {
          Name = "Ro",
        },
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('bare relationship selection passes validation', async () => {
    await parseTaoFully(`
      data D {
        Tasks Task { Title text }
        People Person {
          Name text,
          Tasks [Task],
        }
      }
      query D.People {
        Name,
        Tasks,
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('duplicate bare relationship selection fails validation', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Tasks Task { Title text }
        People Person {
          Name text,
          Tasks [Task],
        }
      }
      query D.People {
        Tasks,
        Tasks,
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, queryValidationMessages.queryDuplicateProjection('Tasks'))
  })

  test('scalar predicate followed by bare projection of the same field is a duplicate', async () => {
    const report = await parseASTWithErrors(`
      data D {
        People Person {
          Email text unique,
          Name text,
        }
      }
      query D.Person {
        Email = "ro@example.test",
        Email,
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, queryValidationMessages.queryDuplicateProjection('Email'))
  })

  test('plural query without a selection block passes validation', async () => {
    await parseTaoFully(`
      data D {
        Tasks Task {
          Title text,
          Done boolean,
        }
      }
      query D.Tasks
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('direct relationship identity predicate does not require include', async () => {
    await parseTaoFully(`
      data D {
        People Person { Name text }
        Events Event { Title text, Host Person }
      }
      query D.Person as CurrentUser { id = "person-1" }
      query D.Events {
        Title,
        Host = CurrentUser,
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('where filters, existence predicates, and order by pass validation', async () => {
    await parseTaoFully(`
      data D {
        People Person { Name text }
        Events Event {
          Title text,
          Active boolean,
          StartsAt date indexed,
          Ordering number indexed,
          Host Person,
        }
      }
      query D.Person as CurrentUser { id = "person-1" }
      query D.Events {
        Title,
        StartsAt exists,
        where Active = true and (Title != "draft" or StartsAt missing)
        where Host = CurrentUser
        order by Ordering desc
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('predicate entries validate scalar literal types and date literals', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Events Event {
          Title text,
          StartsAt date,
          Active boolean,
        }
      }
      query D.Events {
        Title = 123,
        StartsAt = 123,
        Active = "yes",
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(
      report,
      queryValidationMessages.queryPredicateLiteralType('Title', 'text', 'number'),
      queryValidationMessages.queryDateLiteralUnsupported('StartsAt'),
      queryValidationMessages.queryPredicateLiteralType('Active', 'boolean', 'text'),
    )
  })

  test('singular query may use unique equality inside where', async () => {
    await parseTaoFully(`
      data D {
        People Person {
          Email text unique,
          Name text,
        }
      }
      query D.Person {
        Name,
        where Email = "ro@example.test"
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
  })

  test('singular query rejects unique equality hidden behind or', async () => {
    const report = await parseASTWithErrors(`
      data D {
        People Person {
          Email text unique,
          Name text,
        }
      }
      query D.Person {
        where Email = "a@example.test" or Email = "b@example.test"
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, queryValidationMessages.queryOneNeedsUniqueWhere)
  })

  test('where rejects bare boolean and relationship path traversal', async () => {
    const report = await parseASTWithErrors(`
      data D {
        People Person { Name text }
        Events Event {
          Active boolean,
          Host Person,
        }
      }
      query D.Events {
        where Active
        where Host.Name = "Ro"
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(
      report,
      queryValidationMessages.queryBareWherePredicate('Active'),
      queryValidationMessages.queryNestedRelationshipPath('Host.Name'),
    )
  })

  test('relationship predicate entries require matching row handles', async () => {
    const report = await parseASTWithErrors(`
      data D {
        People Person {
          Email text unique,
        }
        Events Event {
          Host Person,
          Title text,
        }
        Rsvps Rsvp {
          Status text,
        }
      }
      query D.Person as CurrentUser { Email = "ro@example.test" }
      query D.Rsvp as CurrentRsvp { id = "rsvp-1" }
      state HostId = "person-1"
      query D.Events as BadScalar {
        Host = HostId,
        Title,
      }
      query D.Events as BadEntity {
        Host = CurrentRsvp,
        Title,
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(
      report,
      queryValidationMessages.queryRelationshipPredicateValue('Host'),
      queryValidationMessages.queryRelationshipPredicateValueEntity('Host', 'Person', 'Rsvp'),
    )
  })

  test('query existence operators must be exists or missing', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Events Event { Title text }
      }
      query D.Events {
        Title maybe,
        where Title present
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(
      report,
      queryValidationMessages.queryUnknownExistenceOperator('maybe', 'Title'),
      queryValidationMessages.queryUnknownExistenceOperator('present', 'Title'),
    )
  })

  test('order by requires one indexed scalar field', async () => {
    const report = await parseASTWithErrors(`
      data D {
        People Person { Name text }
        Events Event {
          Title text,
          Host Person,
          Rank number indexed,
        }
      }
      query D.Events {
        Title,
        order by Title
        order by Host
      }
      app A { ui V }
      ui V { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(
      report,
      queryValidationMessages.queryOrderDuplicate,
      queryValidationMessages.queryOrderMustBeIndexed('Title'),
      queryValidationMessages.queryOrderMustBeScalar('Host'),
    )
  })
})
