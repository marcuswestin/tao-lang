# Look Great By Default First Slice Project Plan

## Summary

The smallest implementation that makes a brand-new Tao app feel polished within 2–3 minutes of authoring, with **no LLM dependency, no template files, no lock-file workflow, no author-choice surface**. All values live in TypeScript constants; the compile path stays deterministic and offline.

Per-app variation is supplied by a single mechanism: a seed-derived accent hue computed deterministically from the app's qualified name. Two different apps share the same overall look and feel but get visibly different accents within a hand-validated color envelope. No LLM uncertainty, no candidate selection, no values that vary between machines or runs.

When the full [Look Great By Default MVP Project Plan](./Look%20Great%20By%20Default%20MVP%20Project%20Plan.md) lands later, this slice becomes the canonical deterministic default that ships when no candidate is selected. The full plan layers on top without rework; nothing here is throwaway.

## The 2–3 Minute Experience This Slice Gates

1. Author writes `app MyApp { ui MainScreen }` plus a small `ui MainScreen` with `Text`, `Button`, `TextInput`, and a list of rows.
2. App compiles and runs in dev.
3. On iOS, Android, or web, the author sees: coherent palette in light and dark, consistent spacing rhythm, system fonts, polished `Button` with visible press/hover/focus/loading states, polished `TextInput` with visible focused/error states, clamped readable column on desktop web, safe areas respected on native, status bar tinted to background.
4. The author renames the app, recompiles, and sees a visibly different accent color while everything else stays the same.

Nothing else. No `tao design` CLI flow, no template choice prompt, no lock review, no LLM call. The app just looks good.

## Scope Strategy

This slice trades variability for certainty. Where the full plan ships six templates with optional LLM enhancement, this slice ships **one opinionated default** plus a **seed-derived accent hue from a pre-validated 18-stop wheel**.

The wheel approach is the key design choice that removes uncertainty: instead of continuous hue with per-hue contrast adjustment, we pre-validate 18 hue stops at 20° intervals against the fixed neutral palette in both light and dark. The seed picks an index; the result is guaranteed contrast-safe by construction, every time. No runtime contrast solver, no auto-adjust loop, no failure path to handle.

Everything LLM-shaped, template-file-shaped, lock-file-shaped, or author-choice-shaped is deferred to the full plan.

## Goals

- One hardcoded design token set in `packages/tao-std-lib/tao/tao-runtime/`, covering color (light + dark), spacing, radius, text, shadow, border, opacity, motion (duration + easing), and size. Authored once, contrast-verified by hand.
- An 18-stop hue wheel of pre-validated accent colors; deterministic seed → index → accent pair (light + dark).
- Polished `Button` states (default / pressed / hovered on web / focused / loading / disabled) and `TextInput` states (default / focused / filled / error / disabled), wired through the existing `_taoDesignStyle` extension surface.
- New std-lib views: `Card`, `ListRow`, `Section`, `Divider`, `Avatar`, `Badge`, `Icon`. All token-styled; appropriate interaction states; `hitSlop` for touch targets.
- Loading / empty / error std-lib feedback components with hardcoded default copy.
- App shell defaults: web content max-width clamp (~960pt), prose max-width on long text (~680pt), safe-area at root, status bar style derived from background, splash tint, system font stack.
- Icon support via `@expo/vector-icons` with a single default family (Feather).

## Non-Goals

