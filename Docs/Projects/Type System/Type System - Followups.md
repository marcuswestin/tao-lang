> **Type system docs:** [Type Design - Preferred](./Type%20Design%20-%20Preferred.md) · [Type Design - Alternatives](./Type%20Design%20-%20Alternatives.md) · [Type Implementation - Execution plan](./Type%20Implementation%20-%20Execution%20plan.md) · [Typir and Langium guide](./Typir%20and%20Langium%20-%20Implementation%20guide.md)

# Type System — Followups

## Type Matching

### Completed:

1. Phase 1 — View-local parameter types: a view can declare a local nominal parameter type.

```tao
view Badge Title is text { }
Badge Title "Hello"
Badge Badge.Title "Hello"
```

2. Phase 2 — Dot shorthand for views: .Title means the current callee’s local Title type.

```tao
view Badge Title is text { }
Badge .Title "Hello"
```

3. Phase 3 — Action-local parameter types: actions get the same local parameter type model.

```tao
action Bump Step is number { }
do Bump .Step 3
```

4. Phase 4 — Contextual typed-literal values: typed constructors can wrap full argument-bounded expressions.

```tao
Button .Title "Hello " + Name
do Bump .Step Amount + 1
```

### Outstanding:

5. Phase 5 — Type-matching ergonomics: most-specific type matching chooses the closest parameter type.

```tao
type Person is { Name text }
type Employee is Person
view Show Person, Employee { }
Show Employee { Name "Ada" } // binds Employee, not Person
```

6. Phase 6 — Structural / optional parameter types: inline richer local parameter types.

```tao
view Profile Person is { Name text, Age number } { }
view Card Title? is text { }
```

7. Phase 7 — Functions / callable unification: extend the callable-local type model to future funcs.

```tao
func Discount Price is number, Rate is number -> number { }
Discount .Price 100, .Rate 0.2
```

8. Phase 8 — Generics / interfaces / unions integration: make local types compose with advanced type features.

```tao
view List Item is T { }
when Pet is
  Dog -> DogCard Dog
  Cat -> CatCard Cat
```
