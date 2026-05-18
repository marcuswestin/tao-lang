# Layout and Styling Project Plan

Tao's visual surface covers positioning, sizing, spacing, generated design values, explicit appearance, and their interaction with React Native/Expo.

## Status

- **Layout syntax:** implementation underway. The current branch has bracketed clause parsing, validation, codegen, and runtime support, while the active language contract is defined in `UI Layout Specification`.
- **Design inference:** active direction decided; Tao starts from app intent, design specs, variants, composite roles, accepted design metadata, and React Native/Expo lowering.
- **Styling syntax:** deferred until the design/value pipeline is proven; no delimiter or inline style surface is chosen.
- **Transforms and motion:** deferred into a separate project track.

## Key Decisions

- `[ ... ]` is the layout delimiter; styling will not reuse it.
- Layout v1 uses actual values, not design tokens.
- Design specs describe intent on declarations and variants; they are not style clauses.
- Composite roles are the internal presentation unit; generated tokens and styles are emitted from composites.
- Raw style literals and source-authored token dictionaries are deferred.
- Default design should provide tasteful app-specific output without required configuration.

## Document Map

- [UI Layout Concepts](../../Tao%20Language%20Design/UI%20Layout%20Concepts.md): human-facing layout model and examples.
- [UI Layout Specification](../../Tao%20Language%20Design/UI%20Layout%20Specification.md): active layout syntax, validation, merge behavior, runtime mapping, and deferrals.
- [UI Declaration and Render Slots Specification](../../Tao%20Language%20Design/UI%20Declaration%20and%20Render%20Slots%20Specification.md): declaration kinds, render roots, `@@children`, named slots, renderer slots, and fragment boundaries.
- [UI Design Inference Project Plan](./UI%20Design/UI%20Design%20Inference%20Project%20Plan.md): design inference implementation plan, lock workflow, composites, and runtime lowering.
- [UI Design Inference Concepts](../../Tao%20Language%20Design/UI%20Design%20Inference%20Concepts.md): human-facing design-inference model and examples.
- [UI Design Inference Specification](../../Tao%20Language%20Design/UI%20Design%20Inference%20Specification.md): active design syntax, validation, locking, resolution, runtime mapping, and deferrals.
- [UI Appearance Future Work](./UI%20Design/UI%20Appearance%20Future%20Work.md): non-authoritative future styling and React Native style-surface notes.
- [UI Layout and Styling Raw Notes](../../Archive/UI%20Layout%20and%20Styling%20Raw%20Notes.md): historical notes only.

## Step 1. Layout Syntax Only

Goal: parse, validate, format, compile, and run bracketed layout clauses.

Scope:

- Add optional `[ ... ]` layout clauses to view renders.
- Use raw layout values only: lowercase words and numeric values.
- Do not implement design inference, named tokens, styling, transforms, animation, or interaction syntax.
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

The active language surface is intentionally not repeated here. See [UI Layout Specification](../../Tao%20Language%20Design/UI%20Layout%20Specification.md) for the current contract and [UI Layout Concepts](../../Tao%20Language%20Design/UI%20Layout%20Concepts.md) for examples.

Exit criteria:

- Parser tests cover no-arg renders, renders with args, renders with blocks, multiline layout clauses, and malformed clauses.
- Validation tests cover unknown words, duplicate scalar props, axis conflicts, styling words inside layout, and unsupported React Native props.
- Formatter tests prove one-line and multiline layout clauses are idempotent.
- Codegen tests show structured layout data emitted at render sites.
- Runtime tests show Row/Col child layout and self layout map to React Native styles.

## Step 2. Design Inference, Values, And Type Safety

Goal: implement Tao design inference before implementing a general styling language.

Scope:

- Parse app `design` descriptions, declaration/variant design specs, and design-only variants.
- Generate semantic identity, composite roles, resolved tokens, resolved style keys, and runtime adaptation/state tables.
- Use accepted `tao.design.lock` metadata for production builds and hidden `.tao.design.lock` suggestions for dev review.
- Keep raw style literals and explicit source-authored token dictionaries deferred.
- Decide type safety rules for generated resolved token categories and runtime resolver keys.
- Preserve the core tenet that everything works out of the box with tasteful app-specific defaults.
- Decide how adaptation modes such as color scheme, platform, screen size, text scale, and reduced motion affect resolved design values.
- Keep high contrast, locale, RTL, pointer/hover, keyboard, and device posture as later design axes.

Exit criteria:

- A reviewer can explain how source intent becomes semantic identity, composite roles, resolved style keys, generated tokens, and React Native/Expo output.
- Invalid design specs, missing accepted entries, stale locks, and resolver fallback gaps have planned diagnostics.
- The model covers app-specific visual defaults without required app configuration.
- Future styling syntax can build on a concrete design/value pipeline.

## Step 3. Styling Syntax And Style Coverage

Goal: design and implement styling after the design/value pipeline is clear, without letting styling leak into `[ ... ]`.

Scope:

- Decide whether explicit appearance uses a delimiter, keyword, named declaration, or another source surface.
- Define typed style values and style references using the design/value model.
- Decide whether inline style escape hatches exist and how they interact with accepted design metadata.
- Cover React Native view styles, text styles, image styles, shadows/elevation, opacity, borders, radius, color, typography, and component variants.
- Decide how unsupported, platform-specific, or native-library-specific style surfaces are represented.
- Generate React Native `StyleSheet.create` output plus Tao runtime helpers unless an external library becomes necessary.

Exit criteria:

- Layout remains geometry-only.
- Styling supports at least text, color, background, radius, border, shadow, opacity, and generated/design variants.
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
- Design support can easily outgrow the layout MVP; keep it behind raw layout until the design inference path is ready.
- Styling should not start until design values, composites, and typed resolved style keys are decided.
- Empty views can collapse in React Native; debug defaults or validation can be considered after core layout works.
- Custom views need a future way to declare their container/layout role so bare child-arrangement words can be axis-validated outside known built-ins such as `Row`, `Col`, and explicit `row`/`column`.
