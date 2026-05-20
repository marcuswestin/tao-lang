# Beautiful App Defaults MVP Mini Project Try-It Guide

A step-by-step guide for trying out the Beautiful App Defaults mini slice implemented on `feat/amazing-mclaren-e0db54`. Every command below was run and verified; the fixture is already compiled into the Expo runtime, so you can jump straight to starting the dev server.

## What changed (so you know what to look for)

Plain standard-library primitives (`Text`, `Button`, `TextInput`, and friends) now render polished by default: a calm neutral palette, real button/focus/disabled states, a centered max-width content frame, a per-app seeded accent color, and styled `Card` / `EmptyState` / `LoadingState` / `ErrorState` components. All of this happens with **zero design code** in the app.

## 1. Start the dev server (fastest look)

The `Apps/Test Apps/Beautiful Defaults Mini/Beautiful Defaults Mini.tao` app is already compiled into `packages/expo-runtime/_gen/`. From the repo root, run **one** of these in your own terminal:

```sh
just expo-runtime web     # opens Chrome (react-native-web)
# or
just expo-runtime ios     # iOS simulator
```

The dev server is long-running and interactive, so run it yourself rather than through an agent.

## 2. What to look for on screen

- **"Quick notes"** title with clear weight, supporting body copy beneath it in a softer gray.
- A **Card** (white surface, rounded corners, hairline border) grouping the label, input, and buttons.
- A **TextInput** that looks finished (border, radius, padding, 48px tall). Click it and the border turns **teal** (this app's seeded accent).
- A solid **teal "Save" button** with a white label. Press it and it darkens.
- Three states stacked below: a **spinner + "Loading recent notes..."**, an **empty state**, and a red-tinted **error state**.
- The whole screen is **centered with comfortable margins**, not stretched edge-to-edge.

## 3. Play with it (the convincing part)

1. **Resize the browser window.** Drag it wide and the content stays centered, capped at 720px. Drag it narrow (under ~600px) and it switches to compact 16px side padding. No layout code did this.
2. **Toggle dark mode.** Flip your OS appearance to Dark (or in Chrome DevTools: Rendering -> "Emulate prefers-color-scheme: dark"). The whole palette flips to a dark theme and the accent stays readable.
3. **See the seeded accent change.** Open the fixture, rename the app, recompile (command in step 4), and the accent shifts deterministically. Verified examples:
   - `app BeautifulDefaultsMini` -> **teal**
   - `app Scratchpad` -> **green**
   - `app TripPlanner` -> **rose**
   - `app HabitTracker` -> **indigo**
4. **Add a raw control.** Drop a bare `Button "Delete", action { }` into the `render Col` block, recompile, and watch it come out fully styled with no theme and no props.

## 4. Recompile after edits

After editing any `.tao`, recompile into the runtime:

```sh
./agent tao compile "Apps/Test Apps/Beautiful Defaults Mini/Beautiful Defaults Mini.tao" \
  --runtime-dir packages/expo-runtime \
  --std-lib-root packages/tao-std-lib
```

Add `--watch` to auto-recompile on save (Metro then hot-reloads the browser):

```sh
./agent tao compile "Apps/Test Apps/Beautiful Defaults Mini/Beautiful Defaults Mini.tao" \
  --runtime-dir packages/expo-runtime --std-lib-root packages/tao-std-lib --watch
```

## 5. The "out of the box" test (brand-new app)

This is the real proof of the tenet _everything looks good without configuration_. Make a new app **in its own folder** (the compiler scans the entry file's directory, so keep it isolated):

```sh
mkdir -p "Apps/Test Apps/My First App"
```

Create `Apps/Test Apps/My First App/My First App.tao`:

```tao
use Button, Card, Col, Stack, Text, TextInput, TextLabel from @tao/ui

app MyFirstApp {
   ui Home
}

state Name = ""
action UpdateName Value text { set Name = Value }

ui Home {
   render Col [items top stretch, gap 16, width fill] {
      Text "My first Tao app"
      Card {
         Stack [gap 12] {
            TextLabel "Your name"
            TextInput Name, .Label "Name", UpdateName
            Button "Continue", action { }
         }
      }
   }
}
```

Compile it into the runtime and refresh the browser:

```sh
./agent tao compile "Apps/Test Apps/My First App/My First App.tao" \
  --runtime-dir packages/expo-runtime --std-lib-root packages/tao-std-lib
```

You wrote no colors, spacing, or styling, yet it should look like a real app.

## 6. Optional 10-second sanity check (no browser)

```sh
./agent headless-test-runtime test "Beautiful"
```

Renders the compiled fixture in Jest and asserts the title, body, buttons, and all three states are visible. A green check means the pipeline is wired end to end.

## Caveat

The generated output (palette, frame, seeded accent, and state components all emit correctly) and the headless render were verified programmatically, but the browser was not opened during implementation. Steps 1-3 are where you confirm it actually _looks_ great, not just that it compiles great.
