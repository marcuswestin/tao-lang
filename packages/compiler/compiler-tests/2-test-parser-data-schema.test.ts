import { defined, describe, expect, parseAST, parseTaoFully, test } from './test-utils/test-harness'

describe('parse — data schema:', () => {
  test('parses minimal data block', async () => {
    const doc = await parseAST(`
      data MyData { }
    `)
    const dataDecl = doc.statements.first.as_DataDeclaration
    dataDecl.expect('name').toBe('MyData')
    expect(dataDecl.dataStatements.length).toBe(0)
  })

  test('parses app provider with arbitrary properties', async () => {
    const doc = await parseAST(`
      app MyApp {
        provider InstantDB { appId "test-app" }
        ui RootView
      }
      ui RootView { render inject \`\`\`ts return null \`\`\` }
    `)
    doc.statements.first.as_AppDeclaration.appStatements[0].as_AppProviderStatement.match({
      provider: 'InstantDB',
      properties: [{ name: 'appId' }],
    })
  })

  test('parses data-scoped type declaration', async () => {
    const doc = await parseAST(`
      data MyData {
        type Status is text
      }
    `)
    doc.statements.first.as_DataDeclaration.dataStatements[0].as_DataTypeDeclaration.expect('name').toBe('Status')
  })

  test('parses entity with typed fields', async () => {
    const doc = await parseAST(`
      data MyData {
        Events Event {
          Title text,
          Ordering number indexed,
        }
      }
    `)
    doc.statements.first.as_DataDeclaration.dataStatements[0].as_DataEntityDeclaration.match({
      pluralName: 'Events',
      name: 'Event',
      fields: [
        { name: 'Title', type: { primitiveType: 'text' } },
        { name: 'Ordering', type: { primitiveType: 'number' } },
      ],
    })
  })

  test('parses shorthand fields (name equals type)', async () => {
    const doc = await parseAST(`
      data MyData {
        Events Event { Title text }
        Rsvps Rsvp {
          Event,
        }
      }
    `)
    const field = doc.statements.first.as_DataDeclaration.dataStatements[1].as_DataEntityDeclaration.fields[0]
    field.expect('name').toBe('Event')
    expect(field.unwrap().type).toBeUndefined()
  })

  test('parses to-many [Entity] fields', async () => {
    const doc = await parseAST(`
      data MyData {
        Events Event { Title text }
        People Person {
          Events [Event],
        }
      }
    `)
    doc.statements.first.as_DataDeclaration.dataStatements[1].as_DataEntityDeclaration.fields[0].match({
      name: 'Events',
      type: { arrayRef: defined },
    })
  })

  test('parses field metadata: optional, unique, indexed, default', async () => {
    const doc = await parseAST(`
      data MyData {
        People Person {
          Email text optional unique,
          Ordering number indexed,
          Status text default "active",
        }
      }
    `)
    doc.statements.first.as_DataDeclaration.dataStatements[0].as_DataEntityDeclaration.fields.match([
      { name: 'Email', metadata: [{ kind: 'optional' }, { kind: 'unique' }] },
      { name: 'Ordering', metadata: [{ kind: 'indexed' }] },
      { name: 'Status', metadata: [{ kind: 'default', value: defined }] },
    ])
  })

  test('parses full data block (target app shape)', async () => {
    const doc = await parseAST(`
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
    const dataDecl = doc.statements.first.as_DataDeclaration
    dataDecl.expect('name').toBe('MeetupData')
    expect(dataDecl.dataStatements.length).toBe(4)
  })

  test('parses data block alongside app and view', async () => {
    const doc = await parseTaoFully(`
      data MyData {
        People Person { Name text }
      }
      app MyApp { ui RootView }
      ui RootView { render inject \`\`\`ts return null \`\`\` }
    `)
    expect(doc.statements.length).toBe(3)
    void doc.statements[0].as_DataDeclaration
    void doc.statements[1].as_AppDeclaration
    void doc.statements[2].as_ViewDeclaration
  })

  test('parses entity with empty field list', async () => {
    const doc = await parseAST(`
      data MyData {
        Items Item { }
      }
    `)
    doc.statements.first.as_DataDeclaration.dataStatements[0].as_DataEntityDeclaration.fields.match([])
  })

  test('parses entity with named ref field type', async () => {
    const doc = await parseAST(`
      data MyData {
        People Person { Name text }
        Events Event {
          Host Person,
        }
      }
    `)
    doc.statements.first.as_DataDeclaration.dataStatements[1].as_DataEntityDeclaration.fields[0].match({
      type: { namedRef: defined },
    })
  })

  test('parses for statement and create in action', async () => {
    const doc = await parseAST(`
      data D {
        Items Item { N text }
      }
      query D.Items as Rows { N }
      action Add {
        create D.Item { N "a" }
      }
      ui V {
        render inject \`\`\`ts return null \`\`\`
        for It in Rows {
          Text "x"
        }
      }
    `)
    const view = doc.statements.last.as_ViewDeclaration
    const forStmt = view.block.statements[1].as_ForStatement
    forStmt.expect('name').toBe('It')
    const add = doc.statements[2].as_ActionDeclaration
    const create = add.block.statements[0].as_CreateStatement
    create.fields[0].match({ field: 'N' })
  })

  test('parses selection-block query sources, default aliases, predicates, and nested selections', async () => {
    const doc = await parseAST(`
      data D {
        Households Household { Name text }
        People Person {
          Age number,
          Status text,
          Email text,
          Household Household,
        }
      }
      query D.People {
        Age >= 18,
        Email,
        Household { Name },
      }
      query D.Person as CurrentPerson {
        Email = "a@b.test",
      }
      query D.People as Everyone
    `)
    const collectionQuery = doc.statements[1].as_QueryDeclaration
    collectionQuery.expect('name').toBeUndefined()
    collectionQuery.target.expect('pluralName').toBe('People')
    collectionQuery.selection.entries.match([
      { path: { segments: ['Age'] }, op: '>=' },
      { path: { segments: ['Email'] } },
      { path: { segments: ['Household'] }, selection: defined },
    ])

    const oneQuery = doc.statements[2].as_QueryDeclaration
    oneQuery.expect('name').toBe('CurrentPerson')
    oneQuery.target.expect('name').toBe('Person')

    const defaultQuery = doc.statements[3].as_QueryDeclaration
    defaultQuery.expect('name').toBe('Everyone')
    expect(defaultQuery.unwrap().selection).toBeUndefined()
  })
})
