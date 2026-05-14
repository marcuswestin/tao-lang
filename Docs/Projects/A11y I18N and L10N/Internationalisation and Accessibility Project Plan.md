# Internationalisation and Accessibility Project Plan

This document is a starting brief for designing Tao accessibility, internationalization, and localization. It collects open questions raised while designing the UI runtime surface, especially the split between layout, styling, transforms, motion, interaction, semantics, and adaptation.

## Context

- Tao UI and app-runtime behavior targets React Native and Expo.
- Accessibility, internationalization, and localization must map to React Native/Expo support, a Tao-owned runtime helper, or an explicit validation/runtime error.
- These concerns should not be treated as afterthoughts on layout or styling. They affect theme adaptation, text rendering, navigation/focus behavior, semantic metadata, input handling, and generated runtime defaults.
- Tao should treat accessibility and internationalization similarly to data loading and error states: the language should make the expected cases visible, guide authors to handle them, and support compiler enforcement when teams want stricter guarantees.
- Tao should prefer sane, tasteful defaults that work out of the box, while still allowing explicit overrides when the app needs them.

## Working Vocabulary

- **Semantics**: what UI means to assistive tools, tests, and runtime hierarchy inspection.
- **Accessibility**: roles, labels, hints, state, value, focus, announcements, reduced motion, contrast, text scaling, hit targets, and platform accessibility behavior.
- **Internationalization (I18N)**: source-level support for locale-aware text, numbers, dates, pluralization, direction, and culture-specific formatting.
- **Localization (L10N)**: app-specific translated strings and locale-specific assets or values.
- **Adaptation**: runtime selection of theme values, behavior, and defaults based on system, device, platform, locale, direction, accessibility settings, and screen context.

## Core Questions

- Which accessibility semantics should Tao infer from built-in views such as `Text`, `Button`, `Image`, `List`, and navigation containers?
- What explicit syntax should set accessibility role, label, hint, state, and value?
- Should `@part` names generate stable testing/debug handles, accessibility identifiers, or both?
- How should generated handles compose through view calls, slots, lists, and repeated rows?
- How should list rows receive stable keys when Tao data usually comes from database items with IDs?
- What should Tao do when a repeated item has no stable ID?
- How should focus order be determined: render order, explicit order, or platform-native defaults?
- How should Tao expose focus movement for keyboard, screen reader, TV, or game-controller style navigation?
- How should `when focused`, `when hovered`, `when pressed`, `when disabled`, and other interaction states relate to accessibility state?
- Which accessibility settings participate in adaptation: reduced motion, bold text, high contrast, larger text, invert colors, reduce transparency, screen reader enabled, and platform-specific settings?
- Should reduced motion default motion durations to zero, select alternative motion tokens, or reject certain animations?
- How should Tao model minimum hit target sizes and spacing defaults?
- Which accessibility issues are hard errors, which are warnings, and which are informational guidance?
- How should a project say that accessibility warnings are allowed during exploration but must fail release builds?
- Should warning policy be configurable by category, for example accessibility, internationalization, localization, adaptation, data loading, and data error handling?

## Text and Locale Questions

- What is the source syntax for localizable strings?
- Are raw string literals user-visible by default, or does Tao require an explicit localization marker for shipped text?
- How are interpolation, pluralization, gender, grammatical case, and rich text fragments represented?
- How are dates, times, durations, numbers, currencies, percentages, and units formatted?
- How does a view declare or receive locale?
- How do locale values flow into data queries, formatting helpers, and runtime providers?
- Should text style tokens adapt to locale, script, and font availability?
- How does Tao handle missing translations: compile warning, runtime fallback, or build error?
- How should Tao support locale-specific assets, icons, and images?
- Should user-visible raw strings be warnings by default, or only when a strict internationalization policy is enabled?
- How should a component explicitly mark text as non-user-visible, developer-only, brand/legal-fixed, or intentionally untranslated?

## Direction and Layout Questions

- How should Tao represent left-to-right and right-to-left direction?
- Should logical layout terms such as `start` and `end` be preferred over physical `left` and `right` in app-facing syntax?
- If both physical and logical terms exist, which are allowed in reusable components?
- How do `Row`, `Col`, `pack`, `spread`, `pin`, padding, inset, and child self-alignment adapt under RTL?
- Which React Native `I18nManager` behavior should Tao rely on, and which behavior should Tao own?
- How should icons, chevrons, progress indicators, and navigation affordances mirror in RTL?

