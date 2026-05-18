# Tao Core Tenets

These tenets are required context for Tao design, implementation, documentation, and review work.

- Tao is for creating UI apps and nothing else.
- Tao UI and app-runtime semantics target React Native and Expo. Any UI/runtime concept must map to React Native/Expo behavior, an explicit Tao runtime helper, or a clear validation/runtime error.
- Every configurable thing has sane and tasteful default values.
- Everything works out of the box without changing configurable values.
- Different apps should end up with different defaults. For example, Tao may select from a library of generated app design defaults using a deterministic hash of the project name, or generate tasteful app defaults programmatically.
