# Semantic Types

Sketch of some semantic types that could be in the Tao standard library.

## Time

```tao
type Nanoseconds is Duration
type Milliseconds is Duration
type Seconds is Duration
type Minutes is Duration
type Hours is Duration

type Duration is number with {
  ns: Nanosecond Duration // Base unit of Duration is a nanosecond
  ms: Millisecond Duration.ns / 1,000,000 // 1 millisecond = 1,000,000 nanoseconds
  sec: Second Duration.ms / 1,000
  min: Minute Duration.sec / 60
  hr: Hour Duration.min / 60
  day: Day Duration.hr / 24
  days: Day Duration.day
}
```

## Random Values

To create a random value of any given type you use the `random` keyword. You can also specify conditions for the generated value:

```tao
alias MaybeTrue = random boolean
alias SecretCode = random string with length [8, 16]
alias PositiveNumber = random number with value >= 0
alias PositiveFloat = random float number with value >= 0
```
