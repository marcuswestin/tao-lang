# Control Syntax And Statements Project Research

## Goal

Define Tao's control syntax and statement model clearly enough to support the next language implementation sprint.

This research replaces the earlier "Core Language Surface" label with a narrower and more useful project name: **Control Syntax And Statements**. The project covers control flow, statement categories, callable bodies, render/action/function boundaries, event flow, async/error flow, and expression-adjacent syntax that real app code needs.

The research should go wide first, then feed a smaller implementation plan. The MVP bias is toward what Still, Rooms, and other real apps need soonest: `if` / `else`, `when`, function returns, guard/check semantics, form and event flow, optional values, and clear call syntax.

## Current Context

Tao is a programming language for building native and web apps. Its first-class target is React Native and Expo, so UI statements must map to React Native/Expo behavior, a Tao-owned runtime helper, or an explicit validation/runtime error.

The current language already distinguishes major statement contexts:

- Top-level declarations and imports.
- View/render statements.
- Action statements.
- App-level statements.
- Query and data mutation statements.
- Expressions used inside declarations, properties, filters, updates, and arguments.

That context split is valuable and should survive this project. Tao should not drift into one universal "any statement anywhere" model. Render code, action code, and function/value code have different jobs and should be validated accordingly.

Existing repo work that informs this sprint:

- The syntax/semantics spec defines block-specific statements and records unresolved questions around functions, actions, property access, invocation syntax, and return behavior.
- The type-system execution plan sketches `when`, type narrowing, function returns, typed arguments, action types, and deferred guard/check ideas.
- Data schema and query design currently uses a minimal bare `guard { ... }` Suspense-like boundary.
- Error-handling notes explore guard/check behavior, boundary syntax, result-like models, `try` / `catch`, and `defer`.
- Interaction/event planning explores `on`, `does`, `emit`, typed payloads, lifecycle events, data/query events, time events, and app/platform events.
- The current grammar implements several statement families already, but not the full control model this research inventories.

## Control Syntax And Statements Inventory

### Existing Statement Surface

These are already present in the grammar or adjacent docs and should be treated as constraints when planning new syntax.

Top-level and declaration-like statements:

- `module`
- `use`
- `app`
- `navigator`
- `type`
- `data`
- `ui`
- `frame`
- `layout`
- `action`
- `variant`
- `alias`
- `state`
- query declarations
- injection/debug statements

View/render statements:

- element/render statements
- view render/invocation statements
- children splice statements
- `for Name in Collection { ... }`
- bare `guard { ... }`
- query declarations
- nested declarations where allowed
- assignment/block declarations used as local view setup

Action statements:

- `set Target = Value`
- `set Target += Value`
- `set Target -= Value`
- `set Target *= Value`
- `set Target /= Value`
- `do Action ...`
- navigation actions such as push/pop/tab
- create/update data mutation statements
- local declarations where allowed
- injection/debug statements

App-level statements:

- UI root wiring
- provider declarations
- design declarations
- navigation declarations
- app-level `on Event action { ... }` style handlers

Expression surface:

- string, number, boolean, and null literals
- typed literals
- string templates
- arithmetic expressions
- unary minus
- member access
- grouped expressions
- action expressions
- object-like literals in supported positions

This existing surface has enough to build app demos, but it lacks several key language pieces: general conditionals, match/pattern syntax, callable function declarations, clear returns, richer event payloads, optionals/missing flow, and a mature error/async model.

### Statement Families

The project should explicitly define statement families instead of only adding one feature at a time.

Candidate families:

- **Declaration statements:** introduce names, types, data models, views, actions, functions, variants, modules, and imports.
- **Render statements:** produce UI, route children, branch UI, repeat UI, establish render boundaries, and invoke views/layouts/frames.
- **Action statements:** mutate state, run effects, trigger navigation, create/update/delete data, emit events, call actions, and coordinate lifecycle behavior.
- **Function statements:** compute values, bind locals, branch, match, return, and possibly call pure helpers.
- **Query/data statements:** declare reads, filters, ordering, pagination, mutations, and data lifecycle behavior.
- **Boundary statements:** manage loading, missing, failed, stale, permissions, and cancellation behavior.
- **Test/debug statements:** support breakpoints, assertions, scenario hooks, and controlled test instrumentation.

Validation should enforce which families are legal in each block.

### Conditionals

Tao needs `if` / `else` soon. Real apps need conditional rendering, conditional action logic, and conditional value computation.

Candidate render statement form:

```tao
if HasTasks {
  TaskList Tasks
} else {
  EmptyState "No tasks"
}
```

Candidate action statement form:

```tao
action SaveRoom {
  if RoomName == "" {
    set Error = "Room name is required"
    return
  }

  do CreateRoom RoomName
}
```

Candidate expression form:

```tao
alias Title = if IsEditing then "Edit room" else "New room"
```

Candidate `else if` sugar:

```tao
if Status == "loading" {
  LoadingState
} else if Status == "failed" {
  ErrorState
} else {
  RoomList Rooms
}
```

Open design choices:

- Whether MVP supports statement-form only, or also expression-form.
- Whether condition values must be boolean, or whether Tao has truthiness.
- Whether branch bodies inherit the containing block's statement family.
- Whether every expression-form `if` must have `else`.
- Whether render-form `if` may omit `else`.
- Whether `else if` is syntax sugar or nested AST.
- Whether branch-local bindings can escape the branch.
- How branch narrowing interacts with optionals, pattern matching, and guards.

