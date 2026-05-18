# Automatic Library Bridges

This project explores generating Tao library bridges automatically for TypeScript, Expo, and native React Native libraries.

## Purpose

Tao apps will need access to existing runtime libraries without hand-writing every wrapper. The goal is to design a bridge system that can inspect or describe a TypeScript, Expo, or native module API and produce Tao-facing declarations, validation rules, and runtime adapter code.

This must preserve Tao's core rule: Tao UI/app behavior targets React Native and Expo. Any imported capability must map to React Native/Expo behavior, a Tao-owned runtime helper, or a clear validation/runtime error.

## Bridge Targets

- TypeScript libraries with pure functions, objects, classes, hooks, or async APIs.
- React Native component libraries.
- Expo modules.
- Native React Native modules.
- Platform-specific APIs that may exist only on iOS, Android, web, or headless test runtime.

## Questions To Answer

- How does Tao discover a library's API: TypeScript declarations, package metadata, explicit bridge config, examples, documentation, or generated probes?
- Which APIs can be bridged automatically, and which require manual Tao annotations?
- How are TypeScript types converted into Tao types?
- How are React hooks represented safely in Tao views?
- How are async functions, promises, event emitters, subscriptions, and cleanup lifecycles represented?
- How are React Native components mapped into Tao views or elements?
- How are Expo/native permissions declared and validated?
- How are platform availability and fallback behavior represented?
- How does the headless test runtime handle APIs that require native modules?
- How are bridge versions locked so generated Tao declarations stay compatible with installed packages?
- How does Tao prevent unsafe or app-incompatible APIs from becoming easy to call accidentally?

## Type Mapping Considerations

- TypeScript primitives map to Tao primitives where possible.
- TypeScript object shapes map to Tao item/object types when their fields are statically knowable.
- String literal unions can become Tao enum-like values.
- Function parameters and return values need named and typed Tao declarations.
- Generic APIs may need explicit bridge specialization instead of automatic exposure.
- Unknown, `any`, overloaded, conditional, or highly dynamic types should require manual bridge decisions.

## Runtime Mapping Considerations

- Pure functions can compile to direct imported calls if their types are safe.
- Async APIs need Tao loading/error semantics.
- Hooks need React-valid call positions and cannot be exposed as ordinary functions.
- Components need view/element declarations with typed props and children rules.
- Native modules need platform availability checks, permission handling, and headless fallbacks.
- Event emitters need subscription lifetime ownership.

## Generated Artifacts To Explore

- Tao declaration files for bridged functions, views, actions, and types.
- TypeScript runtime adapter modules.
- Validation metadata for platform support, permissions, and unsupported runtime surfaces.
- Test stubs or mocks for headless runtime.
- Documentation summaries for Tao users.
- Lock metadata tying generated declarations to package names and versions.

## Example Sketch

```tao
use Haptics from @tao/expo-haptics

action Save {
  do Haptics.impact medium
}
```

Possible generated boundary:

```tao
module @tao/expo-haptics {
  action impact Style is haptic_impact_style

  type haptic_impact_style is text one_of light, medium, heavy
}
```

The bridge would also need runtime metadata saying this is an Expo/native capability, what platforms support it, and what the headless runtime should do.

## Risks

- Automatic bridging can expose too much low-level API surface and undermine Tao's UI-app focus.
- TypeScript types do not always capture runtime constraints such as permissions, platform availability, or hook call rules.
- Native modules can fail at install/build/runtime in ways pure TypeScript libraries do not.
- Generated declarations can drift from installed package versions.
- A bridge that is too magical will make diagnostics harder to understand.

## Initial Direction

Start with explicit bridge manifests plus TypeScript type extraction, not fully automatic inference. The manifest should describe Tao-facing names, platform support, permission needs, hook/component/action boundaries, and headless behavior. Type extraction can fill in safe parameter and return types after the human-facing boundary is chosen.
