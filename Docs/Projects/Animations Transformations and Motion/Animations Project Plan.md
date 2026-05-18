# Animations Project Plan

This document is a starting brief for Tao motion design: transforms, transitions, animations, durations, curves, and state changes over time.

## Context

- Tao UI and app-runtime behavior targets React Native and Expo.
- Motion features must map to React Native/Expo support, a Tao-owned runtime helper, or an explicit validation/runtime error.
- React Native transforms are style props that visually alter an element after layout. They do not change layout measurement.
- React Native animation support has important boundaries. Transform and opacity are the safest initial animation targets; layout, Flexbox, and position animation require a deliberate Tao runtime strategy.
- Motion must participate in adaptation, especially reduced motion and platform capability differences.

## Working Vocabulary

- **Transform**: post-layout visual geometry, such as translate, scale, rotate, skew, and transform origin.
- **Transition**: animation from one value to another when state or props change.
- **Animation**: named motion behavior, such as enter, exit, pulse, fade, or loop.
- **Motion**: the broader category covering transforms, transitions, animations, timing, easing, sequencing, and reduced-motion behavior.
- **Duration**: how long a transition or animation takes.
- **Easing / curve**: how the value changes over time.
- **Spring**: physics-style timing with stiffness, damping, mass, and velocity.
- **Interaction motion**: motion caused by UI state such as pressed, hovered, focused, selected, expanded, dragged, or disabled.

## Core Questions

- Which motion concepts are part of Tao v1: static transforms, state transitions, enter/exit animations, layout transitions, gestures, or sequences?
- Which properties can be animated safely in React Native and Expo across iOS, Android, web, and headless tests?
- Should Tao use React Native `Animated`, `LayoutAnimation`, Reanimated, or a small Tao runtime facade?
- What is the fallback behavior in headless tests where native animation drivers are not available?
- Should animations run by default in tests, complete instantly, or expose test helpers to flush motion?
- How does reduced motion affect durations, transforms, looping animations, and layout transitions?
- Should Tao distinguish decorative motion from motion that communicates state or navigation?
- How are motion tokens typed and validated?

## Syntax Questions

- Where do transforms live syntactically: inside style parentheses, a separate motion lane, or named transform declarations?
- Where do transitions live: as style-like tokens, `when` state modifiers, or explicit event handlers?
- How should Tao express "tweak from one thing to another with a duration and curve"?
- Should inline motion be allowed for prototyping, with named motion tokens preferred for production?
- How do motion values compose when a base style, state override, and caller override all specify transforms or transitions?

## Design Value Questions

Motion should eventually use resolved design values generated from accepted design metadata. Source-authored `theme app` motion dictionaries are not the current direction.

The design graph can later emit resolved motion values such as durations, easing curves, transform presets, and motion composites. V1 design inference only reserves the `motion` and `transform` categories and supports reduced-motion adaptation where generated motion helpers exist.

Questions:

- Which resolved design categories are required: `duration`, `delay`, `easing`, `spring`, `transform`, `transition`, `motion`, `animation`?
- Should distances in transforms use `spacing` tokens?
- Should rotation use typed angle values such as degrees/radians/turns?
- Should opacity be a style token, a motion target, or both?
- How should motion tokens adapt by platform, reduced motion, density, and device capability?

## State and Event Questions

- How should motion attach to interaction states?

Future integration may connect interaction state to resolved motion composites. The current V1 design-state overlay covers `pressed`, `disabled`, `focused`, and `selected` for interactive composites, but a full motion language is deferred.

- How should motion attach to view lifecycle?

```tao
Toast Message
```

- How should motion attach to events?

```tao
on press {
  animate @card to lifted over fast with standard
}
```

- Do we need first-class enter/exit syntax for conditional rendering?
- How should interrupted animations behave when state changes before the prior motion finishes?
- How should gestures such as drag, swipe, pinch, and long press relate to motion?

## Layout Transition Questions

- Should Tao support layout transitions in v1, or defer them until the runtime strategy is proven?
- If layout transitions exist, do they animate measured layout changes, explicit size changes, reorder operations, or list insert/remove?
- Are layout transitions opt-in per container, per child, or per state change?
- How should list reorder/insert/delete animations interact with React keys?
- How should Tao validate unsupported layout animation on web/headless targets?

## Transform Questions

- Which transform properties are v1: translate x/y, scale, rotate, skew, perspective, transform origin?
- Should transform values be typed as `translation`, `scale`, `rotation`, and `origin`, or grouped under one `transform` type?
- Can multiple transforms compose deterministically from base style, state style, caller style, and animation?
- Should transforms affect hit testing, accessibility bounds, or only visual output?

## React Native and Expo Mapping Questions

- Which features map to plain React Native style transform props?
- Which features map to React Native `Animated`?
- Which features require `LayoutAnimation`?
- Which features require Reanimated or Expo-specific modules?
- What is the minimum runtime facade Tao should own so generated code stays stable if the backing animation library changes?
- Which behavior differs on iOS, Android, web, and headless tests?

## Example Sketches

```tao
Box
```

```tao
Button "Save", Save {
  // Future motion integration may attach resolved motion to pressed state.
}
```

```tao
Card Task {
  // Future motion integration may attach resolved transform/transition values to selected state.
}
```

```tao
on every 1s {
  animate @progress to Progress over normal with linear
}
```

```tao
if ShowToast {
  Toast Message
}
```

## Initial Design Goals

- Keep transform separate from layout.
- Start with deterministic, typed tokens for duration, easing, transform, and named motion.
- Prefer transform and opacity animation first.
- Treat layout animation as a deliberate later capability unless the runtime design proves it can be made portable.
- Make reduced motion a first-class adaptation axis.
- Keep generated code behind Tao runtime helpers instead of scattering animation-library details through emitted TSX.
- Provide predictable test behavior for animated views.