Recommendation for planning:

- Start with statement-form `if` / `else` in view and action blocks.
- Require boolean conditions.
- Allow `else if` as syntax sugar.
- Defer expression-form `if` unless it is needed for ergonomic property values.

### Render Branching

Render branching should feel natural but remain explicit enough for formatter and validator rules.

Useful render patterns:

```tao
if Session.Missing {
  SignInPrompt
} else {
  HomeScreen Session
}
```

```tao
if Rooms.Empty {
  EmptyRooms
}
```

```tao
when Room.Status {
  is "open" {
    OpenRoom Room
  }
  is "locked" {
    LockedRoom Room
  }
  else {
    UnknownRoomState Room
  }
}
```

Rules to settle:

- Whether a render branch can contain only render statements or also local setup statements.
- Whether empty render branches are allowed.
- Whether branch-local state declarations are allowed.
- Whether a render branch may call actions directly. The likely answer is no; it should wire events to actions instead.
- Whether conditional render must preserve previous UI while loading or reloading.

### Pattern Matching

`when ... is ...` is already suggested in the type-system plan and is a strong fit for optionals, union-like values, variants, and runtime discriminants.

Candidate statement form:

```tao
when Employee.Role {
  is text {
    Text Employee.Role
  }
  is ? {
    Text "No role"
  }
}
```

Candidate expression form:

```tao
alias BadgeColor = when Room.Status {
  is "open" -> "green"
  is "full" -> "orange"
  is "closed" -> "gray"
}
```

Candidate type-narrowing form:

```tao
when Item {
  is Room {
    RoomRow Item
  }
  is Person {
    PersonRow Item
  }
  else {
    UnknownRow Item
  }
}
```

Candidate predicate arms:

```tao
when Count {
  is 0 {
    EmptyState
  }
  is > 0 {
    CountText Count
  }
}
```

Candidate optional/missing arms:

```tao
when Room.Description {
  is text {
    Text Room.Description
  }
  is missing {
    Text "No description"
  }
}
```

Arm types to consider:

- literal arms
- type arms
- optional/missing arms
- predicate arms
- enum/variant arms
- catch-all arms
- destructuring arms

Open design choices:

- Whether the catch-all keyword is `else`, `_`, `otherwise`, or `is _`.
- Whether `is ?` means missing, optional-present, or optional-value.
- Whether `missing` and `null` are separate concepts.
- Whether predicate arms are MVP or deferred.
- Whether exhaustiveness is required for expression-form `when`.
- Whether narrowing applies only inside arm blocks.
- Whether arm ordering matters for overlapping predicates.
- Whether `when` can match multiple inputs.
- Whether `when` belongs in view, action, and function blocks.

Recommendation for planning:

- Support statement-form `when` for optional-present and optional-absent narrowing after or alongside `if`.
- Require expression-form `when` arms to be exhaustive if expression form ships.
- Defer type/variant arms, destructuring, and broad predicate matching.

### Guards And Checks

The repo already has bare `guard { ... }` as a minimal Suspense-like boundary. The broader design space includes loading, missing, error, stale, and inline value checks.

Current minimal form:

```tao
guard {
  LoadingScreen
}

RoomList Rooms
```

Candidate conditional guard:

```tao
guard loading Rooms {
  LoadingRooms
}
```

Candidate missing guard:

```tao
guard missing Room {
  NotFound
}
```

Candidate failed guard:

```tao
guard failed Rooms Error {
  ErrorState Error
}
```

Candidate stale/reloading check:

```tao
check reloading Rooms {
  RefreshBadge
}
```

Candidate inline check:

```tao
check Room.Owner
OwnerName Room.Owner.Name
```

Candidate boundary block:

```tao
boundary Rooms {
  loading {
    LoadingRooms
  }
  failed Error {
    ErrorState Error
  }
  missing {
    NotFound
  }
  ready {
    RoomList Rooms
  }
}
```

Semantic questions:

- Does `guard` halt rendering below it, wrap rendering below it, or only wrap the next block?
- Is bare `guard` tied only to Suspense/loading, or can it cover missing and failed states later?
- Does a successful guard narrow types below the guard?
- Does `check` render supplemental UI while continuing, or assert/narrow without halting?
- Do guards belong only in views, or also in actions/functions?
- Can guards appear inside `if`, `when`, and `for` branches?
- Can nested guards compose without confusing UI preservation?
- How are stale/reloading states represented?
- Are boundary fallbacks render-only blocks?

Recommendation for planning:

- Keep bare `guard` as the MVP loading boundary.
- Define `check` separately as non-halting and narrowing or diagnostic oriented.
- Add explicit `guard missing` and `guard failed` only after optionals/error semantics are settled.

### Functions

Tao needs `func` for reusable value computation. Functions should not render UI or run effects by default.

Candidate declaration:

```tao
func DisplayName Person {
  return Person.FirstName + " " + Person.LastName
}
```

Candidate explicit return type:

```tao
func DisplayName Person -> text {
  return Person.FirstName + " " + Person.LastName
}
```

Candidate expression-bodied function:

```tao
func DisplayName Person -> text = Person.FirstName + " " + Person.LastName
```

Candidate early return:

```tao
func Initials Person -> text {
  if Person.FirstName == "" {
    return ""
  }

  return Person.FirstName.First + Person.LastName.First
}
```

Candidate local function:

```tao
ui RoomScreen Room {
  func Title -> text = Room.Name

  Header Title
}
```

Design choices:

- Whether return types are inferred, declared, or both.
- Whether expression-bodied functions are MVP.
- Whether `return` is required for block-bodied functions.
- Whether the last expression can be an implicit return.
- Whether functions can be async.
- Whether functions can call actions. The likely answer is no.
- Whether functions can read state/query values. They probably can read, but not mutate or suspend.
- Whether functions can throw or return result-like values.
- Whether functions are top-level only or can be local.
- Whether overloading/type-directed calls are allowed.

Recommendation for planning:

- Add pure value functions with return values.
- Permit explicit return annotations and inference.
- Keep render and action statements out of `func` bodies.
- Defer async functions until async/error semantics are clear.

### Return Statements

Return behavior is a separate decision from `func` declarations.

Possible policies:

- `return` is legal only in `func`.
- `return` is legal in `func` and `action`, but actions may only return no value.
- `return Value` is legal in `func`; bare `return` is legal in `action` as early exit.
- Expression-bodied functions have implicit return.
- Block-bodied functions require explicit return for all non-void paths.

Candidate action early exit:

```tao
action Submit {
  if Form.Invalid {
    set Error = "Fix the form first"
    return
  }

  do SaveForm
}
```

Questions:

- Should Tao call no-value returns `return`, `stop`, `exit`, or something else?
- Should action return values be banned for MVP?
- Should functions support unreachable-code diagnostics after return?
- Should branch exhaustiveness be checked for functions with declared returns?

Recommendation for planning:

- Support `return Value` in functions.
- Support bare `return` in actions only if early action exit is needed.
- Ban action return values until a concrete lifecycle/result model needs them.

### Actions

Actions are the effectful side of Tao. They should sequence work, mutate state, trigger navigation, write data, call other actions, and wire event lifecycle.

Existing direction:

```tao
action SaveRoom {
  set Saving = true
  do CreateRoom RoomName
}
```

Candidate parameterized action:

```tao
action SelectRoom Room {
  navigation push RoomDetail Room
}
```

Candidate explicit action type:

```tao
action SaveRoom RoomDraft -> SaveResult {
  do CreateRoom RoomDraft
}
```

Candidate lifecycle handlers:

```tao
do SaveRoom Draft {
  on done Room {
    navigation push RoomDetail Room
  }
  on failed Error {
    set SaveError = Error.Message
  }
  on cancelled {
    set Saving = false
  }
}
```

Action design questions:

- Are action parameters named, positional, type-directed, or all of these?
- Can actions return values, or only emit lifecycle events?
- Does `do` wait for completion by default?
- How are cancellation and reentrancy handled?
- Are actions serial by default?
- Can actions call functions freely?
- Can actions call views? The likely answer is no.
- Are data mutations just action statements or a distinct statement family?
- How does optimistic UI fit?
- Do action handlers run in an isolated scope?
- Does every action failure become a typed failure event?

Recommendation for planning:

- Keep actions effectful and distinct from functions.
- Treat action return values as deferred unless forms/data flows force them.
- Prefer lifecycle events or result objects over unconstrained exceptions.

### `do` Statements

`do` is currently the action invocation statement. It needs a precise role.

Candidate forms:

```tao
do SaveRoom
```

```tao
do SaveRoom Room
```

```tao
do SaveRoom room: Room, notify: true
```

```tao
do SaveRoom Room {
  on done {
    set Saved = true
  }
}
```

Questions:

- Is `do` valid only inside action blocks?
- Can render/event handlers use `do`, or must they point to actions?
- Are `do` blocks lifecycle handlers, nested action scopes, or both?
- Can `do` be used with built-in platform effects?
- Can `do` be conditionally cancelled?

Recommendation for planning:

- Keep `do` as the action/effect call statement.
- Allow lifecycle sub-blocks only when event flow has a typed model.

### Events

Events are essential for forms, interactions, navigation, and data lifecycle.

Existing and proposed keywords:

- `on` handles an event.
- `does` declares an event or capability a component/action exposes.
- `emit` triggers a declared event.

Candidate UI event handler:

```tao
Button "Save" {
  on press do SaveRoom
}
```

Candidate typed payload:

```tao
TextInput value RoomName {
  on change Value text {
    set RoomName = Value
  }
}
```

Candidate event declaration:

```tao
ui RoomPicker Rooms {
  does selected Room

  for Room in Rooms {
    RoomRow Room {
      on press emit selected Room
    }
  }
}
```

Candidate action lifecycle event:

```tao
action SaveRoom Draft {
  does done Room
  does failed Error

  do CreateRoom Draft
}
```

Event sources to inventory:

- Interaction events: press, long press, focus, blur, hover, change, submit, scroll.
- Gesture events: drag, pinch, swipe, pan, release.
- Form events: changed, submitted, valid, invalid, reset.
- Action lifecycle events: started, done, failed, cancelled, retried.
- Query/data lifecycle events: loading, ready, refreshing, stale, failed, updated.
- Time events: after, every, debounce, throttle.
- App/platform events: foreground, background, offline, online, deep link, notification.
- Navigation events: entered, left, focused, blurred.

