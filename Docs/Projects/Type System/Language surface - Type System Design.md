# Tao Type System

This document describes the (intended) Tao type system.

Any commented out code is WIP material and should be ignored.

## Basic typing

In these examples, `=>` means "is equivalent to". It is not part of tao syntax.

### Primitive Types and Values

Everything in Tao is "typed". This means that Tao can ensure that you don't put one type of value where another different one is expected.

Tao's primitive types are `text`, `number`, `item`, `list`, `view`, `action`, and `boolean`

Each one can be expressed as "literals", e.g

- `number`: `1`, `-99`, `5,100,234,110`, `3.14`
- `text`: `"Hello World"`, `"Tao"`, `""` (empty text)
- `boolean`: `true`, `false`
- `item`: `{ Name "Ro", Age 40 }`, `{ }` (empty item)
- `list`: `[1, 2, 3]`, `[ ]` (empty list)
- `action`: `action Name { ... }` (declaration), `action { ... }` (inline)
- `view`: `view Name { ... }` (declaration)

```tao
// The `number` type represents any number value (inside the range -2^53 + 1 to 2^64 - 1):
number T => number
<NumberLiteral> => number <NumberLiteral> => number
// e.g:
typeof 1 => typeof number 1 => number
typeof 42 => typeof number 42 => number
typeof 3.14 => typeof number 3.14 => number

// The `text` type represents any piece of text (in utf8 encoding).
typeof text T => text
typeof <TextLiteral> => typeof text <TextLiteral> => text
// e.g:
typeof "Hello World" => typeof text "Hello World" => text
typeof "100" => typeof text "100" => text

// The `list` type:
typeof list T => list T
typeof <ListLiteral of T> => list typeof Ts => list Ts
typeof [TypeA, TypeB, ...] => list TypeA | TypeB | ...
// e.g:
typeof [1, 2, 3] => list number
typeof ["Hello", "World"] => list text
typeof [1, "Hello", "World", true] => list number | text | boolean
typeof [number, text] => list number | text

// The `item` type:
typeof </* Any item literal with properties `KeyN ValueN` */>
  => item { Key1 typeof Value1, Key2 typeof Value2, ... }
typeof { Name: "Ro", Age: 40 }
  => item { Name: typeof "Ro", Age: typeof 40 }
  => item { Name: text, Age: number }

typeof boolean T => boolean
typeof </* Any boolean literal */> => typeof boolean <literal> => boolean
typeof true => boolean
typeof false => boolean
```

You can also define new types, from other ones with `type <New Type> is <Type>`:

```tao
type <New Type> is <Type>
  => <New Type> is <Type>
type Name is text
  => typeof Name is Name // true
  => typeof Name is text // false
  => typeof text is Name // false
type Person is { Name text, Age number }
```

- `type <Type> is <Type>` for defining a new type, based on another
- `<TypeA> is <TypeB>` for checking if one type "comes from" the other
- `type <Type> is like <Type>` for defining a type that matches anything _like_ it; meaning it has at least the same characteristics as the other type.
- `has` for checking if a list contains a thing; and if an item is missing any optional properties
  - `<A List> has <Value>` => true if the list contains the value
  - `<A List> has <Another List>` => true if the list contains all values of another list
  - `<An Item> has <Optional Property>` => true if the item has a `Name` property
- `when` for checking if a value is of a certain type and then doing something with it:

### Primitive Operators

Tao has some basic operators for its primitive types:

- `+` for number addition
- `-` for number subtraction, and list deletion
- `*` for number multiplication, and text repetition
- `/` for number division
- `and` for AND of two booleans
- `or` for OR of two booleans
- `not` for NOT of a boolean
- `has` for checking what's in a list, and whether an item is missing properties
- `${ ... }` for adding values into a piece of text

These are all the valid operations in Tao:

```tao
typeof number + number => number
typeof text + text => text

typeof number - number => number
typeof list of T - T => list of T
typeof list of T - list of T => list of T

typeof number * number => number
typeof text * number => text

typeof number / number => number

typeof boolean and boolean => boolean
typeof boolean or boolean => boolean
typeof boolean not boolean => boolean

typeof "... ${ text | number | boolean } ..." => text
```

Some examples:

```tao
1 + 2 => 3
"Hello" + "World" => "HelloWorld"
[1, 2, 3] - 2 => [1, 3]
[1, 2, 3, 4, 5] - [2, 4] => [1, 3, 5]
"Hello" * 2 => "HelloHello"
true and true => true
true and false => false
true or false => true
not true => false
"Hello ${ <some text>! How are you? }" => "Hello <the text>! How are you?"
```

All other uses of these operators are blocked by Tao's type system:

`````tao
1 + "Hello" => Type Error!
"Hello" + [1, 2, 3] => Type Error!
[1, 2, 3] - "Hello" => Type Error!
[1, 2, 3] - [1, 2, 3] => Type Error!
"Hello" * [1, 2, 3] => Type Error!
true and "Hello" => Type Error!
true or "Hello" => Type Error!
not "Hello" => Type Error!

### Type of Aliases

An `alias` allows to reference values and expressions by name.

The value of an `alias` will _always automatically update_ in real-time to reflect the referenced expression's value.

Conceptually, you could substiture any `alias` name with its right hand value at any time and anywhere in your code.

```tao
alias <AliasName> = <Expression>
  => <AliasName> becomes <Expression>
alias Alias1 = 1
  => Alias1 => 1
alias Alias2 = Alias1
  => Alias2 => Alias1 => 1
