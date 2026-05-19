# Still App Project Plan

## Summary

Build the first flagship Tao demo app: **Still**, a local-first, native-feeling personal focus app that answers "what should I do now?" with one active activity or one subtly elevated recommendation.

## Goals

- Ship a canonical `Apps/Test Apps/Still/` example.
- Demonstrate local personal data, many-to-many relationships, start/stop mutations, simple forms, conditional rendering, and polished native defaults.
- Keep the source and app behavior restrictive enough to feel unlike a TODO app.

## Non-Goals

- No auth, public feeds, sync, notifications, reminders, history screen, analytics, or LLM behavior.
- No timer UI. Sessions only record start and stop times.
- No hard deletes in the MVP surface; intentions and activities become inactive.

## Assumptions

- The Memory provider is the default local provider for this app.
- If the implementation needs current Tao data gaps, those gaps are part of this project rather than worked around with app-specific hacks.
- The visible MVP screens are Create Intention, Now, Add Activity, and Manage.

## Implementation Steps

### 1. Add the Still Target App Skeleton

Context: Still needs to become the concrete app that defines the first personal-data Buildable App MVP.

Work:

- Add `Apps/Test Apps/Still/Still.tao` and `scenario.json`.
- Model `Intention`, `Activity`, `ActivityIntention`, and `Session`.
- Add the app shell and placeholder screens with the intended native-minimal design direction.

Validation:

- `./agent tao compile "Apps/Test Apps/Still/Still.tao" --runtime-dir packages/expo-runtime`
- `./agent test "Still"` if a filtered scenario path exists after wiring.

Exit criteria:

- Still compiles as an app fixture.
- The source clearly shows the minimal data model and screen names.

Suggested commit: `feat(still): add target app skeleton`

### 2. Implement First-Run And Activity Creation Flow

Context: Still blocks on intention creation before showing Now.

Work:

- Show Create Intention when no active intentions exist.
- Allow creating an intention.
- Allow creating an activity with a short title, optional description, and at least one intention link.
- Enforce max three active intentions in validation or app logic, depending on current Tao capability.

Validation:

- Add or update compiler/runtime scenario coverage for create flows.
- Verify the app can move from empty state to Now without seeded data.

Exit criteria:

- Empty Still starts at Create Intention.
- After creating an intention and activity, Now is reachable.

Suggested commit: `feat(still): add first-run creation flow`

### 3. Implement Now, Active Session, And Conclude

Context: Now is the core product surface.

Work:

- Show active activities linked to active intentions.
- Subtly elevate one recommended activity.
- Start an activity by creating a `Session` with `StartedAt`.
- If a session is active, show only that active activity and `Conclude`.
- Conclude by setting `EndedAt`; do not collect notes or completion state.

Validation:

- Scenario proves start and conclude mutate session state.
- Headless/runtime rendering proves active-session mode hides the idle list.

Exit criteria:

- Opening Still always shows either the active session view or Now.
- Only one active session can exist.

Suggested commit: `feat(still): implement now and session flow`

### 4. Add Recommendation Scoring

Context: Still should feel helpful without adding insights UI.

Work:

- Rank active activities with `0.5 * recencyDeficit + 0.3 * countDeficit + 0.2 * timeDeficit`.
- Use stable creation order as the deterministic tie-breaker.
- Keep scoring local and inspectable.

Validation:

- Unit or scenario coverage for no-session, equal-score, and underrepresented-activity cases.

Exit criteria:

- The same data always produces the same recommendation.
- Session history affects only the subtle recommendation.

Suggested commit: `feat(still): add deterministic recommendation scoring`

### 5. Polish Native Defaults And Canonicalize The Example

Context: Still is a flagship demo, so the final experience must look calm and native by default.

Work:

- Tune layout, spacing, typography, empty states, and short-title behavior.
- Make longer activity titles fit while feeling less ideal than short titles.
- Add Still to shared scenario/runtime coverage and relevant docs.

Validation:

- `./agent check`
- `./agent test`
- Manual Expo/runtime smoke if native defaults or app shell behavior changed.

Exit criteria:

- Still is a canonical example app.
- The app demonstrates Tao's intended minimal code-to-polished-native experience.

Suggested commit: `feat(still): polish flagship example`

## Deferrals

- Visible history, insights, reminders, timers, widgets, notifications, sync, auth, and on-device LLM inference.
- Fine-grained statuses beyond active/inactive.
- User-authored recommendation weights.
