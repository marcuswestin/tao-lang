import { describe, expect, test } from 'bun:test'

// The IDE-extension esbuild bundle copies this file under `_gen-ide-extension/`; that copy lacks
// the React dependency `MemoryTaoData` imports, so we skip the whole describe block when discovered
// from that path. The standard `./agent test` run is unaffected.
const isInIdeExtensionBundle = import.meta.url.includes('/_gen-ide-extension/')

describe.skipIf(isInIdeExtensionBundle)('MemoryTaoData query projection:', () => {
  test('relationship identity predicates compare to-one and to-many rows by unique field', async () => {
    const { MemoryTaoData } = await import('./in-memory')
    const data = new MemoryTaoData()
    data.declareDataset({
      entities: {
        events: { Title: { type: 'string' }, Host: { type: 'any' }, Attendees: { type: 'any' } },
      },
      links: {},
    })
    data.open({})
    data.insert('events', {
      id: 'event-1',
      Title: 'Hosted by Ro',
      Host: { id: 'person-1', Email: 'ro@example.test', Name: 'Ro' },
      Attendees: [{ id: 'person-2', Email: 'friend@example.test' }],
    })
    data.insert('events', {
      id: 'event-2',
      Title: 'Attended by Ro',
      Host: { id: 'person-3', Email: 'host@example.test', Name: 'Host' },
      Attendees: [
        { id: 'person-1', Email: 'ro@example.test' },
        { id: 'person-4', Email: 'other@example.test' },
      ],
    })
    data.insert('events', {
      id: 'event-3',
      Title: 'Unrelated',
      Host: { id: 'person-5', Email: 'other-host@example.test', Name: 'Other' },
      Attendees: [{ id: 'person-6', Email: 'other-attendee@example.test' }],
    })

    const currentUser: Record<string, unknown> = {}
    Object.defineProperty(currentUser, 'id', { value: 'person-1', enumerable: false })
    const hostedResult = data.peekQuery({
      schema: 'Data',
      collection: 'events',
      cardinality: 'many',
      where: [{ path: ['Host'], op: '=', value: currentUser, compareField: 'id', clientOnly: true }],
      select: [{ path: ['Title'] }],
    })
    const attendedResult = data.peekQuery({
      schema: 'Data',
      collection: 'events',
      cardinality: 'many',
      where: [{ path: ['Attendees'], op: '=', value: currentUser, compareField: 'id', clientOnly: true }],
      select: [{ path: ['Title'] }],
    })
    const notAttendedResult = data.peekQuery({
      schema: 'Data',
      collection: 'events',
      cardinality: 'many',
      where: [{ path: ['Attendees'], op: '!=', value: currentUser, compareField: 'id', clientOnly: true }],
      select: [{ path: ['Title'] }],
    })
    const uniqueEmailResult = data.peekQuery({
      schema: 'Data',
      collection: 'events',
      cardinality: 'many',
      where: [{ path: ['Host'], op: '=', value: { Email: 'ro@example.test' }, compareField: 'Email' }],
      select: [{ path: ['Title'] }],
    })

    expect(rowTitles(hostedResult.data)).toEqual(['Hosted by Ro'])
    expect(rowTitles(attendedResult.data)).toEqual(['Attended by Ro'])
    expect(rowTitles(notAttendedResult.data)).toEqual(['Hosted by Ro', 'Unrelated'])
    expect(rowTitles(uniqueEmailResult.data)).toEqual(['Hosted by Ro'])
  })

  test('relationship projection keeps only explicitly selected linked fields', async () => {
    const { MemoryTaoData } = await import('./in-memory')
    const data = new MemoryTaoData()
    data.declareDataset({
      entities: {
        users: { Name: { type: 'string' }, Todos: { type: 'any' } },
      },
      links: {},
    })
    data.open({})
    data.insert('users', {
      id: 'user-1',
      Name: 'Ro',
      Todos: [{
        id: 'todo-1',
        Description: 'Ship queries',
        Tags: [{
          id: 'tag-1',
          Name: 'Work',
          Tasks: [{ id: 'other-task', Description: 'Nested task' }],
        }],
        Task: {
          id: 'task-1',
          Title: 'Implementation',
          Tags: [{ id: 'nested-tag', Name: 'Nested' }],
        },
      }],
    })

    const result = data.peekQuery({
      schema: 'Data',
      collection: 'users',
      cardinality: 'many',
      where: [],
      select: [{
        path: ['Todos'],
        where: [],
        select: [
          { path: ['Description'] },
          { path: ['Tags'], where: [], select: [{ path: ['Name'] }] },
          { path: ['Task'], where: [], select: [{ path: ['Title'] }] },
        ],
      }],
    })

    const rows = result.data as Record<string, unknown>[]
    expect(rows[0]).toBeDefined()
    const todo = (rows[0]!['Todos'] as Record<string, unknown>[])[0]!
    const tag = (todo['Tags'] as Record<string, unknown>[])[0]!
    const task = todo['Task'] as Record<string, unknown>

    expect(Object.keys(todo).sort()).toEqual(['Description', 'Tags', 'Task'])
    expect(Object.keys(tag)).toEqual(['Name'])
    expect(Object.keys(task)).toEqual(['Title'])
    expect(Reflect.get(todo, 'id')).toBe('todo-1')
    expect(Object.keys(todo)).not.toContain('id')
  })
})

function rowTitles(data: unknown): string[] {
  return (data as Record<string, unknown>[]).map(row => row['Title'] as string)
}