typeof Alias1
  => typeof 1
  => number
```

Some examples:

```tao
type Currency is text
type USD is Currency
alias Price = 3.14 USD

alias DiscountPrice = Price - Price * Discount is Price

func DiscountPrice Price, Discount is Price {
  return Price - (Price * Discount)
}

render Text "${DiscountPrice(Price, 10%)} USD"

render Button Title "Buy", OnPress action { .. }

render Button "Buy", action { ... }

render Button Title."Buy", OnPress.action { ... }




```

### Views: Declarations and Rendering

A `view` defines how to render some piece of UI.

When you `render` a view somewhere in the code, it displays at the corresponding place in the UI.

```tao
view <ViewName> <Parameters> { <Body> }
  => alias <ViewName> = view <Parameters> { <Body> }
render <ViewName> <Arguments> { <Body> }
  => <ViewName> appears in the UI along with its <Body>
```

Tao comes with a core library, including UI components. For example, `Text` renders any `text` value in the UI:

```tao
view Example {
  // Display `Hello ... ` in the UI:
  render Text "Hello World!"
}
```

The `render` keyword can only be used inside of other views - Tao will take care of rendering your root view for you

Also, inside of any `view` the `render` keyword can be dropped - and you should:

```tao
view Example {
  Text "Hello World!" // same as `render Text "Hello World!"`
}
```

Conventional Tao always drops `render` inside any `view`; and `tao fmt` will even drop it automatically for you!

The one exception is for example code. It is useful to demonstrate using views without a wrapping `view Example { ... }` wrapper definition:

```tao
render Text "Hello World!"
// vs:
view Example {
  Text "Hello World!"
}
```

### State, Events, and Actions: Updating data when something happens

So far everything we have discussed is static - but UI is dynamic.

To represent data that changes, you declare `state` values. Any time a `state` value changes, all parts of the UI that use it also automatically update.

```tao
state IsLoggedIn false
render Text when
  IsLoggedIn -> "Logged in"
  otherwise -> "Logged out"
```

You use an `action` to update any `state`:

```tao
render Button "Login", OnPress action {
  set IsLoggedIn true
}
```

Actions can be shorthanded with `->`, and be Type Matched in arguments. This gives a concise syntax for most views that want an action:

```tao
render Button ButtonText, -> {
  toggle IsLoggedIn
}
```

You can use `alias` to create new values that depend on other `state`. It will always change automatically whenever a `state` that it uses changes.

For example, a button can change its text when the user logs in; or display a user's full name:

```tao
alias ButtonText when
  IsLoggedIn -> "Logout"
  otherwise -> "Login"

alias DisplayName when
  IsLoggedIn -> "${FirstName} ${LastName}"
  otherwise -> "Guest"
```

Another example, a "T minus ..." countdown timer that updates as every second passes:

```tao
use every from @tao/time

state Countdown 100.seconds

view CountdownTimer {
  Text "T minus ${Countdown} seconds"

  on every 1.second -> {
    set Countdown = Countdown - 1
  }
}
```

Or, if we want to display it in minutes instead of seconds:

```tao
use every, Minutes from @tao/time

...

state Countdown = 100.seconds
alias MinutesCountdown = Countdown.asMinutes
render Text "${T minus ${MinutesCountdown} minutes}"
```

A `state` value can only ever be updated by an `action`; and an `action` can only ever happen in response to an `event`.

An `event` could be a user touching the screen, a push notification arriving, a network request failing, or even time passing.

For example:

````tao
state Counter = 0
Text Value Counter
Button Title, OnPress -> { set Counter += 1 }

All `stateful` values are *reactive*. This means that whenever something `stateful` updates value, *every* other part of the app that refers to that state also update, immediately and automatically.

When a stateful value is rendered in a view, it always updates to its latest value.

Anytime a stateful value is used to decide what to do, e.g `if <state> > 10 { ... }`, it re-evaluates the moment the state updates.

Only in an action is a state considered as its "current" value, at the time of the action event.

```tao
state Count = 0
  => typeof Count => stateful number
  => typeof evaluate Count => typeof Count
state Name = "Ro"
  => typeof Name => stateful text
  => typeof evaluate Name => typeof Name => text

// `stateful` is contagious: any expression that touches a something stateful is stateful.
alias Doubled = Count * 2
  => typeof ((stateful number) + number) => (stateful number) + (stateful number) => stateful number
alias Greeting = "Hi " + Name
  => typeof (text + stateful text) =..> stateful text

// `render stateful T` collapses to `T` when rendered.
view Show {
  Text value Count     // render Count => render stateful number => number
  Text value Doubled   // render Doubled =..> number
  Text value Greeting  // render Greeting =..> text
}

// `set stateful X = stateful T` => `set stateful X = T`
action Increment {
  set Count = Count + 1
    => set Count = (stateful number) + number
    => set Count = (stateful number) + (stateful number)
    =..> set Count = number
}

// Mixing an alias with a state becomes `stateful T`
alias Two = 2 => typeof Two = 2 => number
alias Quad = Count * Two
  => typeof Quad = (stateful number) * number
  =..> typeof Quad = stateful number