Design questions:

- Are child events wired explicitly, bubbled implicitly, or both?
- Does `emit` require a matching `does` declaration?
- Are event names lower case, PascalCase, or tied to platform names?
- Are event payloads named or type-directed?
- Can events cross view boundaries without explicit wiring?
- Can event handlers contain statements directly, or only refer to actions?
- Are event handlers action blocks under the hood?
- How does event flow compose with forms?

Recommendation for planning:

- Prefer explicit child event wiring for MVP.
- Make typed payloads part of the plan before forms become central.
- Avoid implicit bubbling until there is strong app evidence.

### Async And Error Flow

Tao needs a coherent story for loading, reloading, stale data, failures, cancellation, and retry.

Known states and ideas:

- loading
- reloading
- stale
- failed
- missing
- cancelled
- ready
- partial data
- optimistic data

Candidate guard/boundary syntax:

```tao
guard loading Rooms {
  LoadingRooms
}
```

Candidate result-like `when`:

```tao
when SaveResult {
  is done Room {
    RoomDetail Room
  }
  is failed Error {
    ErrorMessage Error
  }
}
```

Candidate `try` / `catch` action flow:

```tao
action Save {
  try {
    do CreateRoom Draft
  } catch Error {
    set SaveError = Error.Message
  }
}
```

Candidate `defer`:

```tao
action Save {
  set Saving = true
  defer set Saving = false

  do CreateRoom Draft
}
```

Candidate `finally`:

```tao
try {
  do SaveRoom
} catch Error {
  set ErrorMessage = Error.Message
} finally {
  set Saving = false
}
```

Design questions:

- Should Tao prefer result/lifecycle events over exceptions?
- Is `try` / `catch` too broad for MVP?
- Does loading belong to values, queries, actions, or boundaries?
- Does `guard` capture thrown errors, failed data states, or both?
- How are retries represented?
- Can actions be cancelled by navigation/unmount?
- Should `defer` be allowed only in actions?
- How does stale data display preserve previous UI?

Recommendation for planning:

- Treat broad exception systems as deferred inventory.
- Prefer explicit lifecycle/result handling for MVP.
- Use validation to prevent unhandled async/error states where Tao can know them.

### State Statements

State and local bindings are already present but need clearer boundaries.

Existing and candidate forms:

```tao
state RoomName = ""
alias CanSubmit = RoomName != ""
set RoomName = Value
```

Candidate derived/computed state:

```tao
computed CanSubmit = RoomName != "" and not Saving
```

Candidate local binding:

```tao
let DisplayName = User.FirstName + " " + User.LastName
```

Candidate scoped alias:

```tao
if Room.Owner exists {
  alias OwnerName = Room.Owner.Name
  Text OwnerName
}
```

Design questions:

- Is `alias` enough for derived values, or is `computed` needed?
- Are aliases always immutable?
- Are state values mutable only through `set`?
- Can `set` target nested member access?
- Can function bodies declare locals?
- Can view branches declare local aliases?
- Can actions declare temporary locals?
- Does `state` belong only in views/components?
- How does state initialization interact with props and query values?

Recommendation for planning:

- Keep `alias` as immutable value binding.
- Keep `state` as mutable local component state.
- Define whether local function/action bindings use `alias` or a new `let`.

### Iteration

Tao currently has `for Name in Collection { ... }`. UI list rendering needs stronger semantics than a generic loop.

Existing form:

```tao
for Room in Rooms {
  RoomRow Room
}
```

Candidate keyed form:

```tao
for Room in Rooms key Room.Id {
  RoomRow Room
}
```

Candidate index form:

```tao
for Room, Index in Rooms {
  RoomRow Room Index
}
```

Candidate empty fallback:

```tao
for Room in Rooms {
  RoomRow Room
} empty {
  EmptyRooms
}
```

Candidate range/general loop:

```tao
for Index in 0..Count {
  Step Index
}
```

Candidate action loop:

```tao
for Room in SelectedRooms {
  do ArchiveRoom Room
}
```

Design questions:

- Is `for` render-only at first, or available in actions/functions?
- Are keys required for UI lists?
- How does Tao infer a stable key?
- Is index access allowed?
- Does `for` support empty states directly?
- Should Tao support general loops such as `while`, `repeat`, and `break`?
- Are imperative loops too broad for the app MVP?
- How do loops interact with async actions and cancellation?

Recommendation for planning:

- Treat UI/data list iteration as MVP.
- Require or infer stable keys before list-heavy apps.
- Defer arbitrary `while`, `break`, and `continue` until there is app evidence.

### Expression-Adjacent Syntax

Control syntax depends on richer expressions. Tao needs enough expression syntax to make conditions, guards, filters, and function returns readable.

Needed operators and concepts:

- boolean `and`, `or`, `not`
- comparisons: `==`, `!=`, `<`, `<=`, `>`, `>=`
- identity or same-value comparison if needed
- null/missing checks
- optional access
- coalescing
- membership checks
- string containment
- collection length/count checks
- arithmetic
- grouping
- precedence rules
- function calls
- pipelines or chaining

Candidate optional forms:

```tao
if Room.Owner exists {
  Text Room.Owner.Name
}
```

```tao
Text Room.Owner?.Name ?? "No owner"
```

```tao
when Room.Owner {
  is Person {
    Text Room.Owner.Name
  }
  is missing {
    Text "No owner"
  }
}
```

