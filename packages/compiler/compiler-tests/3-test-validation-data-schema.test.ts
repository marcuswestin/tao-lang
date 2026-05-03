import { dataSchemaValidationMessages, forCreateMessages } from '@compiler/validation/data'
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
      view Root { }
    `)
    expectHumanMessagesContain(report, validationMessages.duplicateAppProvider)
  })

  test('unknown app provider fails validation', async () => {
    const report = await parseASTWithErrors(`
      app MyApp {
        provider AcmeDb { url "x" }
        ui Root
      }
      view Root { }
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
      view MyView { }
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
      view V {
        create D.Item { N "x" }
      }
      app A { ui V }
    `)
    expectHumanMessagesContain(report, 'Only view/alias/state/action/inject statements are allowed in a view body.')
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
      view V { Text "x" }
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
      view V {
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
      view V {
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
      view V {
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
      view V { }
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
      view V { }
    `)
    expectHumanMessagesContain(report, validationMessages.legacyIDBInjection)
  })
})
