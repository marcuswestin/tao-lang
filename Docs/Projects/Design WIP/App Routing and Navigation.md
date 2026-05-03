# App Routing and Navigation

Batch-moved raw notes from `Docs/Tao Lang Roadmap.md` and related docs. Keep rough notes here until promoted into a dedicated project spec.

## Current direction

- Design Routing and Navigation.
- Keep route and navigation design separate from layout and error-state syntax, but link them where behavior overlaps.

## Open questions

- What is the Tao surface for route declarations?
- How should route params be typed and validated?
- How should guards compose with loading/error/NaV states?
- What is the boundary between app-level navigation and component-level view switching?
- Should navigation be declared only at top-level app/module scope, or also inside view modules?

## Related docs

- [Tao Lang Roadmap](../../Tao%20Lang%20Roadmap.md)
- [Error Handling](Error%20Handling.md)
- [UI Layout and Styling](UI%20Layout%20and%20Styling.md)
- [Runtime — TanStack Query and InstantDB](../Data%20Schema%20and%20Queries/Process%20Docs/Runtime%20-%20TanStack%20Query%20and%20InstantDB.md) (includes **RAW TRANSFER** data-source/provider notes that lived under routing in the old roadmap)

---

## RAW TRANSFER (from `Docs/Tao Lang Roadmap.md` @ git `HEAD`)

Verbatim excerpt: old roadmap lines **614–617** (routing bullets only). The long **data sources / driver** block that followed under `#### Layout: Choice exploration…` was misplaced in the old outline; it is archived under **RAW TRANSFER** in [Runtime — TanStack Query and InstantDB](../Data%20Schema%20and%20Queries/Process%20Docs/Runtime%20-%20TanStack%20Query%20and%20InstantDB.md).

### Design App Routing and Navigation

- [ ] Design Routing and Navigation