Candidate boolean form:

```tao
if RoomName != "" and not Saving {
  Button "Save"
}
```

Candidate pipeline:

```tao
alias VisibleRooms = Rooms
  |> filter IsVisible
  |> sort by Name
```

Design questions:

- Should Tao use symbolic operators (`&&`, `||`, `??`) or word operators (`and`, `or`, `otherwise`)?
- Is optional access (`?.`) compatible with Tao's style?
- Is coalescing needed before `when`?
- Are pipelines MVP or deferred?
- How does expression grammar avoid conflicts with string adjacency and arguments?
- Does Tao distinguish `null`, `missing`, and `unknown`?

Recommendation for planning:

- Prioritize boolean logic, comparisons, optional/missing checks, and coalescing or equivalent.
- Defer pipelines unless query/list ergonomics demand them immediately.

### Calls And Arguments

Invocation syntax touches views, functions, actions, and events.

Current direction includes render/action argument lists and type-directed matching. This project should settle enough call syntax for control features to be usable.

Candidate positional style:

```tao
RoomRow Room
DisplayName User
do SelectRoom Room
```

Candidate named style:

```tao
RoomRow room: Room, selected: IsSelected
DisplayName person: User
do SelectRoom room: Room
```

Candidate dot-local argument shorthand:

```tao
RoomRow .room Room .selected IsSelected
```

Candidate mixed fallback:

```tao
RoomRow Room selected: IsSelected
```

Design questions:

- Are calls type-directed first, named first, or positional first?
- Does Tao permit unlabeled arguments when type matching is unambiguous?
- Are named arguments required when multiple parameters have the same type?
- Can function calls appear inside expressions with the same syntax as view calls?
- Should actions use the same argument syntax as views/functions?
- How do argument blocks interact with adjacent strings?
- Are default arguments allowed?
- Are optional arguments allowed?
- How are variadic children represented?

Recommendation for planning:

- Keep one coherent argument model across views, functions, and actions where possible.
- Require names when type-directed matching would be ambiguous.
- Avoid dot-local shorthand until the core model is proven.

### Forms And Inputs

Forms are not only UI widgets; they drive state, validation, events, and action flow.

Candidate form shape:

```tao
state RoomName = ""
state Error = ""

TextInput value RoomName {
  on change Value text {
    set RoomName = Value
  }
}

Button "Create" {
  on press do SubmitRoom
}
```

Candidate validation block:

```tao
validate RoomDraft {
  check Name != "" else "Name is required"
  check Capacity > 0 else "Capacity must be positive"
}
```

Candidate field-level checks:

```tao
TextInput value RoomName {
  check RoomName != "" {
    FieldError "Name is required"
  }
}
```

Design questions:

- Are forms plain state plus events, or a first-class statement family?
- Does validation live in `check`, `validate`, type declarations, or data schema?
- How are errors displayed and typed?
- Does submit trigger an action or a form-specific event?
- How do field-level events pass typed payloads?

Recommendation for planning:

- Build MVP forms from state, `set`, `on`, and actions.
- Inventory `validate` as a future control-specific block.

### Data Mutation Statements

Data writes already appear in the grammar as create/update statements. Control syntax must decide how those statements compose with actions, errors, transactions, and optimistic UI.

Candidate action mutation:

```tao
action CreateRoom Draft {
  create Room from Draft
}
```

Candidate update:

```tao
action RenameRoom Room Name {
  update Room {
    set Name = Name
  }
}
```

Candidate transaction:

```tao
transaction {
  create Room from Draft
  update User {
    set LastRoomId = Room.Id
  }
}
```

Candidate optimistic block:

```tao
do CreateRoom Draft {
  optimistic {
    RoomRow Draft
  }
  on failed Error {
    Toast Error.Message
  }
}
```

Design questions:

- Are create/update statements valid only inside actions?
- Do create/update produce values?
- How are generated IDs represented?
- Are transactions needed for MVP?
- Are rollback and optimistic UI first-class?

Recommendation for planning:

- Keep data mutation statements action-only.
- Treat transactions and optimistic blocks as future inventory unless the data MVP exposes an immediate need.

### Navigation Statements

Navigation is already being implemented separately, but control syntax must still define how navigation fits inside actions and events.

Candidate forms:

```tao
navigation push RoomDetail Room
navigation pop
navigation tab Settings
```

Questions:

- Are navigation statements legal only in actions?
- Can navigation fail or be cancelled?
- Do routes/events have typed payloads?
- Can navigation statements appear in event handlers directly?
- Are route guards part of this project or navigation-specific work?

Recommendation for planning:

- Treat navigation as action/effect syntax.
- Use typed route payloads as validation input.

### Resource Scopes

Resource scopes are not yet required, but they may become useful for subscriptions, timers, media capture, sensors, and platform permissions.

Candidate forms:

```tao
resource CameraSession {
  on ready Stream {
    CameraPreview Stream
  }
}
```

```tao
using Subscription = subscribe RoomUpdates {
  on update Room {
    set Room = Room
  }
}
```

```tao
action Record {
  using Recorder = AudioRecorder {
    do Recorder.start
  }
}
```

Questions:

- Are resource scopes a runtime API concern instead of core syntax?
- Should cleanup use `defer`, `finally`, or block lifetime?
- How does resource lifetime map to React component lifecycle?

