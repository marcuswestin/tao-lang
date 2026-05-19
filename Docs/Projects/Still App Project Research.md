# Still App Project Research

## Goal

Define the first flagship Buildable App MVP example: a minimalist, native-feeling personal focus app that answers "what should I do now?" with exactly one active activity or one recommended next activity.

The app should demonstrate Tao's ability to produce a polished, personal-data-only Expo/React Native app from small, readable Tao source. It should be intentionally restrictive rather than a general TODO app.

## Current Context

- The project selected for research is the first Buildable App MVP demo app, currently named **Still**.
- The broader demo suite may later include a second realtime chat app, but this research document is scoped to Still only.
- Still uses personal data only for MVP. Public feeds, authentication, authorization, and on-device LLM behavior are deferred.
- Tao's roadmap already identifies the required underlying areas: data schemas and mutations, native UI defaults, design inference, interactions/events, forms/inputs, runtime targets, and scenario/example coverage.
- The app is meant to set up later local LLM functionality by producing semantically rich private data, but LLM inference is not part of this MVP.

## Decisions

- Still is not a TODO app, backlog, project manager, or feed reader.
- The product question is: **What should I do now?**
- The main app surface must show only one active or recommended activity at a time.
- If an activity is active, opening the app shows only that activity.
- Seeing or choosing other activities while one is active requires deactivating or ending the current activity first.
- A user can have at most three active intentions at any given time.
- An intention represents something the user wants their life to be like, wants in their life, or wants to move toward.
- Intentions can be marked inactive instead of deleted.
- Activities are common recurring behaviors that align the user with one or more intentions.
- Activities can be marked inactive instead of deleted.
- Activities and intentions have a many-to-many relationship.
- The MVP data model should represent activity-intention many-to-many links with explicit link records.
- Creating an activity requires associating it with at least one intention.
- An activity has a short title and may have an optional description.
- Activity titles should be encouraged, through visual design, to be only a few words.
- Longer activity titles are allowed, but the UI should make them feel less ideal by scaling text down or otherwise losing the crisp short-title feel.
- When no activity is active, the main view can show a list of activities tagged by their associated intentions.
- The idle activity list should show active activities linked to at least one active intention.
- When no activity is active, Still should subtly elevate one recommended activity while keeping the rest of the activity list available underneath.
- Activating an activity records its start time.
- Ending an activity records its end time.
- The active-activity view should not show a timer.
- The active-activity view should show the active activity and a `Conclude` action.
- Concluding an activity only records the stop time and returns the app to the idle activity list.
- MVP sessions do not collect reflection, notes, or completion status.
- Over time, Still should surface underrepresented activities or intentions.
- MVP recommendation logic should be deterministic and local, not AI-driven.
- MVP recommendation logic should use a simple weighted combination of recency, session count, and total time.
- Recommended MVP score: `50% recency deficit + 30% session-count deficit + 20% total-time deficit`, computed across active activities.
- The recommendation should prefer the highest-scoring active activity and use stable creation order as the deterministic tie-breaker.
- MVP should not include a history or insights screen.
- Past session data should only surface indirectly through the recommendation logic in MVP.
- If there are no intentions, Still shows the create-intention screen until an intention is created.
- MVP screens are Create Intention, Now, Add Activity, and Manage.
- Auth, authorization, public feeds, and on-device LLM inference are deferred.

## User Interview Notes

- The first app should be personal, native-feeling, minimalist, and restrictive.
- The app should answer "what should I do now?" whenever opened.
- There should be one choice or active activity at any given time.
- The user wants at most three intentions at any given time.
- Intentions and activities should support only a simple active/inactive state in MVP.
- Activities are recurring alignment behaviors associated with at least one intention.
- Activities can belong to more than one intention.
- Activity titles should ideally be only a couple of words, with an optional description available if needed.
- The design should encourage short activity names by making long names fit but feel less visually strong.
- The idle main view can show activities as a list with intention tags.
- The idle main view should subtly recommend one activity rather than making every activity visually equal.
- Show active activities linked to active intentions; inactive intentions or activities stay out of the main list.
- Activity sessions record start and end times.
- Active sessions should be visually quiet: no timer, only the active activity and a conclude button.
- Concluding a session should only set its stop time; no note, reflection, or success/failure state is collected in MVP.
- No insights or history surface is needed for MVP; start/stop history can remain behind the scenes.
- The recommendation should combine least recently done, least session count, and least total time rather than choosing one metric.
- A simple starting formula is `0.5 * recencyDeficit + 0.3 * countDeficit + 0.2 * timeDeficit`.
- Tie-breakers should not become product semantics; use stable creation order and move on.
- First launch does not use starter examples. If no intentions exist, the app blocks on intention creation.
- Keep the visible surface minimal: Create Intention, Now, Add Activity, and Manage.
- Later functionality may identify underrepresented activities and eventually use local LLM inference, but not for MVP.

## Repo Findings

- `CORE_TENETS.md` requires Tao apps to have sane, tasteful defaults and work out of the box.
- `Docs/Tao Project Roadmap.md` defines the Buildable App MVP as the ability to build, run, test, and prepare a small real Expo/React Native app with data, navigation, UI, styling, interactions, error states, and core tooling.
- The roadmap shows design inference and native visual defaults as planned but not implemented.
- The data roadmap says Memory is the default provider when unspecified, which matches the local personal-data MVP direction.
- The data roadmap says `create` exists and `update` remains active MVP work, which matters for starting/ending sessions and editing intentions or activities.
- The interactions roadmap identifies press/change/submit/focus and action lifecycle behavior as unresolved pieces needed by real apps.
- The forms area has no dedicated project doc yet, so Still may need to force a narrow input/form slice.
- The testing/example-app area says canonical example apps are part of the Buildable App MVP, so Still should become an executable scenario once planned.

## External Research

No external research is required yet. The current MVP is local personal data only and does not depend on current third-party APIs, platform account policies, or public data-source limits.

## Alternatives Considered

- **Generic TODO app:** rejected because it encourages backlog/list behavior and does not answer "what should I do now?"
- **HN or public-feed reader:** rejected for the first app because saved articles do not naturally become tasks or personal activities.
- **Reading queue or knowledge shelf:** useful later, but not as direct as the personal focus app for proving native-feeling personal data.
- **Local LLM focus assistant:** deferred because the MVP should prove the app loop without AI dependency.
- **Habit tracker:** adjacent, but weaker than the intention/activity/session model because it can become a checklist instead of a present-tense guidance tool.

## Unresolved Questions

- None for the first implementation plan.

## Planning Inputs

- Project name: Still app MVP.
- Primary acceptance test: opening the app always presents exactly one active or recommended activity.
- MVP data model candidates: `Intention`, `Activity`, activity-intention link records, `Session`.
- Likely core rules: max three active intentions, one active session globally, activity sessions record only `StartedAt` and `EndedAt`.
- Recommendation rule: rank active activities with a deterministic weighted score from recency, session count, and total time.
- Idle list rule: show active activities linked to active intentions.
- Screen set: Create Intention, Now, Add Activity, Manage.
- Do not plan a visible insights/history screen for MVP.
- Likely implementation dependencies: local data provider, `create`, `update`, basic input controls, button events, conditional rendering, native default UI, app scenario coverage.
- Next step: run `project-3-write-project-plan`.