`````

Notes:

- `stateful` is a **type modifier**, not a nominal `type`. It composes with any base type: `stateful number`, `stateful text`, `stateful Person`, `stateful list T`, etc.
- Reading a `stateful T` in view or action position is the only place it collapses to `T`. Elsewhere (e.g. in a top-level `alias`), expressions stay `stateful T` so downstream views/actions can subscribe.
- `set X = <expr>` requires `X` to be a `state` binding; the RHS is type-checked against `X`'s underlying `T` (after `stateful` collapse on both sides).

### Named Types

A new type can be defined as a named variant of an existing type. Two differently named types are always different, even when they have the same underlying value type. A named type can also allow for having an `optional` value, in which case it either has a value, or it is `missing`.

```tao
type <NewType> is <SubType>
  => evaluate <NewType> => evaluate <SubType>
  => <NewType Value> <SubType Value> => <NewType Value>
  => <SubType Value> <NewType Value> // Type Error!
  => set <state NewType> = <SubType Value> // Type Error!
  => set <state NewType> = <NewType Value> <SubType Value> // OK

type Name is text
type FirstName is Name
type LastName is Name

state UserName = Name "John"
  => set UserName = Name "Johnny" // OK
  => set UserName = "Johnny" // Type Error!

<TypeA> is <TypeB> == true when <TypeA> is a subtype of <TypeB>

FirstName is Name => true
LastName is Name => true
Name is FirstName => false
FirstName is LastName => false
Name is text => true
FirstName is text => true
text is Name => false
```

### Declaration Shorthands

You can shorthand many declarations.

```tao
alias <Name> = <Value>
  => alias <Name> = (typeof <Value>) <Value>
state <Name> = <Value>
  => state <Name> = stateful (typeof <Value>) <Value>

alias Width = 30
  => alias Width = (typeof 30) 30
  => alias Width = number 30
  => typeof Width is number

state Height = 30
  => state Height = stateful (typeof 30) 30
  => state Height = stateful number 30
  => typeof Height is stateful number

alias <NamedType> <Value>
  => alias <NamedType> = <NamedType> <Value>

alias FirstName "Joe"
  => alias FirstName = FirstName "Joe"
  => typeof FirstName is FirstName

state LastName "Doe"
  => state LastName = stateful LastName "Doe"
  => typeof LastName is stateful LastName
```

## Views and Actions

```tao
view <ViewName> <Parameters> { <Body> }
  => alias <ViewName> = view <Parameters> { <Body> }

action <ActionName> <Parameters> { <Body> }
  => alias <ActionName> = action <Parameters> { <Body> }
```

### Parameters and Arguments

Parameters and arguments are `Name Type` pairs:

```tao
view ExampleView <ParamName1> <ParamType1>, <ParamName2> <ParamType2>, ... { ... }
action ExampleAction <ParamName1> <ParamType1>, <ParamName2> <ParamType2>, ... { ... }

// e.g:
use Button from @tao/ui

view Profile Person Person, IsSelf boolean {
  // Render a title
  Text "${Person.FirstName} ${Person.LastName} Profile"
  // And if this is not my profile, render a Button to follow them
  if !IsSelf {
    Button Text "Follow", OnPress action { ... }
  }
  ...
}
```

Similar to an `alias`, parameters can be NameTyped:

```tao
type Title is text
type OnPress is action

// These two are equivalent:
view Example Title Title, OnPress OnPress { ... }
view Example Title, OnPress { ... }
```

And when rendering a view the arguments can also be NameTyped:

```tao
alias Title "Press me"
action OnPress { ... }

// These two are equivalent:
render Button Title Title, OnPress OnPress
render Button Title, OnPress
```

Action arguments

// Actions can be inlined, and shorthanded with `->`:
render Button Title, OnPress action { ... }
render Button Title, OnPress -> { ... }

view Example {
Button Title "Click me", OnPress action { ... } { }
Button Title "Click me", OnPress -> { ... } { }
}

// Parameter order doesn't matter:

view Example {
Button Title "Click me", OnPress -> { ... } { }
Button OnPress -> { ... }, Title "Click me" { ... } { }
}

// Parameters and arguments can be NameTyped:

type TypedOnPress is action
type TypedTitle is text
view TypedButton TypedOnPress, TypedTitle { }

view Example1 {
alias Title = TypedTitle "Click me"
action TypedOnPress { }
TypedButton TypedOnPress, Title { }
=> TypedButton TypedOnPress TypedOnPress, TypedTitle Title { }
}

view Example2 {
alias Title = "Click me"
action OnPress { ... }
Button Title, OnPress { }
=> // Error: Title is a text, not a TypedTitle
Button Title TypedTitle, OnPress TypedOnPress { }
=> // OK
}

// If no two Parameters share the same type, arguments become type-matched:

view Example1 {
view Label1 Text text { }
view Label2 Text1 text, Text2 text { }
type Label is text
view Label3 Label, Text text { }

Label1 "Hello" { } // OK
Label1 Text "Hello" { } // OK

Label2 "Hello", "World" { } // Type error: Arguments Text1 and Text2 are both strings
Label2 Text1 "Hello", Text2 "World" { } // OK

Label3 Label "Hello", "World" { } // OK
Label3 Label "Hello", Text "World" { } // OK
alias Greeting = Label "Hello" { }
Label3 Greeting, "World" { } // OK, because typeof Greeting is Label.
}

// If a parameter has type <TypeName>, and alias <TypeName> = <TypeName> <Value> would be legal , then <TypeName> <Value> is a valid argument.

view Example {
alias TypedTitle = TypedTitle "Press"
action TypedOnPress -> { ... }
TypedButton TypedTitle, TypedOnPress { } // OK
TypedButton TypedTitle "Press", TypedOnPress -> { ... } { } // Also OK
=> Effectively, this becomes the same conceptually as:
=> TypedButton TypedTitle (TypedTitle "Press"), TypedOnPress (TypedOnPress -> { ... }) { }
}

````
## Items (Objects/Structs)

An Item has any number of properties. Each property has a name and a typed value. They are similar to objects in typescript, or structs in go.

```tao
type <Item Type> is {
  <Property Name> <Property Type>,
  <Property Name> <Property Type>,
  ...
}
alias ExampleItem = <Item Type> {
  ...
} => typeof ExampleItem is <Item Type>