Recommendation for planning:

- Keep resource scopes in the future bucket.
- Do not add syntax until platform APIs create repeated code pressure.

### Task Blocks

Task blocks may help represent cancellable async work without full exceptions.

Candidate forms:

```tao
task LoadRooms {
  query Rooms
}
```

```tao
do task SaveDraft {
  create Room from Draft
}
```

Candidate lifecycle:

```tao
task RefreshRooms every 30s {
  query Rooms
}
```

Questions:

- Is `task` a declaration, statement, or runtime helper?
- Does every task expose loading/failed/done states?
- Can tasks be cancelled automatically on unmount?
- Does `task` overlap with query declarations and actions?

Recommendation for planning:

- Keep task blocks as future inventory.
- Prefer query/action lifecycle semantics first.

### Declarative Effects

Tao may benefit from declarative effect syntax for repeated app patterns: on mount, on value change, on query ready, on route enter.

Candidate forms:

```tao
effect when RoomId changes {
  do LoadRoom RoomId
}
```

```tao
effect on appear {
  do TrackScreen "Room"
}
```

Questions:

- Does `effect` encourage hidden imperative behavior?
- Can explicit events cover the same use cases?
- How does effect dependency tracking work?
- Is this just React effect syntax in Tao clothing?

Recommendation for planning:

- Avoid MVP effect syntax unless the app model clearly requires it.
- Prefer explicit `on` events and query declarations.

### Assertions And Control-Specific Test Hooks

Control syntax should be testable. Tao may need source-level assertions or scenario hooks, especially for app samples.

Candidate assertion:

```tao
assert Rooms.Count >= 0
```

Candidate test hook:

```tao
test "empty rooms state" {
  given Rooms = []
  expect EmptyRooms visible
}
```

Candidate debug-only control hook:

```tao
debugger when SaveFailed
```

Questions:

- Are assertions compiled into runtime checks, tests, or both?
- Do test hooks belong in Tao source or separate scenario files?
- Should tests use normal control syntax or special language constructs?

Recommendation for planning:

- Keep assertions/test hooks as inventory.
- Use app test fixtures first, then decide whether syntax is warranted.

## Decisions

- The sprint/project name is **Control Syntax And Statements**.
- This research should inventory broadly, but the implementation plan should choose a smaller MVP sequence.
- MVP priority should favor `if` / `else`, `when`, function returns, guard/check semantics, event/form flow, and optionals.
- View/render statements, action statements, and function/value statements should remain distinct.
- Semantic rules belong in validation first; codegen should assume the AST has already been validated.
- Broad generics, arbitrary loops, macros, full exception systems, transactions, resource scopes, and task blocks are inventory unless they directly unblock app MVP.
- Existing bare `guard` should be preserved as the current minimal boundary while richer guard/check/error semantics are researched.
- First implementation slice should be small and app-facing: expression basics for conditions, a list/query empty predicate for empty states, statement-form `if` / `else`, guard semantics and view reactive-read hoisting, one narrow event/form handler path, optional-only `when`, and pure `func` declarations with returns/calls.
- `if` should be statement-form first. Expression-form `if` is deferred.
- `if` conditions should require boolean values once expression typing can enforce that rule.
- `else if` should be accepted as syntax sugar for nested `if`.
- `func` bodies should be pure value bodies. Render statements and action/effect statements are invalid inside functions.
- Function calls should use an explicit expression form for the first slice rather than trying to solve universal view/function/action invocation syntax in the same project.
- `return Value` should be valid in functions. Bare action early exit and action return values are deferred from this first slice.
- `when` should start as statement-form narrowing for optional-present and optional-absent cases only. Type/variant `when`, expression-form `when`, predicate arms, destructuring, and broad exhaustiveness are deferred.
- `guard` should stay view-only and bare for this project, with clearer validation, formatter behavior, and integration with whole-view reactive-read hoisting. Rich `guard loading/missing/failed`, `check`, and `boundary` syntax remain deferred.
- Event/form flow should be minimal: local `on` handlers for `press`, `change`, and `submit`, with typed payloads where needed. `focus`, `blur`, `does`, `emit`, implicit bubbling, action lifecycle events, timers, and platform events remain in the interactions project.
- View-like declarations should compile in two phases: first collect every reactive read used anywhere in the view body, including nested `if` / `else`, `when`, `for`, `guard`, and render-child blocks; then hoist the corresponding hook/read setup to the top of the generated component before rendering.
- Render control statements may lower to inline functions/IIFEs so generated TSX stays linear with the Tao AST tree, but those inline functions must reference already-hoisted values rather than creating hooks/read setup themselves.
- The project is ready for a plan document at `Docs/Projects/Control Syntax and Statements Project Plan.md`.

## User Interview Notes

