# Interactions Project Plan

This document is a starting brief for Tao interaction and event design. It covers user interaction, time, network/data completion, subscriptions, action lifecycle, and runtime events.

## Context

- Tao UI and app-runtime behavior targets React Native and Expo.
- Event handling must map to React Native/Expo support, a Tao-owned runtime helper, or an explicit validation/runtime error.
- Interaction state such as `pressed`, `hovered`, `focused`, `selected`, and `disabled` is different from event response. State can change style, transform, motion, or accessibility state. Event response runs behavior.
- Tao should keep the syntax easy to read in UI code, because app behavior often lives near rendered UI.

## Working Vocabulary

- **Interaction state**: temporary or persistent UI state exposed by the runtime, such as pressed, hovered, focused, disabled, selected, expanded, dragged, loading, or invalid.
- **Event**: something that happens over time, such as press, submit, timer tick, data loaded, network failed, app foregrounded, screen focused, or animation finished.
- **Handler**: Tao code that responds to an event.
- **Action**: named app behavior that can be invoked from a handler.
- **Event source**: the thing that emits the event: a view, an action invocation, a query, a timer, a subscription, the app runtime, or the platform.

## Current Syntax Direction

Use `on EventName` for event handlers:

```tao
Button "Save", Save {
  on press {
    do Save
  }
}
```

Use `does EventName` to declare or expose that a view/action can emit an event:

```tao
view UploadButton File file {
  does uploaded
  does failed

  Button "Upload", Upload {
    on press {
      do UploadFile File
    }
  }
}
```

Open question: should `does` live on views, actions, slots, or all event-emitting declarations?

## Core Questions

- What is the exact syntax for declaring an event a view or action can emit?
- Is `does EventName` the right declaration phrase, or should it be `event EventName`, `emits EventName`, or `can EventName`?
- Should event names be lowercase, kebab/snake case, or normal Tao names?
- How does a parent view listen to a child view's declared event?
- How does a handler receive event payload data?
- Can events be typed?
- Can events bubble through the UI tree, or are they explicit only?
- How are event names exposed to testing/debug hierarchy?
- How are events represented in generated React Native/Expo code?

## User Interaction Events

Questions:

- Which events are first-class for v1: `press`, `long_press`, `focus`, `blur`, `hover_in`, `hover_out`, `change`, `submit`, `scroll`, `swipe`, `drag`, `pinch`?
- Which events map to React Native `Pressable`, `TextInput`, `ScrollView`, Gesture Handler, or other Expo/RN APIs?
- Which events work on iOS, Android, web, and headless tests?
- How do event handlers interact with visual state modifiers such as `when pressed`?

Example:

```tao
Button "Save", Save {
  when pressed (motion press)

  on press {
    do Save
  }
}
```

## Action Lifecycle Events

Questions:

- When an action is invoked, which lifecycle events exist: started, done, failed, cancelled?
- Are action lifecycle handlers scoped to a specific invocation?
- Should the syntax be source-qualified, block-scoped, or both?

Possible shapes:

```tao
on Save.done {
  Status = "Saved"
}
```

```tao
do Save {
  on done {
    Status = "Saved"
  }

  on failed Error {
    Status = Error.message
  }
}
```

The block-scoped form may be safer because it attaches handlers to the specific action invocation.

## Data and Network Events

Questions:

- Should query readiness, refresh, error, and subscription updates be handled as events or through `guard`/render state?
- Which query lifecycle events exist: loading, ready, refreshing, stale, failed, updated?
- How do event handlers interact with Suspense-style `guard` behavior?
- Can a data provider emit provider-specific events?

Example sketch:

```tao
query Tasks from data.Tasks where Done != true

on Tasks.updated {
  LastUpdated = now
}
```

## Time Events

Questions:

- What is the syntax for timers and intervals?
- Are timers tied to view lifecycle automatically?
- Do timers pause when the screen is hidden or app is backgrounded?
- How do timers behave in tests?

Example:

```tao
on every 30s {
  do Refresh
}
```

```tao
on after 500ms {
  ShowToast = false
}
```

## App and Platform Events

Questions:

- Which app lifecycle events are exposed: foreground, background, active, inactive, online, offline, orientation change, keyboard show/hide, safe-area change?
- Which events belong to Expo/runtime helpers instead of core Tao syntax?
- How should platform-specific event availability be validated?

Example sketch:

```tao
on app.foreground {
  do Refresh
}
```

```tao
on network.offline {
  OfflineBannerVisible = true
}
```

## Event Payloads

Questions:

- How are event payloads declared?
- Are payload names normal Tao parameters?
- Can event payload types be inferred from the runtime event source?

Possible shape:

```tao
TextInput Name {
  on change Value text {
    Name = Value
  }
}
```

Alternative:

```tao
TextInput Name {
  on change Value {
    Name = Value.text
  }
}
```

## Event Declaration Sketches

```tao
view ConfirmButton Label text, Confirm action {
  does confirmed

  Button Label, action {
    do Confirm
    emit confirmed
  }
}
```

```tao
view SearchBox {
  does changed text
  does submitted text

  TextInput Query {
    on change Value {
      emit changed Value
    }

    on submit Value {
      emit submitted Value
    }
  }
}
```

Open questions:

- Is `emit` the right verb for causing a declared event?
- Should `does changed text` mean the event payload is `text`?
- Can `does` declarations include multiple payload fields?
- Can a view pass through events from child views without explicitly re-emitting them?

## React Native and Expo Mapping Questions

- Which event sources map to React Native core components?
- Which require Gesture Handler, Reanimated, Navigation, NetInfo, AppState, Keyboard, or Expo modules?
- Which events are available in `packages/headless-test-runtime/`?
- Which events need no-op, synthetic, or deterministic test behavior?
- How should generated handlers avoid capturing stale state or creating excessive rerenders?

## Initial Design Goals

- Keep event syntax concise and local to the UI that owns the behavior.
- Keep event declarations typed.
- Prefer explicit event wiring over implicit bubbling.
- Treat action/query/timer/platform events as runtime capabilities with clear validation.
- Make event behavior testable in headless runtime where possible.
- Keep platform-specific event behavior behind Tao runtime helpers.
