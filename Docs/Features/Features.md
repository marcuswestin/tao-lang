# Tao Features

These are the main features that define what Tao is, and why it exists.

## DX Developer Experience

### Formatting, Linting, and Fixing

There is _one canonical way_ for any file to be formatted.

`tao fmt`

### Self-documenting Code

Generate documentation for the codebase, along with LLM summaries of what the code does.

`tao document`

## Misc

### Errors

- expected vs unexpected
- logging/reporting of
- capture app state for reproduction and debuggin

### Anonymous Usage stats

How is the app being used? Automatically collect anonymized usage information.

### Feature Flags

Ability to express and handle what feature flags exist, and to do when they are enabled or disabled.

## Async IO

### Network

- Detection and handling of offline, online, partial/degraded
- Simulating network conditions

### Data fetching, caching, and prefetching

- Retry logic
- Expected states: initializing/fetched+when, idle, error, loading, refreshing,

### Data mutations

- Retry logic

### Data events & responses

- Timeouts, Intervals, Data updated, Action/Ephemeral, Mutation/Actions status
