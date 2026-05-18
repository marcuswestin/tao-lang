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
      ui Root { }
    `)
    expectHumanMessagesContain(report, validationMessages.duplicateAppProvider)
  })

  test('unknown app provider fails validation', async () => {
    const report = await parseASTWithErrors(`
      app MyApp {
        provider AcmeDb { url "x" }
        ui Root
      }
      ui Root { }
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
      ui MyView { }
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
      query D get Item as Rows
      ui V {
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
      query D get Item as Rows
      action X {
        for I in Rows { }
      }
      app A { ui V }
      ui V { Text "x" }
    `)
    expectHumanMessagesContain(
      report,
      'Only state/action/inject and set (state update) statements are allowed in an action body.',
    )
  })

  test('for over first-query alias fails', async () => {
    const report = await parseASTWithErrors(`
      data D {
        Items Item { N text }
      }
      query D get first Item as One
      app A { ui V }
      ui V {
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
      query D get Item as Rows
      app A { ui V }
      ui V {
        for X in Rows {
          query D get Item as Inner
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
      query D get Item as Rows
      app A { ui V }
      ui V {
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
      ui V { }
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
      ui V { }
    `)
    expectHumanMessagesContain(report, validationMessages.legacyIDBInjection)
  })
})

describe('validation — V1 data queries:', () => {
  test('get one with unique equality passes validation', async () => {
    await parseTaoFully(`
      data D {
        People Person {
          Email text unique,
          Name text,
        }
      }
      query D get one Person
        > where Email = "ro@example.test"
      app A { ui V }
      ui V { }
    `)
  })

  test('get one with id equality passes validation', async () => {
    await parseTaoFully(`
      data D {
        People Person {
          Email text,
          Name text,
        }
      }
      query D get one Person
        > where id = "00000000-0000-0000-0000-000000000001"
      app A { ui V }
      ui V { }
    `)
  })

  test('get one without id or unique equality fails validation', async () => {
    const report = await parseASTWithErrors(`
      data D {
        People Person {
          Email text,
          Name text,
        }
      }
      query D get one Person
        > where Name = "Ro"
      app A { ui V }
      ui V { }
    `)
    expectHumanMessagesContain(report, queryValidationMessages.queryOneNeedsUniqueWhere)
  })

  test('get one does not accept unique equality hidden behind or', async () => {
    const report = await parseASTWithErrors(`
      data D {
        People Person {
          Email text unique,
          Name text,
        }
      }
      query D get one Person
        > where Email = "ro@example.test" or Name = "Ro"
      app A { ui V }
      ui V { }
    `)
    expectHumanMessagesContain(report, queryValidationMessages.queryOneNeedsUniqueWhere)
  })

  test('nested relationship path requires include', async () => {
    const report = await parseASTWithErrors(`
      data D {
        People Person { Name text }
        Events Event { Host Person }
      }
      query D for Events
        > where Host.Name = "Ro"
      app A { ui V }
      ui V { }
    `)
    expectHumanMessagesContain(
      report,
      queryValidationMessages.queryNestedRelationshipNeedsInclude('Host.Name', 'Host'),
    )
  })

  test('nested relationship path with include passes validation', async () => {
    await parseTaoFully(`
      data D {
        People Person { Name text }
        Events Event { Host Person }
      }
      query D for Events
        > include Host
        > where Host.Name = "Ro"
      app A { ui V }
      ui V { }
    `)
  })

  test('direct relationship identity predicate does not require include', async () => {
    await parseTaoFully(`
      data D {
        People Person { Name text }
        Events Event { Host Person }
      }
      query D get first Person as CurrentUser
      query D for Events
        > where Host is CurrentUser
      app A { ui V }
      ui V { }
    `)
  })
})