// e.g:
type Person is {
  FirstName FirstName,
  LastName, // Shorthand for: `LastName LastName`
  Age number,
  Job { // This also defines a type, named `Person.Job`
    Title text
  }
}
````

To use an item, you can use the item literal syntax. Each property is assigned a value the same way that an `alias` is. In addition

```tao
alias RoAge = 40
alias Person {
FirstName "Ro",
LastName, // Shorthand for: `LastName LastName`
RoAge, // Type-matches to `Age`

}

alias = Person {
Age = Person.Age 30, // Full form: `PropertyName = PropertyType PropertyValue`

FirstName, // Shorthand for `FirstName = Person.FirstName FirstName`
LastName "Doe", // == `LastName = Person.LastName "Doe"`
LocalizedFirst FirstName, // == `LocalizedFirst = LocalizedFirstName FirstName`
Alias = FirstName "John Doe" // == `Person1.Alias = FirstName "John Doe"` Not optional: compile-time deduced to type of FirstName "John Doe"
Job // == `Person1.Job = (missing Person1.Job) | (Person1.Job { Person1.Job.Title "Developer" })`
}

view ExampleView { ... } // == `alias ExampleView = view ExampleView { ... }`

action Example { // == `alias Example = action Example -> nothing { ... }`
alias Job { Title "Developer" } // == `alias Job = { Title text } { Title "Developer" }`
set Person.Job = Job // Not OK
set Person.Job { Title "Developer" } // OK: == `set Person.Job = Person.Job { Title "Developer" }`
set Person.FirstName = Person.LastName // type error
set Person.FirstName = Person.FirstName Person.LastName // OK type cast
}
```

## Lists (Arrays)

```tao
state FollowedPeople list of Person[]
state SelectedPerson Person

view MyFollowedPeople {
  // Render the list of friends
  List FollowedPeople, view Person {
    Text Person.Name
    // Make each list item pressable, to select the person
    MakePressable action {
      set SelectedPerson Person
    }
  }
}

Display the selected person's profile:
view ProfilePage {
  alias Person = SelectedPerson
  Text "${Person.Name}'s Profile"

  // Set the button text based on whether the person is followed.
  // Whenever `Person.IsFollowed` changes, this button text also automatically updates.
  alias ButtonText when
    Person.IsFollowed -> "Unfollow"
    otherwise -> "Follow"

  // Display a button to follow/unfollow this person"
  Button ButtonText, OnPress action {
    append FollowedPeople Person
    toggle Person.IsFollowed
  }
}
```

## Future: Typed Units

Numeric types can be defined with units, which allow for type-safe specification of what unit of measurement a given value is - e.g for

- UI sizes: `20rem`, `30%`, `40vh`, ..
- Durations: `100ms`, `56ns`, `1min`, `10hr`, `1day`, ..
- Distances: `100km`, `25yd`, `6.5ft`, `23504nm`, ..

Also see `Tao Std Lib Types.md`[`./Tao Std Lib Types.md`] for more examples.

## Future Constrained Type Values

TODO: Describe constrained type values, e.g `type Age is number between 0 and 100`

## Union Types and Type Matching

When a value could be multiple possible types, you use `union` to represent them:

```tao
type DogName is text
type CatName is text
type PetName is DogName | CatName

alias CatName "Rex"
alias DogName "Whiskers"

// Both of these `Pet` aliases would be valid, despite
alias Pet = PetName (either CatName OR DogName)
```

To work with a union type, you use type matching with `when`:

```tao
when Pet is
  DogName -> "${DogName} says Woof!"
  CatName -> "${CatName} says Meow."
```

You can use the value of `when ..` anywhere:

```tao
alias Sound = when Pet is
  a DogName -> "${DogName} says Woof!"
  a CatName -> "${CatName} says Meow."

view Example {
  Text Value when Pet is
    a DogName -> "${DogName} says Woof!"
    a CatName -> "${CatName} says Meow."
}
```

Tao will ensure you handle all possibilites, to avoid undefined behavior. If a possible type isn't handled in a `when` expression, tao will let you know (loudly):

```tao
alias PetName = ...
alias Sound = when PetName is
  a CatName -> "${CatName} says Meow."
  // Type error: PetName could be DogName
```

## TODO: Value Matching

You can also match values with different possible outcomes:

```tao
when Person.Age is >= 18 { ... }
  or Person.Age is < 18 and Person has Guardian { ...}
  otherwise { ... }
```

TODO: Ensure that when-value expressions are exhaustive?

## Optional Values

A type can allow for `optional` values; and any optional value can be `missing`.

```tao
typeof optional T => T | missing T
// e.g:
type Nickname is optional Name
  => typeof Nickname is optional (typeof Name)
  => typeof Nickname is Name | missing Name
```

## Remote Data and Files

Most apps use data from servers or the file system. To ensure loading and missing values are handled in the UI, you use `guard`:

For any missing value, `guard` will show the exception UI and halt view rendering until the value is no longer missing.

