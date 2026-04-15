# Source maps — remaining work

This doc lists **what is left to do**. For what already ships (compiler maps, bundle rewrite middleware, segment remapping, tests), see [SourceMapping.md](SourceMapping.md).

**Constraint (unchanged):** Chrome uses the **single** final source map for the bundle, not chained maps.

---

## 1) Show both `.tao` and `.tsx` in DevTools Sources

### Current behavior

The bundle rewrite **replaces** each Tao-generated module’s `sources[i]` / `sourcesContent[i]` from `_gen/tao-app/.../*.tsx` with the `.tao` path and text. DevTools then lists **`.tao`** as the mapped original for that chunk, not the generated `.tsx` (the files still exist on disk under `_gen/`).

### Goal

Under the bundle’s mapped tree, list **both** `Apps/.../*.tao` and `_gen/tao-app/.../*.tsx` (or equivalent paths), with sensible behavior when stepping and setting breakpoints.

### Next steps

1. **Dual-source v3 map (design change)**
   - Do **not** remove the TSX row from `sources[]`. **Append** a second entry for the `.tao` file (new `sourceIndex`), with matching `sourcesContent`.
   - Update **every segment** so `sourcesIndex` points at either TSX or Tao according to a clear policy (e.g. all statement-level mappings → Tao; structural / unmapped glue → TSX—or the inverse for debugging generated code).

2. **Rewrite pipeline**
   - Extend [packages/expo-runtime/tao-source-map-rewrite.cjs](packages/expo-runtime/tao-source-map-rewrite.cjs): insert Tao source + content, **preserve** TSX source + content, remap segments to the correct `sourceIndex` instead of only swapping index `i` to Tao.
   - Keep `names[]`, `ignoreList`, and segment length (4 vs 5 fields) valid after edits.

3. **Product policy**
   - Decide what “default” stepping shows (Tao vs TSX) and whether tooling or env toggles that.

4. **Lighter alternative (no map change)**
   - Document adding `Apps/` and `_gen/tao-app/` as **Workspace** folders in Chrome so both trees are open beside the bundle; that does **not** put both under the same webpack module without dual-source maps.

---

## 2) `.tao` debugger highlight / stepping (stuck on `}`; not line-by-line in Tao)

### Symptom

On pause at `debugger` inside an `action`, DevTools highlights the **closing `}`** of the action (or does not advance **one Tao line per step**).

### Likely causes (check in order)

1. **Sparse or column-mismatched mappings** — Not every generated column on the paused line has a segment; Chrome uses **nearest** mapping and can snap to a **wide** AST span (e.g. whole `action` / closing brace).
2. **Bundle remap vs compiler map** — [tao-source-map-rewrite.cjs](packages/expo-runtime/tao-source-map-rewrite.cjs) remaps with `originalPositionFor(compilerMap, { line, column })`. If bundle columns do not align with what the compiler map encodes, Tao line/column drifts after rewrite.
3. **Stepping is still generated-address based** — Each step advances in JS; if the **next** instruction’s bundle→Tao mapping is missing or maps into the **same** Tao span, the highlight will not move “one Tao line” per step.
4. **Metro / Babel stack** — Intermediate layout in the bundle map may still dominate until segments are dense and consistent end-to-end.

### Engineering checklist

- [ ] **Decode the final bundle `.map`** (after middleware rewrite) for the paused **generated** line: list segments and `sourceIndex` / original line–column; confirm a segment exists whose Tao position is the **`debugger` line**, not only the `}` line.
- [ ] **Decode `DevApp.tsx.map` (compiler-only)** — `originalPositionFor` at the TSX `debugger` keyword (line/column) should resolve to the correct Tao line; if not, fix [trace-to-source-map.ts](packages/compiler/compiler-src/trace-to-source-map.ts) / codegen tracing first.
- [ ] **If compiler map is good but bundle is wrong** — Fix remap loop: invalid `originalPositionFor` fallback (leaving TSX coords while `sources` says `.tao`), column **0** vs keyword column, or bias handling.
- [ ] **If compiler map is weak on the `debugger` column** — Tighten [runtime-gen.ts](packages/compiler/compiler-src/codegen/app/runtime-gen.ts) / tracing so emitted text and Langium **target** positions match the real `debugger` token (and each statement has distinct Tao positions where possible).
- [ ] **Automated regression** — Fixture: known bundle segment (gen line/col) → expected Tao (line/col) after rewrite; optional compile-time `TAO_DEBUG_MAP_CHAIN` logging at pause positions.

---

## 3) Optional follow-ups (not blocking the above)

| Item                                | Notes                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Repo-relative `sources[]` paths** | Plan originally wanted `Apps/...` not absolute paths; still worth normalizing for portability and consistent DevTools grouping. |
| **`TAO_SOURCE_MAP_MODE`**           | Off / authored / TSX-only toggles for debugging the pipeline itself.                                                            |
| **Per-module logging**              | TSX path, Tao path, rewrite success, `sourcesContent` presence.                                                                 |
| **Native / Hermes**                 | Current validation is **web + Chrome**; native symbolication is a separate track.                                               |

---

## References

- [SourceMapping.md](SourceMapping.md) — shipped behavior, file list, limitations.
- High-level historical context (if kept): older “phase” narrative may live elsewhere; this file is intentionally **forward-only**.
