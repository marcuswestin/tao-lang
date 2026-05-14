# Layout and Styling Project Plan

Tao's visual surface covers positioning, sizing, spacing, appearance, themes, and their interaction with React Native/Expo.

## Status

- **Layout syntax:** implementation underway; grammar, validation, codegen, and runtime shapes are defined.
- **Theme system:** core model decided; theme is a primitive dictionary, values propagate down the view tree, and adaptation selector syntax remains open.
- **Styling syntax:** deferred until the theme/value pipeline is proven; `( ... )` is the leading delimiter candidate.
- **Transforms and motion:** deferred into a separate project track.

## Key Decisions

- `[ ... ]` is the layout delimiter; styling will not reuse it.
- Layout v1 uses actual values, not theme tokens.
- Themes declare named primitives and do not know about specific views.
- Views own their styling and reference theme tokens by property type.
- Raw literals remain escape hatches; named tokens are the normal path once themes exist.
- Default themes should provide tasteful app-specific defaults without required configuration.

## Document Map

- [UI Layout Design Doc](./UI%20Layout/UI%20Layout%20Design%20Doc.md): authoritative layout syntax, validation, runtime mapping, and key/value catalog.
- [UI Theme Design Doc](./UI%20Themes/UI%20Theme%20Design%20Doc.md): theme primitives, propagation, adaptation, variants, and defaults.
- [UI Styling Design Doc](./UI%20Styling/UI%20Styling%20Design%20Doc.md): styling boundary, likely syntax, and unresolved styling choices.
- [UI Styling Syntax Exploration](./UI%20Styling/UI%20Styling%20Syntax%20Exploration.md): styling alternatives, property catalog, token ideas, and design-system references.
- [UI Layout and Styling Raw Notes](../../Archive/UI%20Layout%20and%20Styling%20Raw%20Notes.md): historical notes only.

## Step 1. Layout Syntax Only

Goal: parse, validate, format, compile, and run bracketed layout clauses.

Scope:

- Add optional `[ ... ]` layout clauses to view renders.
- Use raw layout values only: lowercase words and numeric values.
- Do not implement themes, named tokens, styling, transforms, animation, or interaction syntax.
- Allow one layout clause per render statement.
- Reject top-level layout statements in view bodies.
- Generate the parsed layout parameters and values at the render site.
- Convert those layout parameters and values to React Native Flexbox styles in the Tao runtime.

Implementation details:

- Grammar: parse bracketed layout clauses after view arguments and before optional blocks.
- AST: represent layout as typed nodes, not unstructured strings.
- Validation: check known property names, known values, duplicate values, axis conflicts, and React Native support.
- Formatter: preserve canonical bracket formatting.
- Codegen: pass the validated layout parameters and values to a Tao runtime helper at each render site.
- Runtime: translate Tao layout parameters and values to React Native style props and merge them with existing view styles.

Frozen v1 surface:

- Flow: `row`, `column`, `wrap`, `nowrap`.
- Children arrangement: `top`, `right`, `bottom`, `left`, `center`, `stretch`, `pack`, `spread`, `around`, `evenly`.
- Spacing: `gap`, `row_gap`, `column_gap`, `pad`, side-specific `pad`, `margin`, side-specific `margin`.
- Size and flex: `width`, `height`, `min_width`, `max_width`, `min_height`, `max_height`, `grow`, `shrink`, `basis`.
- Self layout: `centered`, `stretched`, `packed`.
- Position and layering: `relative`, `absolute`, `top`, `right`, `bottom`, `left`, `z`.
- Percent values are included for size, basis, and offsets in v1; raw numeric values remain React Native logical pixels/points.

Exit criteria:

- Parser tests cover no-arg renders, renders with args, renders with blocks, multiline layout clauses, and malformed clauses.
- Validation tests cover unknown words, duplicate scalar props, axis conflicts, styling words inside layout, and unsupported React Native props.
- Formatter tests prove one-line and multiline layout clauses are idempotent.
- Codegen tests show structured layout data emitted at render sites.
- Runtime tests show Row/Col child layout and self layout map to React Native styles.

## Step 2. Themes, Values, And Type Safety

Goal: decide how Tao themes work before implementing styling.

Scope:

