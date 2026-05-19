# Rooms Chat App Project Plan

## Summary

Build **Rooms**, a minimal realtime chat example that proves Tao can compile a shared-data app with rooms, messages, username-only identity, navigation, live updates, and native-feeling inputs.

## Goals

- Ship a canonical `Apps/Test Apps/Rooms/` example.
- Demonstrate realtime provider behavior with public rooms and messages.
- Keep identity deliberately simple: choose a username, no login.
- Use the smallest data and navigation surface that still feels like a real chat app.

## Non-Goals

- No auth, authorization, private rooms, invites, moderation, profiles, avatars, typing indicators, read receipts, reactions, file upload, image upload, push notifications, message editing, or message deletion.
- No public external APIs.
- No offline conflict-resolution policy beyond whatever the provider already supports.

## Assumptions

- Rooms targets InstantDB or the repo's realtime provider path, not Memory.
- Username is local client state or local storage, not a secure identity.
- Messages denormalize `AuthorName` to avoid user-account complexity.
- Chat ordering can use `SentAt`; if provider ordering is not ready, the plan should expose that as a provider capability gap rather than inventing app-specific behavior.

## Implementation Steps

### 1. Add the Rooms Target App Skeleton

Context: Rooms needs a minimal source fixture that expresses the intended realtime app.

Work:

- Add `Apps/Test Apps/Rooms/Rooms.tao` and `scenario.json`.
- Model `Room` and `Message`.
- Sketch screens for Pick Username, Room List, New Room, and Room Chat.
- Configure the app for the realtime provider path.

Validation:

- Compile the target app as far as current Tao capabilities allow.
- Record any missing language/provider features as explicit blockers in the plan or scenario notes.

Exit criteria:

- Rooms exists as a canonical target app fixture.
- The data model and screen flow are visible in Tao source.

Suggested commit: `feat(rooms): add chat target app skeleton`

### 2. Implement Username And Room List Flow

Context: Users must pick a name before entering the shared room list.

Work:

- Show Pick Username until a non-empty username exists locally.
- Query public rooms.
- Create rooms with a name and created timestamp.
- Navigate from room list to room chat.

Validation:

- Scenario or runtime coverage proves username gate, room creation, and room navigation.

Exit criteria:

- A user can pick a username, create a room, and enter it.

Suggested commit: `feat(rooms): add username and room flow`

### 3. Implement Realtime Messages

Context: The app exists to prove live shared chat behavior.

Work:

- Query messages for the selected room.
- Send messages with `Room`, `AuthorName`, `Body`, and `SentAt`.
- Render messages grouped or aligned simply by current username versus others.
- Keep empty and loading states minimal.

Validation:

- Provider/runtime test proves sent messages appear in the current room.
- Manual two-client smoke test if the provider path supports it in the dev environment.

Exit criteria:

- Users can send and read messages in any room.
- Messages update without a full app rebuild or manual refresh.

Suggested commit: `feat(rooms): add realtime room messages`

### 4. Harden Provider And Navigation Gaps

Context: Rooms will expose whether Tao's current provider and navigation surfaces are demo-ready.

Work:

- Add provider capability checks needed by Rooms, especially live list refresh and message ordering.
- Keep route params typed enough for room identity.
- Fail clearly if the selected provider cannot support the required chat behavior.

Validation:

- Compiler/provider tests cover unsupported provider shapes.
- Runtime tests cover room identity and message filtering.

Exit criteria:

- Rooms does not depend on silent provider behavior.
- Navigation into a room is deterministic and testable.

Suggested commit: `feat(rooms): harden realtime provider routing`

### 5. Polish As A Canonical Chat Demo

Context: Rooms should look like a small native app, not a raw data harness.

Work:

- Tune native text input, keyboard behavior, room list states, message bubbles, and empty states.
- Add documentation notes for running the realtime demo.
- Add Rooms to canonical scenario/runtime coverage where feasible.

Validation:

- `./agent check`
- `./agent test`
- Manual realtime smoke if provider credentials/dev app are required.

Exit criteria:

- Rooms is a polished second demo app.
- The app clearly proves Tao's shared-data/realtime story without auth.

Suggested commit: `feat(rooms): polish chat demo`

## Deferrals

- Auth/session, permissions, private rooms, moderation, profiles, avatars, typing indicators, reactions, read receipts, message deletion/editing, uploads, notifications, and production abuse controls.