- The user asked for an expansive list of core language possibilities, including `if` / `else`, `when`, `guard`, functions with return values, and any additional language features that could benefit Tao.
- The user asked to rename the sprint from "Core Language Surface" to "Control Syntax and Statements".
- The user wants this recorded as a new research document for the current sprint.
- The user provided MVP defaults: prioritize Still/Rooms needs, keep statement categories distinct, validate semantics before codegen, and treat broad generics/arbitrary loops/macros/full exceptions as inventory unless they directly unblock app MVP.
- On May 19, 2026, the user asked to auto-iterate with agents, but specifically asked the agents not to be exhaustive. The goal was to identify the core control-statement surface that would make a great basic Tao experience without overbuilding.
- Local agent helper round 1 artifact: `/private/tmp/tao-project-reviews/control-syntax-round-1-auto-research-20260519-184301`.
- Round 1 result: Codex failed in the sandbox while trying to access local Codex state, Claude returned `Not logged in`, and the unsandboxed rerun was rejected because it would send Tao repo context to external services. No agent recommendations were incorporated. The narrowed decisions in this document are local synthesis from the repo docs and the user's stated constraints.
- Codex-only retry artifact: `/private/tmp/tao-project-reviews/control-syntax-codex-round-1-auto-research-20260519-190000/pass-1/codex-review.md`.
- Codex-only retry result: the in-session Codex agent recommended narrowing `when` to optionals only, moving guard/event work before functions, adding explicit hook-safety work for conditional branches, limiting events to `press` / `change` / `submit`, and adding a list/query empty predicate for common empty-state UI.
- The user clarified the intended hook-safety approach: do not ban nested `if` / `else` or query/state reads inside branches. Instead, compile every view by collecting all reactive state/query reads across the whole view body first, hoisting those reads to the top, and then emitting rendering/control flow afterward. With this model, nested `if` / `else` inside a view body works automatically because nesting affects rendered output, not dependency collection.

## Repo Findings

- `packages/parser/tao-grammar.langium` currently supports top-level declarations, view statements, action statements, app statements, query/data statements, bare `guard`, `for`, `do`, `set`, navigation actions, and app-level `on`.
- The current grammar does not yet expose a complete `if` / `else`, `when`, or `func` body model.
- The language spec already argues for block-category-specific statement legality. That should be made explicit in this sprint's plan.
- The type-system execution plan includes `when` matching, narrowing, function return inference, action types, typed arguments, and deferred guard/check ideas.
- The data/query design uses bare `guard { ... }` as an MVP async boundary and defers richer loading/error modeling.
- Error-handling notes contain useful alternatives for guard/check, boundary blocks, result-like flow, `try` / `catch`, `defer`, and multiple return/error approaches.
- Interaction/event planning contains the most developed sketches for `on`, `does`, `emit`, typed payloads, explicit child event wiring, action lifecycle events, query lifecycle events, time events, and app/platform events.
- Existing TODOs mention arrays/lists/tuples, event/handler syntax, functions, formatter work, validator cleanup, layout behavior, and state access performance. Several of those depend on this project's syntax decisions.
- Existing test apps already exercise actions-as-arguments, state updates, arithmetic, layout, navigation, and type matching. The control-syntax implementation should add or extend a focused app under `Apps/Test Apps/` instead of hiding coverage only in parser tests.
- Existing data validation already treats some nested query/mutation positions as unsafe. For view bodies, the control-syntax implementation should replace branch-level hook fears with a clear whole-view reactive-read collection pass that traverses nested control statements before render lowering.
- Function calls are a higher-blast-radius feature than they look: they touch grammar, resolver/scoping, argument binding, type checking, codegen, formatter, and nested-block validation. The plan should keep function calls late enough that core app flow is not blocked on them.

## External Research

No external web research was used for this iteration. The narrowing is based on repo-local specs, current grammar, existing test apps, and the user's constraints.

## Alternatives Considered

### Conditional Syntax Alternatives

- Statement-only `if` first.
- Expression-form `if` with `then` / `else`.
- Render-only branching syntax.
- `when` for all branching instead of `if`.

Initial preference: statement-form `if` / `else` first, with expression-form deferred unless property/value ergonomics require it.

### Match Syntax Alternatives

- `when Value { is Pattern { ... } }`
- `when Value is Pattern { ... }`
- arrow arms for expression matches.
- `case` / `switch` style syntax.
- catch-all as `else`, `_`, `otherwise`, or `is _`.

Initial preference: `when Value { is Some { ... } is ? { ... } }` for optional-only statement form. Type/variant arms and arrow arms should wait for a type-system-aligned follow-up.

### Guard And Boundary Alternatives

- Keep only bare `guard`.
- Add typed guards such as `guard loading`, `guard missing`, and `guard failed`.
- Add `check` for non-halting inline narrowing or supplemental UI.
- Add a full `boundary` block with named states.

Initial preference: keep bare `guard` for MVP, define richer semantics before adding more syntax.

### Function Return Alternatives

- Require explicit `return` in all block-bodied functions.
- Allow implicit final expression returns.
- Allow expression-bodied functions.
- Require return type annotations.
- Infer return types by default.

Initial preference: support `return Value`, allow return inference, and consider expression-bodied functions as a small ergonomic extension.

### Action Result Alternatives

- Actions never return values.
- Actions return typed results.
- Actions emit lifecycle events.
- Actions throw/catch errors.
- Actions produce result-like values matched by `when`.

Initial preference: keep action return values deferred and model completion/failure through lifecycle or result-like semantics only when needed.

### Event Flow Alternatives

- Implicit bubbling.
- Explicit child event wiring.
- DOM-like event propagation.
- Typed `does` declarations plus explicit `emit`.
- Event handlers as inline action blocks.

Initial preference: explicit child event wiring and typed payloads.

### Error Flow Alternatives

