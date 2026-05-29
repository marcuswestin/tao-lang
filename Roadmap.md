# Tao MVP Roadmap

1. Control Syntax and Statements Mini Slice
2. Canonical Buildable App MVP
3. Beautiful App Defaults Mini Slice plus Minimal Form UX

## Control Syntax and Statements Mini Slice

Implement the narrow reviewed control-syntax slice: comparisons, `.Empty`,
statement-form `if` / `else`, nested render control, pure top-level functions,
explicit calls, and `return`.

This is a true MVP blocker because it unlocks conditional rendering, empty and
content states, query-state branching, optional rendering, and small computed
values without turning Tao into a general-purpose control-flow language.

## Canonical Buildable App MVP

Select and build one canonical app as the forcing function for remaining Tao v1
decisions. Prefer Still as the first target because it exercises local data,
relationships, first-run empty states, create flows, conditional rendering,
navigation, interactions, and polished defaults in a bounded product shape.

This is an MVP blocker as a roadmap driver because it keeps language, runtime,
forms, data, and UX decisions anchored to one coherent app experience instead
of isolated subsystem expansion.

## Beautiful App Defaults Mini Slice plus Minimal Form UX

Start with the smaller visual-defaults mini slice: polished defaults for core
text, input, number, and button primitives; a centered app-shell content frame;
seeded accent color; and minimal loading, empty, error, disabled, and submit
states where needed by the canonical app.

This is partly an MVP blocker and partly a quality multiplier. Tao can already
render apps, but a compelling v1 needs first-run screens and forms to feel
intentional without requiring source-authored styling, template selection, or
full design inference.