- Multiple templates, candidate selection, `tao design` CLI, author choice, `--reroll`.
- `rules.json`, `fallback-tokens.json`, reference PNGs, Template Acceptance Checklist.
- LLM token generation, WCAG contrast auto-adjust algorithm (contrast is hand-validated at palette authoring time; no runtime solver).
- Lock-file changes; `tao.design.lock` is untouched in this slice.
- Template component overrides (`templates/<identity>/Component.tsx`) or compile-time import-path rewriting.
- Differentiation metrics in CI, VLM acceptance, component gallery app, side-by-side template demo.
- All deferrals from the full [Look Great By Default MVP Project Plan](./Look%20Great%20By%20Default%20MVP%20Project%20Plan.md#non-goals) also apply here.

## Implementation Steps

### 1. Default Tokens And Seed-Derived Accent

**Context:** No "default look" exists. `packages/tao-std-lib/tao/tao-runtime/Views.tsx` exposes a `_taoDesignStyle` hook but has nothing real to read.

**Work:**

- Add `packages/tao-std-lib/tao/tao-runtime/tao-default-design.ts` with these constants:
  - **Neutral palette (light + dark, hand-validated for contrast).** Ten-step neutral ramp, plus semantic roles: `background.app`, `background.elevated`, `surface.card`, `text.primary`, `text.secondary`, `text.muted`, `text.disabled`, `text.inverse`, `border.default`, `border.strong`, `divider`. Status colors: `status.danger`, `status.warning`, `status.success` with `on` variants.
  - **Spacing scale (pt):** `2, 4, 8, 12, 16, 20, 24, 32, 48` with semantic aliases `inset.app: 16`, `inset.card: 16`, `gap.section: 32`, `gap.group: 16`, `gap.field: 12`, `padding.control: 12`.
  - **Radius scale (pt):** `none: 0`, `control: 6`, `card: 10`, `sheet: 16`, `pill: 9999`.
  - **Text scale.** Per-role objects (size, weight, lineHeight, letterSpacing) for `display`, `title`, `body`, `supporting`, `label`, `caption`, `button`, `input`, `numeric`. Body size 16pt, line height 1.45.
  - **Shadow ramp:** `none`, `raised` (subtle), `floating` (modal-grade); each with iOS shadow props and Android elevation.
  - **Border widths:** `hairline: StyleSheet.hairlineWidth`, `default: 1`, `strong: 2`, `focus: 2`.
  - **Opacity:** `disabled: 0.4`, `pressed: 0.7`, `hover: 0.92`, `scrim: 0.5`.
  - **Motion durations (ms):** `feedback: 120`, `transition: 220`, `emphasized: 320` with cubic-bezier easings.
  - **Size:** `minControlHeight: 44`, `minTouchTarget: 44`, `icon.sm: 16`, `icon.md: 20`, `icon.lg: 24`, `avatar.sm: 28`, `avatar.md: 40`.
- Add `ACCENT_WHEEL: readonly AccentStop[]` — 18 hand-picked stops at 20° hue intervals. Each stop carries `{ light: { default, on, container, border }, dark: { default, on, container, border } }`. All 18 × 2 schemes are verified against the neutral palette at authoring time for ≥ 4.5:1 contrast on text-on-accent and ≥ 3:1 on accent-on-background.
- Add `deriveAccent(appQualifiedName: string): AccentStop`:
  - SHA-256 the qualified name; take the first byte modulo 18 → index;
  - return `ACCENT_WHEEL[index]`.
- Add `createDefaultDesign(appQualifiedName: string): TaoDefaultDesign` returning the full token table with the seeded accent merged in under `color.accent.*`.

**Validation:** `./agent shared test`, `./agent dprint check`. Unit tests:

- `deriveAccent` returns the same stop for the same name across runs.
- All 18 wheel stops produce ≥ 4.5:1 text-on-accent contrast in both schemes.
- All 18 stops produce ≥ 3:1 accent-on-background contrast in both schemes.
- A ten-name fixture set produces at least 8 distinct accent indices (sanity check that the hash distributes).

**Exit criteria:** `createDefaultDesign("MyApp")` returns a complete, contrast-safe token table. Two different qualified names produce different accent stops with high probability; all stops are pre-validated.

**Suggested commit subject:** `feat(design): add default tokens and 18-stop seed-derived accent`

### 2. Theme Existing Std-Lib Views With The Default Design

**Context:** `Views.tsx` already wires `_taoDesignStyle` for `Button` pressed/disabled, but has no real values and no other state coverage. Other views are static.

**Work:**

- Add `useTaoDefaultDesign()` hook that reads the design from a React context provided by the generated app bootstrap (wired in Step 4).
- Refactor `Views.tsx` to consume tokens for:
  - **Text family** (`Text`, `TextLabel`, `MultiLineText`, `Number`): font from system font stack, size/weight/lineHeight/letterSpacing per `text` role, color from `text.*` roles.
  - **Button:** background = `accent.default`; label color = `accent.on`; padding = `padding.control`; radius = `radius.control`; min height = `size.minControlHeight`; `hitSlop` to `size.minTouchTarget`. State overlays:
    - `pressed`: apply `opacity.pressed` (and Android `Pressable` ripple from `accent.container` when supported);
    - `hovered` (web only): apply `opacity.hover` and cursor:pointer;
    - `focused`: outline = `border.focus` × 2pt with 2pt offset;
    - `loading`: hide label, show `ActivityIndicator` tinted `accent.on`, preserve button width;
    - `disabled`: apply `opacity.disabled`, suppress interactivity.
  - **TextInput:** background = `surface.card`; border = `border.default` (→ `border.focus` on focus); padding = `padding.control`; font = `text.input`; placeholder color = `text.muted`. State overlays:
    - `focused`: border swaps to `border.focus` with a 2pt outer ring at `accent.default × 0.3 alpha`;
    - `filled`: same as `default`; placeholder is hidden by the value;
    - `error`: border color = `status.danger`; helper-text slot below renders error message in `status.danger`;
    - `disabled`: apply `opacity.disabled`, suppress interactivity.
- Layout views (`Box`, `Row`, `Col`, `Stack`, `WrappingRow`) gain no new states but inherit background tokens from context where applicable.
- All state resolution funnels through `_taoDesignStyle` so the existing extension surface stays the integration point and the full plan can layer template overrides on top later without refactoring.

**Validation:** `./agent expo-runtime test`, `./agent compiler test codegen`. New tests render `Button` and `TextInput` in every listed state.

**Exit criteria:** Existing test apps render with the new tokens; `Button` and `TextInput` show every state listed above; no visual regressions in the existing Kitchen Sink or Data Schema test apps.

**Suggested commit subject:** `feat(ui): theme std-lib views with default tokens`

### 3. Add Card, ListRow, Section, Divider, Avatar, Badge, Icon

**Context:** "Looks great by default" needs surfaces and lists, not only text and buttons. Std-lib does not yet expose these.

**Work:**

- Add to `packages/tao-std-lib/tao/ui/Views.tao` and `packages/tao-std-lib/tao/tao-runtime/Views.tsx`:
  - **Card.** Padded surface; `surface.card` background; `radius.card`; `shadow.raised`; optional pressed state for tappable cards (`opacity.pressed`).
  - **ListRow.** Leading / trailing / title / supporting slots; min height = `size.minTouchTarget`; hairline divider below by default (suppressible); states for `pressed`, `hovered` (web), `focused`, `selected` (background tinted `accent.container`), `disabled`.
  - **Section.** Optional title + optional trailing action + content slot; title uses `text.title`; rhythm = 1.5 × `gap.section` above the title.
  - **Divider.** `hairline`, `default`, `strong` variants.
  - **Avatar.** `image?: ImageSource` and `name?: string` props; circle shape; renders the image if present, otherwise renders an initial-fallback (first letter of `name`, centered, `surface.card` background, `text.primary` foreground); sizes from `size.avatar.*`.
  - **Badge.** Pill-shaped (`radius.pill`); `neutral` and `status` (success/warning/danger) variants; small `text.label` foreground.
  - **Icon.** Wraps `@expo/vector-icons` (default family Feather); size from `size.icon.*` tokens; tint defaults to `text.primary` and accepts an explicit color prop.
- Wire `hitSlop = size.minTouchTarget` on `Button` and `ListRow`.
- All views consume tokens via `_taoDesignStyle`. None of them depend on the future template system.

**Validation:** `./agent expo-runtime test`, `./agent shared test`. New render tests for every component in default plus relevant states, in light and dark.

**Exit criteria:** New views render correctly in light and dark across iOS / Android / web; touch targets ≥ 44pt iOS / 48dp Android on `Button` and `ListRow`; Avatar initial-fallback works without an image source.

**Suggested commit subject:** `feat(std-lib): add Card ListRow Section Divider Avatar Badge Icon`

### 4. App Shell Defaults: Web Max-Width, Safe Area, Status Bar, Splash, System Font

**Context:** The single most visible "this looks broken" failure on web is content stretching to the viewport edge. On native, an unhandled safe-area is equally jarring. The generated app bootstrap currently does neither. System font on web defaults to a generic browser font when not specified.

Reuse the existing `TaoAppShell` for mechanical safe-area, keyboard, Android keyboard mode, and bottom-tab hide-on-keyboard behavior. This slice owns visual shell polish such as web max-width, status bar, splash, system font, and template spacing.

**Work:**

- Extend `packages/compiler/compiler-src/codegen/app/` to emit a `TaoDefaultDesignProvider` wrapping the generated app root. The provider:
  - calls `createDefaultDesign(appQualifiedName)` once at mount;
  - publishes the design via React context for `useTaoDefaultDesign()`.
  - The `appQualifiedName` is read from the compiled app declaration; if absent, use the package name.
- Extend the existing `packages/tao-std-lib/tao/tao-runtime/AppShell.tsx`:
  - **Web.** Outer container with `maxWidth: 960pt`, centered (`marginHorizontal: auto`), body background = `color.background.app`; inner content uses `surface.card`. `MultiLineText` clamps to a prose max-width of `680pt` on web.
  - **Native.** Preserve existing `SafeAreaProvider`, safe-area padding, keyboard-aware scroll behavior, and bottom-tab keyboard defaults while adding template-owned visual shell spacing.
  - **Status bar.** `expo-status-bar` with `style` derived from `background.app` brightness (`light` if background is dark, `dark` otherwise). Re-evaluate per color scheme.
  - **Splash.** `expo-splash-screen` `backgroundColor` set to `background.app` so the splash blends into first paint.
  - **System font stack.** On web, set `fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, "Helvetica Neue", Arial, sans-serif'` in the Text role tokens. On native, omit `fontFamily` so the platform default (San Francisco on iOS, Roboto on Android) takes over.
- Existing test apps (Kitchen Sink, Data Schema) compile through the new bootstrap and demonstrate the clamp and safe-area on their next render.

**Validation:** `./agent expo-runtime test`, `./agent compiler test codegen app`. Test apps render with max-width on web (verify by measuring rendered container); safe-area insets present on native; status bar style switches with scheme.

**Exit criteria:** Existing Kitchen Sink on web shows a clamped centered column with `background.app` visible on either side; on native, top safe-area and status bar look correct; splash blends with `background.app` instead of flashing white.

**Suggested commit subject:** `feat(runtime): add app shell defaults with web max-width and safe area`

### 5. Loading / Empty / Error Feedback Components

**Context:** Even within the first 2–3 minutes, an author who adds a query or async action reaches loading and empty/error screens. Without polished feedback components, the impression collapses.

**Work:**

- Add three std-lib feedback views consuming the default tokens:

  ```ts
  interface LoadingShellProps {
    rows?: number /* default 3 */
  }
  interface EmptyStateProps {
    symbol?: string
    title?: string
    supporting?: string
    action?: { label: string; onPress(): void }
  }
  interface ErrorStateProps {
    symbol?: string
    title?: string
    supporting?: string
    action?: { label: string; onPress(): void }
  }
  ```

- **`LoadingShell`:** renders `rows` skeleton blocks of varying widths (90% / 70% / 80% etc.), each `surface.card` with a subtle shimmer via `Animated.loop`. Shimmer is disabled when `AccessibilityInfo.isReduceMotionEnabled()` is true.
- **`EmptyState`:** centered column; optional icon (`Icon` with `text.muted` tint); title defaults to "Nothing here yet" (uses `text.title`); supporting in `text.secondary`; optional primary action `Button`.
- **`ErrorState`:** same shape; title defaults to "Something went wrong"; supporting defaults to "Check your connection and try again"; action defaults to label "Try Again" when `onPress` is provided.
- All copy is hardcoded; no LLM, no template-driven copy variation. Authors override any prop by passing it.
- All three components respect light/dark and use only the tokens from Step 1.

**Validation:** `./agent expo-runtime test`. Render each component with and without `action`; verify reduced-motion disables shimmer; verify default copy on `EmptyState` and `ErrorState` when props are omitted.

**Exit criteria:** Each feedback component renders correctly in light and dark; default copy is sensible and consistent; action button (when present) triggers the callback and inherits Button styling.

**Suggested commit subject:** `feat(std-lib): add LoadingShell EmptyState ErrorState components`

## Validation Strategy

- Each step has its own validation block; the listed `./agent` commands gate completion.
- Multiple smaller commits inside one step may skip the full step validation as long as the final commit of the step passes its exit criteria.
- Run `./agent prep-commit` at step boundaries.
- **Manual end-to-end check at the end of Step 5:** compile a fresh empty Tao app under three different qualified names ("NotesApp", "Inventory", "Chatter"); run each on web (compact viewport ~ 390pt, regular ~ 1200pt) and on one native device; confirm the four-point experience contract listed at the top of this plan.

## Path To The Full Look Great By Default MVP

Once this slice ships, the full plan layers on top without rework:

- **Add the template directory and 6 templates.** This slice's hardcoded token set becomes the canonical fallback template; the 18-stop accent wheel becomes a per-template wheel.
- **Add candidate selection and `tao design` CLI.** This slice is the "no candidate accepted yet" default path.
- **Add the lock file `templateSelection` block.** This slice's design is what ships when the lock is absent.
- **Add LLM enhancement.** Purely additive; this slice's deterministic path remains the always-available baseline.
- **Add template component overrides.** Replaces specific views per chosen template; this slice's polished components are the std-lib defaults that overrides extend through the same `_taoDesignStyle` surface.
- **Add gallery, side-by-side demo, CI differentiation metrics.** Verifies what this slice already produces.

Nothing in this slice is throwaway. Every file, token, and view persists as the deterministic floor of the full plan.

## Risks

- **The single default feels templated across apps.** Mitigation: the 18-stop accent wheel gives a genuinely different look to every app; the ten-name sweep test asserts ≥ 8 distinct indices, surfacing if the hash distribution clusters.
- **Hand-validated contrast can drift if the palette is hand-edited later.** Mitigation: ship a unit test that re-verifies all 18 × 2 wheel stops on every commit that touches `tao-default-design.ts`. Fail loud on regressions.
- **Web max-width may misbehave on some React Native Web layout paths.** Mitigation: prove the clamp on the Kitchen Sink test app during Step 4 before relying on it elsewhere.
- **System font stack may render inconsistently across desktop browsers.** Mitigation: pin the exact fallback chain in Step 4 (`-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, ...`) and test in Chrome, Safari, Firefox.
- **Android ripple on Button may not match iOS opacity press feedback visually.** Acceptable for this slice — each platform looks platform-correct. Cross-platform visual parity is a full-plan concern.

## Related Documents

- [Look Great By Default MVP Project Research](./Look%20Great%20By%20Default%20MVP%20Project%20Research.md) — full settled research, including the 6-template architecture this slice deliberately defers.
- [Look Great By Default MVP Project Plan](./Look%20Great%20By%20Default%20MVP%20Project%20Plan.md) — the full 10-step plan; this slice is a deterministic subset of its Steps 1, 7, 8, 10, minus templates, candidates, LLM, lock changes, overrides, and gallery.
- [CORE_TENETS.md](../../CORE_TENETS.md) — "different apps should end up with different defaults" is satisfied here by the 18-stop accent wheel.
