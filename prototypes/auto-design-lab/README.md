# Tao Auto-Design Lab (prototype)

A throwaway, self-contained exploration of what AI-driven design could feel like inside Tao. **Not production code.** It does not touch the compiler, runtime, or std-lib.

## Run it

Open `index.html` in any browser (double-click it, or use the Launch preview panel). No build, no server, no dependencies.

## What it demonstrates

1. **Describe -> designed app.** Type an app description ("a calm meditation journal", "a bold streetwear shop"). A stand-in design intelligence reads the intent and generates a complete, cohesive look: palette, typography scale, spacing rhythm, corner radius, shadow language, and a named template. A live mock Tao app re-themes instantly.
2. **A rationale + token spec.** It shows what it detected and the design system it produced (swatches, type ramp, scale ratio, radius, spacing), the way a real generated design lock would.
3. **High-level knobs instead of CSS.** Tone (quiet to expressive), density (airy to compact), and a seed slider re-derive the entire look from intent, not hand-authored styles.
4. **Same source, many looks.** A gallery renders the _same_ app content under different briefs, and "Reshuffle seeds" shows deterministic per-app variation within a template (the "different apps, different defaults" tenet, taken further than the shipped accent-only slice).
5. **Before/after.** Raw unstyled primitives vs. the auto-designed result, side by side.

## How it maps to real Tao

The engine (`<script>` in `index.html`) is a deterministic heuristic: it tokenizes the description, scores it against mood lexicons, picks one of five curated templates (Quiet Craft, Crisp Operations, Expressive Product, Warm Editorial, Nocturne), and derives a token set from the template plus a seed.

In the real system this would:

- live in the compiler's design module (alongside `packages/compiler/compiler-src/design/`),
- read the existing `design { description "..." }` block already in the Tao grammar,
- emit the same token shape that `packages/tao-std-lib/tao/tao-runtime/tao-design-runtime.tsx` and `Views.tsx` already consume (palette, accent, spacing, radius, type),
- and swap the heuristic for a real model behind one interface, with the deterministic version as the offline/test fallback.

Everything rendering in the demo is driven by that token output, so the heuristic-vs-model choice is an implementation detail, not an architecture change.

## Caveat

The five templates use curated palettes so the output always looks tasteful; a naive "generate random colors" engine usually does not. A real LLM path would need guardrails (contrast checks, palette families, a fixed shape grammar) to stay this coherent. That guardrail layer is arguably the real product, and the heuristic here is a sketch of its output contract.
