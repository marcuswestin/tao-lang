// TS Lazy collections
// Modified from https://github.com/WimJongeneel/ts-lazy-collections
// MIT Licensed: https://raw.githubusercontent.com/WimJongeneel/ts-lazy-collections/refs/heads/master/package.json
// From commit hash: https://github.com/WimJongeneel/ts-lazy-collections/commit/87d121860656fff570278bcca2afe269540f9c29

export type Stream<a> = { [__Stream_brand]: true } & {
  toArray: () => a[]
  filter: (p: (a: a) => boolean) => Stream<a>
  filterIs: <b extends a>(p: (a: a) => a is b) => Stream<b>
  map: <b>(f: (a: a) => b) => Stream<b>
  toIterable: () => Iterable<a>
}

export type Collection<a> = Iterable<a> | Generator<a, void, unknown> | Stream<a>

export const Stream = {
  fromArray: <a>(a: a[]) => fromIterator(from_array(a)),
  fromFunction: <a>(f: (i: number, last: a | undefined) => a) => fromIterator(from_function(f)),
  fromRange: (s: number, e?: number) => fromIterator(from_range(s, e)),
  fromIterator: <a>(itt: Iterator<a>) => fromIterator(itt),
  toIterable: <a>(itt: Collection<a>) => Iterable.from(itt),
}

export const Iterable = {
  from: <a>(itt: Collection<a>): Iterable<a> => isStream(itt) ? itt.toIterable() : itt,
}

// Implementations
//////////////////

const __Stream_brand = Symbol('__Stream_brand')

function fromIterator<a>(itt: Iterator<a>): Stream<a> {
  return {
    [__Stream_brand]: true,
    toArray: () => to_array(itt),
    filter: (p: (a: a) => boolean) => fromIterator(filter(itt, p)),
    filterIs: <b extends a>(p: (a: a) => a is b) => fromIterator(filter(itt, p)) as Stream<b>,
    map: <b>(f: (a: a) => b) => fromIterator(map(itt, f)),
    toIterable: () => to_iterable(itt),
  }
}

function isStream<a>(itt: Collection<a>): itt is Stream<a> {
  return typeof itt === 'object' && itt !== null && __Stream_brand in itt
}

function to_iterable<a>(a: Iterator<a>): Iterable<a> {
  return {
    [Symbol.iterator]: () => a,
  }
}

function* map<a, b>(a: Iterator<a>, f: (a: a) => b) {
  let value = a.next()
  while (value.done == false) {
    yield f(value.value)
    value = a.next()
  }
}

function* filter<a>(a: Iterator<a>, p: (a: a) => boolean) {
  let current = a.next()
  while (current.done == false) {
    if (p(current.value)) {
      yield current.value
    }
    current = a.next()
  }
}

function* from_range(s: number, e?: number) {
  let v = s
  while (e == undefined || v < e) {
    v++
    yield v
  }
}

function* from_function<a>(f: (i: number, last: a | undefined) => a) {
  let i = 0
  let v = undefined
  while (true) {
    const next = f(i, v)
    yield next
    i++
    v = next
  }
}

function* from_array<a>(a: a[]) {
  for (const v of a) {
    yield v
  }
}

function to_array<a>(a: Iterator<a>) {
  let result: a[] = []
  let current = a.next()
  while (current.done == false) {
    result.push(current.value)
    current = a.next()
  }
  return result
}
