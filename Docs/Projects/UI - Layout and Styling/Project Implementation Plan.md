# UI Layout and Styling Project Implementation Plan

This plan stages the UI work around the current decision: implement layout syntax first, without themes or styling.

## Summary

1. Implement `[ ... ]` layout syntax using actual values only.
2. Design themes, typed values, and how theme values flow into layout spacing and styling.
3. Design styling after the theme/value pipeline is clear.
4. Continue with transforms, motion, interactions, accessibility, internationalization, localization, and adaptation after layout/styling boundaries are stable.

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

Primary docs:

- [UI Layout Design Doc](./UI%20Layout%20Design%20Doc.md)
- Single per-key reference (every canonical key, every surface spelling, every value, with examples): [Layout Key And Value Catalog](./UI%20Layout%20Design%20Doc.md#layout-key-and-value-catalog)
- Alternatives summary: [UI Layout Syntax Exploration](./UI%20Layout%20Syntax%20Exploration.md)
- Preserved discussion archive: [Design WIP - UI Layout and Styling](../Design%20WIP/UI%20Layout%20and%20Styling.md)

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

Goal: stub out, explore, and decide how Tao themes work before implementing styling.

Scope:

- Define the theme declaration model.
- Define typed theme value categories, including spacing, dimensions, color, typography, radius, border, shadow, opacity, duration, easing, transform, and motion.
- Decide how theme values flow into layout spacing and sizing.
- Decide how theme values flow into future styling.
- Decide how raw layout values and named theme values coexist after layout v1.
- Decide type safety rules for theme properties, layout specs, style values, and inline overrides.
- Decide how app defaults are selected or generated while preserving the core tenet that everything works out of the box.
- Decide whether theme values are compile-time constants, runtime-resolved values, or both.
- Decide how adaptation modes such as dark mode, platform, screen size, text scale, reduced motion, and locale affect theme values.
- TODO: decide style/theme override hierarchy. Working model: an app has one base app theme; library components reference color/style names without declaring separate themes; view-local declarations or inline values can be more specific; the deepest applicable view/value wins for the child being considered. We still need to prove when overriding is necessary, how explicit it should be, and how diagnostics explain conflicts.

Primary docs:

- [UI Styling Design Doc](./UI%20Styling%20Design%20Doc.md)
- Alternatives, style property catalog, color/spacing/radius scales, and design-system references: [UI Styling and Theme Syntax Exploration](./UI%20Styling%20Syntax%20Exploration.md)

Exit criteria:

- A reviewer can explain how a spacing value used by layout is declared, typed, resolved, validated, and emitted.
- A reviewer can explain how a color or text style value will later be declared, typed, resolved, validated, and emitted.
- Invalid value-type usage has a planned diagnostic shape, for example passing a `color` where a `spacing` is required.
- The chosen model covers default themes and app-specific theme variation without requiring app authors to configure anything.
- Styling syntax can be designed against a concrete typed value system rather than inventing its own token model.

## Step 3. Styling Syntax And Style Coverage

Goal: design and implement styling after the theme/value pipeline is clear, without letting styling leak back into `[ ... ]`.

Scope:

- Decide the styling delimiter, with `( ... )` as the leading candidate.
- Define typed style values and style references using the theme/value model from Step 2.
- Decide inline style override rules.
- Cover the React Native style surface deliberately: view styles, text styles, image styles, shadows/elevation, opacity, borders, radius, color, typography, and component variants.
- Decide how unsupported, platform-specific, or native-library-specific style surfaces are represented.
- Generate React Native `StyleSheet.create` output plus Tao runtime helpers unless an external library becomes necessary.

Primary docs:

- [UI Styling Design Doc](./UI%20Styling%20Design%20Doc.md)
- Alternatives and full style property catalog: [UI Styling and Theme Syntax Exploration](./UI%20Styling%20Syntax%20Exploration.md)

Exit criteria:

- Layout remains geometry-only.
- Styling supports at least text, color, background, radius, border, shadow, opacity, and variants.
- Generated TSX remains readable and avoids creating new ad-hoc style objects for every render when values are static.

## Step 4. Transforms And Motion

Goal: add post-layout visual geometry and transitions over time.

Primary doc:

- [Animations, Transformations, and Motion](../Animations%20Transformations%20and%20Motion/Design%20Questions.md)

Initial direction:

- Transform is separate from layout because React Native transforms do not affect layout measurement.
- Motion should start with transform and opacity animation because those are the safest React Native targets.
- Layout and position animation need a deliberate runtime strategy.

## Step 5. Interactions And Events

Goal: define how views respond to user, time, network, and platform events.

Primary doc:

- [Interactions and Events](../Interactions%20and%20Events/Design%20Questions.md)

Initial direction:

- Use `on event_name` for event responses.
- Use `does event_name` for declared events a view can emit.
- Keep interaction state styling separate from event response logic.

## Step 6. Accessibility, I18N, L10N, And Adaptation

Goal: make semantics, locale, direction, text scale, device posture, platform, accessibility requirements, and compiler enforcement policy first-class design concerns.

Primary doc:

- [A11y I18N and L10N](../A11y%20I18N%20and%20L10N/Design%20Questions.md)

Initial direction:

- React Native/Expo support is the runtime authority.
- Platform-only behavior must map to a Tao runtime helper, validation error, or explicit runtime error.
- Physical layout words such as `left` and `right` need a future logical-direction story before Tao claims full localization support.
- Tao should support category-specific warning policy so teams can compile with accessibility or internationalization warnings during exploration, then fail builds on those warning categories for CI or release.

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
- Styling should not start until theme values and typed token flow are decided; otherwise styling will recreate that model ad hoc.
- Empty views can collapse in React Native; debug defaults or validation can be considered after core layout works.
- Older docs and examples may still show historical theme or styling syntax. Preserve the exploration in the WIP archive, but make new implementation work follow the authoritative layout and styling docs.
- TODO: custom views need a future way to declare their container/layout role so bare child-arrangement words can be axis-validated outside known built-ins such as `Row`, `Col`, and explicit `row`/`column`.