## Adaptation Questions

- Which adaptation axes belong in theme declarations: color scheme, breakpoint, platform, density, reduced motion, text scale, high contrast, locale, direction, pointer/hover capability, safe area, keyboard, and device class?
- Should adaptation select token values only, or can it select view behavior?
- Should inline conditions be allowed, or should views consume semantic tokens and let the theme/runtime select values?
- How should adaptation priorities compose when multiple modes apply, such as `dark`, `tablet`, `rtl`, and `reduced_motion`?
- How does Tao expose system values such as `system.color_scheme`, `screen.width`, `platform`, `locale`, `direction`, and accessibility preferences?

## React Native and Expo Mapping Questions

- Which React Native accessibility props are first-class Tao syntax?
- Which Expo APIs are required for locale, localization, font loading, haptics, media, and device capability detection?
- What behavior is available in headless React Native tests versus Expo iOS, Android, and web?
- Which features require platform-specific fallbacks or unsupported diagnostics?
- How should generated code avoid Node/Bun-only APIs in app runtime code?

## Compiler Enforcement Policy

Tao should support warning policies as a first-class part of compile configuration. The same source may be acceptable during prototyping but fail in production or CI when a project opts into stricter guarantees.

Policy dimensions to design:

- Category: accessibility, internationalization, localization, adaptation, data loading, data error handling, layout, styling, motion, platform support.
- Severity: info, warning, error.
- Build behavior: allow warnings, fail on all warnings, or fail on selected warning categories.
- Scope: whole app, module, view, library, build profile, or release channel.
- Escape hatch: explicit source annotation for an intentional exception, ideally with a reason.

Example policy intent, syntax not decided:

```tao
app MyApp {
  compile {
    warnings allow
    warnings accessibility error
    warnings internationalization error
  }
}
```

Alternative config-shaped intent:

```tao
policy release {
  fail_on warning accessibility
  fail_on warning internationalization
  allow warning localization missing_translation during development
}
```

Questions:

- Does warning policy live in Tao source, CLI flags, app config, build profiles, or all of these with precedence rules?
- Should `tao compile --fail-on-warnings` fail every warning category, while source config can select narrower categories?
- Should strict accessibility/i18n modes be opt-in at first, or should Tao start with strong defaults and require explicit waivers?
- How does an intentional exception look without creating a culture of blanket suppression?
- Can warnings point to generated fixes, such as "add access label", "mark string localizable", or "use start/end instead of left/right"?
- Should libraries be required to compile warning-clean under stricter policies before publication?

Research needed:

- React Native accessibility props and platform differences.
- Expo localization, locale, direction, and device settings APIs.
- Existing i18n extraction and message-format systems.
- Existing accessibility linting systems and how they categorize severity.
- CI/build-profile patterns for warnings-as-errors.
- How data loading/error-state enforcement should share the same diagnostic policy mechanism.

## Example Sketches

```tao
Text Title {
  access role header
  access label Title
}
```

```tao
Button "Save", Save {
  access label "Save draft"
  access hint "Writes changes to the server"
  when disabled (opacity disabled)
}
```

```tao
theme app {
  mode reduced_motion when system.prefers_reduced_motion
  mode high_contrast when system.prefers_high_contrast
  direction rtl when locale.direction is rtl

  duration { fast 140 }
  duration reduced_motion { fast 0 }

  spacing { hit_target 44 }
  spacing large_text { hit_target 52 }
}
```

```tao
List Tasks {
  @row Task {
    TaskRow Task {
      access label Task.Title
    }
  }
}
```

## Initial Design Goals

- User-visible Tao apps should be accessible by default.
- UI semantics should be explicit enough for testing, debugging, generated handles, and assistive technologies.
- Reusable components should prefer semantic tokens and logical layout concepts where possible.
- Runtime behavior should follow React Native/Expo capabilities and fail clearly when a platform cannot support a requested feature.
- The first implementation should choose a small, testable accessibility and locale surface rather than trying to cover every platform feature at once.
- Tao should support progressive enforcement: helpful warnings during exploration, warnings-as-errors for teams or release builds, and category-specific gates for accessibility and internationalization.