- Full `try` / `catch` / `finally`.
- Result-like values.
- Guard/boundary-only errors.
- Action lifecycle failure events.
- Zig-like error unions.
- Multiple return values.

Initial preference: use explicit lifecycle/result handling and boundaries first; defer full exceptions.

### Loop Alternatives

- UI/data-only `for`.
- General `for`.
- `while`.
- `repeat`.
- `for empty`.
- keyed list-specific iteration.

Initial preference: invest in UI/data list iteration and keys; defer arbitrary loops.

### Argument Alternatives

- Type-directed arguments.
- Named arguments.
- Positional arguments.
- dot-local shorthand.
- mixed named/positional.

Initial preference: support type-directed matching where unambiguous and require names when needed.

## New Ideas Not Yet In Repo

These are useful to keep in the design inventory, but none should be treated as accepted for MVP yet.

- `transaction { ... }` blocks for grouped data writes and rollback behavior.
- `optimistic { ... }` blocks attached to actions or data mutations.
- `task` blocks for cancellable async work with lifecycle states.
- `resource` or `using` blocks for subscriptions, sensors, media capture, permissions, and cleanup.
- `effect when ... changes { ... }` for declarative side effects.
- `validate` blocks for form and data validation.
- `assert` statements for source-level invariants and tests.
- `for ... empty { ... }` list fallback syntax.
- `defer` for action cleanup.
- `finally` for cleanup after attempted work.
- control-specific test hooks such as `given`, `expect`, and scenario blocks.
- route guard statements for navigation.
- permission guard statements for platform capabilities.
- state-machine or flow blocks for multi-step forms and onboarding.
- debounce/throttle event modifiers for text input and search.
- retry/backoff blocks for network operations.
- cancellation scopes for leaving screens or replacing requests.

## Unresolved Questions

These should not block the first plan:

1. Should Tao eventually support expression-form `if`?
2. Should expression-form `when` exist, and if so what exhaustiveness rules should it use?
3. Should Tao use `else`, `is unknown`, or both for `when` catch-all arms after the first slice?
4. Should predicate arms be part of `when`, or should they remain ordinary `if` conditions?
5. Should `check` be a narrowing statement, a supplemental render statement, or both?
6. Are missing, null, unknown, and failed permanently distinct values/states?
7. Should actions ever return values, or should they only expose lifecycle events/results?
8. Does Tao need a no-value action early-exit keyword distinct from `return`?
9. What is the long-term unified invocation model for views, functions, and actions?
10. How should optional access and coalescing be spelled?
11. Do pipelines belong in this project or a later expression ergonomics project?
12. Should list keys be required, inferred, or optional?
13. Does `for` eventually belong in action/function bodies?
14. Is `for empty` worth adding, or should apps use `if Rooms.Empty`?
15. Should validation blocks be first-class syntax or built from functions/checks?
16. Are transactions a language feature or a data-provider/runtime feature?
17. Should custom events use `does` / `emit`, and how should payloads be declared?
18. Can a view pass child events through without explicitly re-emitting them?
19. How should action lifecycle events compose with `do` blocks?
20. Which control-specific test hooks, if any, belong in Tao source?
21. What exact empty predicate should collection/query values expose: `Empty`, `IsEmpty`, `Count == 0`, or something else?

## Planning Inputs

Recommended implementation plan shape:

1. Establish statement-family and expression foundations without changing the whole invocation model, including a small empty-list/query predicate.
2. Add statement-form `if` / `else` in view, action, and function contexts.
3. Tighten bare `guard` semantics and view reactive-read hoisting.
4. Add minimal render-local `on` handler support for first-experience button/form flows.
5. Add optional-only statement-form `when`.
6. Add pure `func` declarations, function call expressions, and `return Value`.
7. Add focused test apps, formatter coverage, and docs updates.

Likely MVP subset:

- `if` / `else` statement form.
- `else if` sugar.
- boolean logic and comparison expressions needed by conditions.
- list/query empty-state predicates.
- `func` declarations.
- function call expressions.
- `return` statements in functions.
- `when` statement form for optionals only.
- refined bare `guard` semantics.
- explicit local `on` event handlers for `press`, `change`, and `submit`, with typed form payloads where needed.
- validation rules that keep render/action/function statement sets distinct.
- whole-view reactive-read collection that traverses nested `if` / `else`, `when`, `for`, `guard`, and render-child blocks before render emission.

Likely deferred:

- broad generics.
- arbitrary `while` loops.
- macros.
- full exception systems.
- transactions.
- resource scopes.
- task blocks.
- general effect blocks.
- advanced destructuring.
- broad pipelines.
- implicit event bubbling.
- `does` / `emit` custom event protocols.
- type/variant `when`.
- action early returns.
- `focus` / `blur` events unless they turn out to be trivial after `press` / `change` / `submit`.

Implementation targets when this moves from research to plan:

- `packages/parser/tao-grammar.langium`
- `packages/compiler` validation and resolution code.
- `packages/formatter`
- code generation paths that consume validated AST.
- `packages/tao-std-lib` only where new built-ins or runtime helpers are needed.
- `Apps/Test Apps/` demonstration app for control syntax and statements.

Validation for this docs-only research sprint:

- `./agent dprint check --incremental=false`
- `./agent git diff --check`

Plan document:

- [Control Syntax and Statements Project Plan](./Control%20Syntax%20and%20Statements%20Project%20Plan.md)