- Define the theme declaration model and typed theme value categories.
- Decide how theme values flow into layout spacing, sizing, and future styling.
- Decide how raw layout values and named theme values coexist after layout v1.
- Decide type safety rules for theme properties, layout specs, style values, and inline overrides.
- Decide how app defaults are selected or generated while preserving the core tenet that everything works out of the box.
- Decide whether theme values are compile-time constants, runtime-resolved values, or both.
- Decide how adaptation modes such as dark mode, platform, screen size, text scale, reduced motion, and locale affect theme values.
- Decide style/theme override hierarchy and diagnostics.

Exit criteria:

- A reviewer can explain how a spacing, color, or text style value is declared, typed, resolved, validated, and emitted.
- Invalid value-type usage has a planned diagnostic shape.
- The model covers default themes and app-specific theme variation without required app configuration.
- Styling syntax can build on a concrete typed value system.

## Step 3. Styling Syntax And Style Coverage

Goal: design and implement styling after the theme/value pipeline is clear, without letting styling leak into `[ ... ]`.

Scope:

- Decide the styling delimiter, with `( ... )` as the leading candidate.
- Define typed style values and style references using the theme/value model.
- Decide inline style override rules.
- Cover React Native view styles, text styles, image styles, shadows/elevation, opacity, borders, radius, color, typography, and component variants.
- Decide how unsupported, platform-specific, or native-library-specific style surfaces are represented.
- Generate React Native `StyleSheet.create` output plus Tao runtime helpers unless an external library becomes necessary.

Exit criteria:

- Layout remains geometry-only.
- Styling supports at least text, color, background, radius, border, shadow, opacity, and variants.
- Generated TSX remains readable and avoids creating ad-hoc static style objects on every render.

## Step 4. Transforms And Motion

Goal: add post-layout visual geometry and transitions over time.

Primary doc: [Animations Project Plan](../Animations%20Transformations%20and%20Motion/Animations%20Project%20Plan.md).

Initial direction:

- Transform is separate from layout because React Native transforms do not affect layout measurement.
- Motion should start with transform and opacity animation because those are the safest React Native targets.
- Layout and position animation need a deliberate runtime strategy.

## Step 5. Interactions And Events

Goal: define how views respond to user, time, network, and platform events.

Primary doc: [Interactions Project Plan](../Interactions%20and%20Events/Interactions%20Project%20Plan.md).

Initial direction:

- Use `on event_name` for event responses.
- Use `does event_name` for declared events a view can emit.
- Keep interaction state styling separate from event response logic.

## Step 6. Internationalisation, Accessibility, And Adaptation

Goal: make semantics, locale, direction, text scale, device posture, platform, accessibility requirements, and compiler enforcement policy first-class design concerns.

Primary doc: [Internationalisation and Accessibility Project Plan](../A11y%20I18N%20and%20L10N/Internationalisation%20and%20Accessibility%20Project%20Plan.md).

Initial direction:

- React Native/Expo support is the runtime authority.
- Platform-only behavior must map to a Tao runtime helper, validation error, or explicit runtime error.
- Physical layout words such as `left` and `right` need a future logical-direction story before Tao claims full localization support.
- Tao should support category-specific warning policy for accessibility and internationalisation.

## Key Files For Step 1

- Grammar: `packages/parser/tao-grammar.langium`
- Validation: `packages/compiler/compiler-src/validation/`
- Typing/argument binding: `packages/compiler/compiler-src/typing/`
- Formatter: `packages/formatter/formatter-src/TaoFormatter.ts`
- Codegen: `packages/compiler/compiler-src/codegen/app/runtime-gen.ts`
- Runtime views: `packages/tao-std-lib/tao/tao-runtime/Views.tsx`
- Standard UI declarations: `packages/tao-std-lib/tao/ui/Views.tao`
- Tests: parser, compiler, formatter, headless runtime, and `Apps/Test Apps/`

## Risks

- Bare alignment words need known container direction. Validation must not guess silently.
- Scroll behavior should not be hidden behind layout syntax because React Native scroll usually means `ScrollView`.
- Theme support can easily outgrow layout v1; keep it deferred until raw layout works.
- Styling should not start until theme values and typed token flow are decided.
- Empty views can collapse in React Native; debug defaults or validation can be considered after core layout works.
- Custom views need a future way to declare their container/layout role so bare child-arrangement words can be axis-validated outside known built-ins such as `Row`, `Col`, and explicit `row`/`column`.
