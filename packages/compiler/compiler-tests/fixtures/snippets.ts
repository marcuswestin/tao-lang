/** SNIPPET_ACTION_BUMP_STEP_NUMBER is minimal `action Bump Step is number { }` for parser/formatter tests. */
export const SNIPPET_ACTION_BUMP_STEP_NUMBER = 'action Bump Step is number { }'

/** SNIPPET_ACTION_BUMP_AND_USE_DOT_STEP_RAW is unformatted action+use source for formatter Phase 3 tests. */
export const SNIPPET_ACTION_BUMP_AND_USE_DOT_STEP_RAW = 'action Bump Step is number { } action Use { do Bump .Step 3 }'

/** SNIPPET_ACTION_BUMP_AND_USE_DOT_STEP_FORMATTED is expected output for {@link SNIPPET_ACTION_BUMP_AND_USE_DOT_STEP_RAW}. */
export const SNIPPET_ACTION_BUMP_AND_USE_DOT_STEP_FORMATTED =
  'action Bump Step is number { }\n\naction Use {\n  do Bump .Step 3\n}'

/** SNIPPET_MINIMAL_BUMP_APP_BARE_STEP is a tiny app with bare `Step` at the `do` call site (codegen tests). */
export const SNIPPET_MINIMAL_BUMP_APP_BARE_STEP = `
app A { ui V }
state Counter = 0
action Bump Step is number { set Counter += Step }
view V { action Use { do Bump Step 1 } }
`.trim()

/** SNIPPET_MINIMAL_BUMP_APP_QUALIFIED_STEP is the same app with `Bump.Step` at the call site. */
export const SNIPPET_MINIMAL_BUMP_APP_QUALIFIED_STEP = `
app A { ui V }
state Counter = 0
action Bump Step is number { set Counter += Step }
view V { action Use { do Bump Bump.Step 2 } }
`.trim()

/** SNIPPET_MINIMAL_BUMP_APP_DOT_LOCAL_STEP is the same app with `.Step` at the call site. */
export const SNIPPET_MINIMAL_BUMP_APP_DOT_LOCAL_STEP = `
app A { ui V }
state Counter = 0
action Bump Step is number { set Counter += Step }
view V { action Use { do Bump .Step 3 } }
`.trim()