```tao
type MyWeekendPlan is optional text
alias MyWeekendPlan = ...

view WeekendCalendar {
  guard MyWeekendPlan {
    // In here, MyWeekendPlan is `missing`.
    // Code execution halts here, until MyWeekendPlan is no longer missing.
    Button "Text Friend", -> {
      do TextFriend "Wanna make plans for the weekend?"
    }
  }
  Text "This weekend I'm ${MyWeekendPlan}!"
}
```

## TODO: Loading and Missing Values

Server and file system data can take some time to fetch and load. Users expect visual indications while this is happening. Tao ensures that loading values are handled in the UI.

```tao
////
```

## TODO: Safe Missing Values

Tao ensures any missing values are handled in the UI:

```tao
view WeekendCalendar {
  // Type error: MyWeekendPlan can be missing.
  Text "This weekend I'm ${MyWeekendPlan}!"
}
```

To guard all possible missing values, you can use `guard all`:

```tao
view WeekendCalendar {
  guard all {
    // In here, all possible missing values are handled.
    Text "Missing necessary information"
  }
  // All optional values are guaranteed to not be missing below here.
  ...
}
```

```tao
action ExampleAction { ... } // Shorthand: `alias ExampleAction = action ExampleAction { ... }

type OnPress is action

action Greet FirstName, optional LastName,  { } // Shorthand: `alias Example = action { }`

view Examples {
  Button OnPress action { ... }
}
```

#### TYPE MATCH:

```tao
alias Person2 = Person {
  30, // <- Age, only type match
  FirstName, // <- FirstName, only type match
  LastName "Doe", // <- LastName, only type match
  LocalizedFirst FirstName, // <- LocalizedFirst, only type match
  Alias = FirstName "John Doe", // <- Alias, only type match
  Job { "Developer" }, // <- Job, only type match
}

// Types can be referenced by their Type property
alias Job = Person.Job { Title "Developer" }
```

## Type inference

```tao
alias Age = 30 // inferred type is number
alias Name = "John" // inferred type is text
alias Person = { Name "John", Age 30 } // inferred type is { Name text, Age number }
```

# Importing types

```tao
use type Person from @library/personel
// Equivalent to
use entire @library/personel
type Person = personel.Person
```

## Down-typing

A type can be down-typed to any parent type.

```tao
type Person is { Name text, Age number }
type Employee is Person
type Manager is Employee { Role text }

view Greet Person {
  Text "Hi " + Person.Name + "!"
}
view Hire Employee {
  Text "Hiring " + Employee.Name + "!"
}

view Example {
  alias Person { Name "John", Age 30 }
  alias Employee { Name "John", Age 30 }
  alias Manager { Name "John", Age 30, Role "Manager" }
  Greet Employee { }
  Greet Manager { }
  Hire Person { } // type error, Person is not an Employee
}
```

### Code Injections

Tao compiles to code, and that code then runs in an app runtime. Current implementatins compile to typescript that runs in an expo react native runtime. The rawest form of interacting with the underlying runtime is with 'inject `ts <code>`'. It copies the injected code straight into the compiled output, at the corresponding compiled location.

````tao
view Text Value text {
  inject with Value ```ts
    return <ReactNative.Text>
      {Value.render()}
    </ReactNative.Text>
  ```
}
````

## Optional properties and their default values

```tao
type Employee is { Name text, Age number, Role? text }
alias Employee { Name "John", Age 30 }
view Example {
  when Employee.Role
    is text -> Text Employee.Role
    is ? -> Text "No role"
  Text Employee.Role // type error, Role is optional and has no default value
}
```

## Optional arguments and their default values

## Value guards: INCOMPLETE, DEFER

For LOADING and MISSING

Render w multiple guards:

```tao
view Example {
  Box {
    guard loading {
      // If ANY data access is loading and unguarded within this view, this will render instead of anything below it.
      Text "Loading..."
    }
    Text "All data present!"
  }
  Box {
    guard loading {
      Spinner { }
    }
    Text "Yaaaay"
  }
  guard missing, loading {
    // If ANY data access is missing or loading and unguarded within this view, this will render instead of anything below it.
  }
}
```

```tao
type Employee is { Name text, Age number, Role? text }
view Example {
  guard loading {
    // If ANY data access is loading and unguarded within this view, this will render instead of anything below it.
  }
  guard missing, loading {
    // If ANY data access is missing or loading and unguarded within this view, this will render instead of anything below it.
  }

  guard loading Employee.Role {
    // For async data, if anything in the member access chain is loading, this will render instead of anything below it.
    Text "Loading data ..."
  }
  guard missing Employee.Role {
    // If for whatever reason a value in the chain is missing, e.g network error or received incomplete data, guard here
    Text "Could not load this data"
  }

  Col {
    Text Employee.Role // type error, Role is optional and has no default value


    check reloading Employee.Role {
      // Render this if Employee.Role is reloading, but continue rendering anything below
      Spinner
    }

    check Employee.Role {
      Text "No role"
    }
    Text Employee.Role // no type error, Employee.Role is checked
  }
}
```

## Functions

```tao
func Greet Person, Prefix text -> text {
  Text Prefix + " " + Person.FirstName + " " + Person.LastName + "!"
}
```

## Interfaces

```tao
interface Addressable {
  Name,
}

type Dog { Name text, Owner Person }

alias Person { Name "John", Age number }
alias Dog { Name "Rex", Owner Person }

func Greet Addressable {
  Text "Hi " + Addressable.Name
}
```

## Generics

TODO. NOT FIGURED OUT. DEFER

```tao
// type List is (T) {
//   items: [T],
// }

// alias List is (T) {
//   items: [T],
// }
// type MapFunc is (ItemT) -> Results
//   where ItemT is any, Results is any[]
// func map Items Item[], MapFunc with output Results {
//   for item in Items {
//     output MapFunc(item)
//   }
// }
```

## Review pass: inconsistencies to reconcile

These are internal contradictions in this file (and with `Type System.md`) that need a decision before the notes can be promoted into the main doc.

- [ ] **Auto-promotion of `alias X = <literal>`.** `Type System.md` says auto-declare `type X is <primitive>`; this file's Type-inference section (line "inferred type is number") and line 20 (`alias Bar = Foo // inferred to number`) read as **no** auto-promotion. But line 28 (`SunRounds Age`) only type-checks if `Age` was auto-promoted. Pick one.

alias Foo = 1 // shorthand for `alias Foo = number 1`
alias Bar = Foo // Bar type is inferred to Foo type

alias Person {
SunRounds Age, // Declare field SunRounds of type Age
}

**Recommendation:** **middle-ground auto-promotion** (Alt #2 below). Auto-promote `alias X { ... }` / `alias X action { ... }` to a fresh nominal `type X`, since struct and action literals have no short written-type form. Do **not** auto-promote bare-literal `alias X = 30` or `alias X = "foo"` — leave those at plain `number` / `text`. Under this rule: `alias Foo = 1` → `Foo: number`, `alias Bar = Foo` → `Bar: number`. For line 28 to work, declare `type Age is number` explicitly in the example.

- [ ] **Optional syntax.** Lines 29-30 use `optional FirstName` / `optional { Title text }`; line 148 and `Type System.md` use `Role?` / `Job? { ... }`. Pick `?` or `optional`.

  **Recommendation:** keep `?` postfix on the field name (`Role?`, `Job?`). Matches `Type System.md`, matches TS/Swift/Rust, is shorter, and composes cleanly with `is ?` in `when` arms. Delete the `optional` keyword usage on lines 29-30.

- [ ] **`type X is Y` vs `type X = Y`.** `is` is used everywhere except line 102 (`type OnPress = action`) and line 87 (`type Person = personel.Person`). Unify (suggest: `is` only; use `use type …` for cross-module re-export).

  **Recommendation:** `is` is the one and only type-declaration keyword. Fix line 102 → `type OnPress is action ->`. Delete line 87 — cross-module re-export is already covered by `use type Person from @library/personell`, no second form needed.

- [ ] **`action` vs `action ->`.** Lines 64, 95, 102 use bare `action`; lines 109, 111, 115 use `action ->`. `Type System.md` Stage 10 commits to `action ->`.

  **Recommendation:** always `action ->` when used as a **type**. Bare `action` remains legal as a **declaration keyword** (`action Foo { ... }`). Fix lines 64, 95, 102 accordingly.

- [ ] **`view Foo with Params` vs `view Foo Params`.** Line 96 uses `with`; 108-109 do not. Decide if `with` is sugar, required for ≥2 params, or dropped.

  **Recommendation:** **drop `with`.** One syntax: `view Foo Param1, Param2 { ... }`, matching action and func declarations. Keeps the grammar small. Fix line 96.

- [ ] **Import-everything syntax.** Line 86 uses `use entire @library/personel`; earlier drafts use `use * from @library/personel`. Pick one.

  **Recommendation:** `use * from @library/personell`. `*` is universally recognized (JS/TS/Python); `entire` reads like a new keyword for no gain. Pair with `use type Person from @pkg` (type only) vs `use * from @pkg` (everything).

- [ ] **Misc typos.** Line 238 is missing `is` (`type Dog { ... }` → `type Dog is { ... }`). Line 240 uses `Age number` as a value (should be `Age 30`). `personel` vs `personell` spelling drifts.

  **Recommendation:** fix all three in place. Standardize on `personell` (matches `Type System.md`). Pure cleanup — no design trade-off.

- [ ] **Nested `T1 T2 value` syntax.** Line 17 (`LocalizedFirstName FirstName "Jǒhn"`) is never grammatically defined. Either document what nested type-tagging means, or delete.

  **Recommendation:** **delete line 17.** A value has one nominal type; "double-wrap" isn't a coherent operation. If the intent was "build a `LocalizedFirstName` from a `FirstName` value", the readable form is `alias LocalFirst = LocalizedFirstName (FirstName "Jǒhn")` — but that's tag-of-a-tagged-value and only makes sense once Alt #4 (explicit tag syntax) is decided. Until then, the line is just noise.

- [ ] **Shorthand expansion text on lines 34-35.** `FirstName // shorthand for 'FirstName = FirstName FirstName'` is misleading — the shorthand resolves to the same-named binding, not to re-tagging. Reword.

  **Recommendation:** reword to `FirstName // shorthand: field 'FirstName' assigned from the same-named binding in scope`. Analogously on line 35: `LastName "Doe" // shorthand: field 'LastName' = LastName "Doe" (a LastName-tagged text)`.

## Alternative approaches to consider

Captured here so the design stays honest about what we're _not_ picking.

1. **Drop auto-promotion entirely (Rust/Haskell `newtype` discipline).** `alias Age = 30` gives `Age` type `number`. If you want a nominal distinction, write `type Age is number; alias Age = Age 30`. Simplest, most predictable; the trade-off is more boilerplate for throwaway nominal types.

   **Recommendation:** **reject as the full rule, but take half of it.** Pure-Rust-discipline for primitive literals is good (see Alt #2 rec) — avoid surprising newtype creation. But forcing users to write `type Todd is { ... }` before `alias Todd { ... }` doubles every struct-literal introduction. Adopt this rule **only** for primitives; allow auto-promotion for structs/actions.

2. **Middle-ground auto-promotion.** Auto-promote only when the inferred type has no short written form (e.g. struct literals): `alias Todd { Name "Todd", Age 30 }` promotes `type Todd is { ... }`, but `alias Age = 30` stays raw `number`.

   **Recommendation:** **adopt.** This is the sweet spot: nominal-by-default where it matters (structs/actions — the place name-identity is actually useful), primitive-transparent where nominal distinction is mostly noise. Update Stage 2 in `Type System.md` to narrow the auto-promotion rule to non-primitive literals.

3. **`:` as field separator.** `type Person is { Name: text, Age: number }` disambiguates field-name/type from field-name/value in a struct literal, and matches TS/Swift.

   **Recommendation:** **reject.** Tao's whole design language is juxtaposition-based (`Text "hi"`, `Button OnPress`, `view Foo Person`); introducing `:` just for type fields would create a stylistic fork. Instead, keep juxtaposition and disambiguate via position rules ("in a field-declaration position, the second token is the type; in a field-literal position, the second token is the value"), which is already what the notes imply. The current ambiguity is a _documentation_ failure more than a _syntax_ failure.

4. **Explicit tag syntax.** Replace `FirstName "John"` with `FirstName("John")` (call-like) or `FirstName of "John"` (keyword). Removes one juxtaposition meaning from the grammar.

   **Recommendation:** **reject for now, revisit if nested tagging (Alt line 17) is ever needed.** Same rationale as #3: juxtaposition is the house style. Paren-wrapping is already available as a disambiguator (`LocalizedFirstName (FirstName "Jǒhn")`) without elevating it to the canonical form. Keep `FirstName "John"` idiomatic.

5. **Split namespaces for types and values.** `type Person is ...` and `alias Person = ...` live in different namespaces; all cross-namespace references are explicit. Removes the "does `Name` mean the type or the binding" ambiguity.

   **Recommendation:** **reject — keep one namespace.** Half the file's ergonomic wins (`alias Person { ... }` shorthand, `use type Person`, `SunRounds Age` field shorthand) rely on the fact that a single `Person` identifier can stand for both the type and the canonical-in-scope value. Splitting the namespaces would force sigils (`Type/Person`) or qualified references and kill the terse feel. Document the lookup rule instead: "when a name appears in type position, resolve in the type scope; in value position, value scope. A single `type` declaration makes the name available in both."

6. **Structural by default, nominal on opt-in** (inverted from the current plan). `type` is structural (like TS); a separate keyword — `newtype`, `brand`, or `nominal type` — opts into nominal identity. Aligns better with Typir's class-type direction; costs us the current one-keyword simplicity.

   **Recommendation:** **reject.** Tao's domain language (`FirstName` vs `LastName`, `Employee` vs `Manager`) wants nominal identity as the default — that's the headline feature of the type system examples. `interface` is already the structural escape hatch. Keep `type` nominal.

7. **Structural pattern matching only.** Require `when e.kind is "Dog" -> ...` (field-discriminated unions) rather than `when e is Dog -> ...`. Avoids the nominal runtime-tag codegen pass described in Stage 6 / Design Decisions.

   **Recommendation:** **reject.** `is <Type>` matching is a core ergonomic promise of a nominal system; giving it up just to skip the pay-as-you-go codegen pass trades a lot of end-user ergonomics for a small implementation cost. Keep nominal matching; accept the runtime-tag pass.

8. **`with` is always accepted, formatter decides.** Parser accepts both `view Foo Person, OnPress` and `view Foo with Person, OnPress`; formatter normalizes (e.g. `with` when ≥2 typed params). Splits the difference instead of picking one.

   **Recommendation:** **reject.** Accepting two spellings expands the grammar and invites bikeshedding in every PR ("why'd the formatter pick the other one?"). Pick one (dropped — see Review #5) and move on.

9. **Bindings lowercased, types PascalCase.** `view Greet person Person { Text "Hi " + person.Name }`. Always explicit binding name; eliminates `Name` / `name` / `Person` / `person` drift seen on line 97.

   **Recommendation:** **reject.** Would break every shorthand in the file — `alias Person { FirstName, ... }` would have to become `alias person = Person { firstName, ... }` etc. The casing drift on line 97 is a typo, not a signal that the convention is wrong. Keep PascalCase for both; the "field / value binding that shares a type's name" shorthand is too valuable to give up.

10. **Nominal identity preserved implicitly across modules (no `use type` needed).** `use X from @pkg` already brings the type into the type scope; `use type` is sugar for "only the type, not values". Simpler surface, matching TS behavior.

    **Recommendation:** **adopt (partially).** Make `use Person from @pkg` bring both the type and any same-named value into scope (the common case), and keep `use type Person from @pkg` as the **narrow** form when you want only the type. This matches how `type Person is { ... }` introduces the name into both namespaces locally — the same should be true across modules.

## Open design questions to answer next

- [ ] Keep auto-promotion, drop it, or use the middle-ground rule?

  **Recommendation:** middle-ground — auto-promote struct and action literals to a fresh nominal type; keep primitive literals untyped. (See Review #1 / Alt #2.)

- [ ] One namespace for types + values (current, implicit) or two (explicit, fewer surprises)?

  **Recommendation:** one namespace, with a documented lookup rule ("name resolved in type scope when used in type position, value scope when used in value position; `type X is …` installs X in both"). (See Alt #5.)

- [ ] Is `{ ... }` without a nominal tag ever legal (contextual typing from the expected type)? Current notes say no (line 46).

  **Recommendation:** **yes — allow it when the expected type is unambiguous.** `set Person.Job = { Title "Developer" }` should type-check: the LHS is known to be `Person.Job`, so the untagged struct literal adopts that type. Same for function arguments and `alias X = <Tag> { ... }` targets. Rationale: Tao's surface already does contextual typing heavily (field shorthand, name-matching arguments); refusing it here is inconsistent. Flip line 46 from "Not OK" to OK; keep the **explicit mismatch** case (`set Person.Job = { TitlE "…" }` with a typo, or a shape that doesn't fit) as the error.

- [ ] What exactly does nested tagging (`LocalizedFirstName FirstName "Jǒhn"`) mean — document it or drop.

  **Recommendation:** drop. A value has one nominal type. If you need tag-of-tagged-value, parenthesize: `LocalizedFirstName (FirstName "Jǒhn")`. (See Review #7.)

- [ ] Parameter-binding names: always required (`person Person`), or optional when binding name = type name (`Person`)?

  **Recommendation:** **optional when binding name = type name** (i.e. keep the current shorthand). Requiring an explicit lowercase binding would bloat every view/action/func signature for no real win. Spell the binding only when it differs from the type (`view Greet sender Person, target Person { ... }`), which also nicely forces disambiguation when two params share a type — and aligns with the "same-type colliding params need named args at call site" rule.

- [ ] Do we want `action -> (T)` (parameterized action types) in Stage 10, or only the parameterless form?

  **Recommendation:** **defer to a post-Stage-10 milestone.** Stage 10 ships `action ->` as parameterless. Add `action -> (T1, T2)` when the first real use case appears (likely around Stage 7 `func` generalization, or when we add event-carrying UI handlers). Reserving the grammar now (`->` followed by optional parenthesized type list) keeps the door open without implementation cost.

## INCORPORATE:

- [ ] **Action type:** Nominal `action`, structural, or defer Stage 5 until functions exist?

  **Recommendation:** **both, as already decided in `Type System.md` Stage 10 / Design Decisions.** Structural `action ->` as the anonymous base, nominal `type Foo is action ->` as named wrappers. No need to defer — Stage 10 (post-interfaces) is the right slot.

- [ ] **Cross-module types:** Can `use` import a type name, or types are file-local until a later milestone?

  **Recommendation:** file-local through Stages 0-8; `use type` lands at **Stage 9** (already scheduled in `Type System.md`). Combine with Alt #10 rec: plain `use X from @pkg` also brings the type in; `use type X from @pkg` is the type-only form.

- [ ] **Typir vs roadmap:** Typir's roadmap includes structurally typed classes (planned). Does Tao prefer **nominal** `type` names only, **structural** `{ }` only, or both — and does that match Typir timeline or require custom Typir types?

  **Recommendation:** **both.** `type` = nominal (primary surface), `interface` = structural (escape hatch). Until Typir's structural-class support matures, implement `type` struct via a **custom Typir `Kind`** (nominal wrapper over a field map) and `interface` via Typir's existing structural helpers. Revisit the custom kind once Typir classes ship; migration risk is low because the kind is internal.

- [ ] **IDE:** Same `TaoWorkspace` / document builder pipeline as CLI compiler for diagnostics, or separate path?

  **Recommendation:** **unified pipeline** (already `Type System.md` Design Decision). One document builder, one Typir graph, consumed by both the CLI and the VSCode/Cursor extension. Do not diverge.

- [ ] **Test apps:** One app per stage vs one "Type Kitchen Sink" app; required scenario.json coverage?

  **Recommendation:** **one focused app per stage** (already `Type System.md` Design Decision), plus compiler unit tests. A kitchen-sink app becomes unreadable by Stage 4 and buries which feature broke. Per-stage apps stay <100 lines of Tao each and pair cleanly with per-stage regression.

- [ ] **`if item is T`:** Requires runtime tags / discriminants — is that aligned with Tao's near-term semantics or postposed until unions exist?

  **Recommendation:** the `when … is T` form lands at Stage 6 with **pay-as-you-go discriminants** (already `Type System.md` Design Decision). A plain `if item is T` expression is unnecessary — `when` covers it. Do not add a separate `if … is …`; remove any speculative mention.

- [ ] **Unify `set` target AST** (Critical Look #2): Worth doing before type checking, or type checker walks both shapes?

  **Recommendation:** **unify before Stage 3 (structs).** The type checker walking two shapes for `set Person.Field = …` vs `set Person = …` is cheap short-term cost but multiplies every subsequent change (subtyping, optionals, interfaces all have to special-case both). One AST node with an optional path segment is the cleaner foundation. Land the refactor as a pre-Stage-3 chore.

## Type functions: DEFER

```tao
type Greeting is text
type Person is { FirstName, LastName } with {
  Greeting: "Hi " + FirstName + " " + LastName + "!", // typed as Greeting
  Greeting: 1, // type error, not a text
  Foo: "Bar", // type error, no type "Foo"
}

alias Person = Person { FirstName "John", LastName "Doe" }
alias Greeting = Person.Greeting // type Greeting
```
