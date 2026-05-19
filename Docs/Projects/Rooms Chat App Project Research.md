# Rooms Chat App Project Research

## Goal

Define the second flagship Buildable App MVP example: a minimal realtime chat app where users pick a username, create rooms, enter rooms, and send messages without login.

## Current Context

- This app complements Still by proving shared realtime data instead of local personal data.
- The app should be simple enough to understand immediately and rich enough to prove rooms, relationships, live lists, creation flows, navigation, and provider behavior.
- The working name is **Rooms**.

## Decisions

- No login, accounts, passwords, invites, profiles, avatars, or auth model.
- First launch asks for a username and stores it locally for the device/app session.
- Any user can create a room.
- Any user can enter any room.
- A room contains messages.
- Sending a message stores the current username directly on the message.
- Message editing, deletion, reactions, read receipts, typing indicators, private rooms, moderation, file uploads, image uploads, and push notifications are deferred.
- The app should use the realtime provider path, likely InstantDB, because Memory cannot demonstrate multi-user chat.

## User Interview Notes

- The user wants a chat app with any number of rooms.
- Any user can create a new room.
- Users do not log in; they just pick a username.
- Users can go into chat in any room.
- Keep the app minimal.

## Repo Findings

- The data MVP plan already has Memory and InstantDB providers.
- The data MVP plan treats real auth/session as out of scope, matching username-only chat.
- `create` exists and `update` remains active MVP work; chat MVP mostly needs `create` for rooms and messages.
- Navigation is still WIP at the Tao language level, so Rooms is a useful pressure test for stack-style navigation.
- Existing provider capability work may need to prove live updates and relationship loading clearly before chat can be treated as done.

## External Research

No external research is required for the MVP. The app uses Tao-owned example data and the existing provider direction rather than external public APIs.

## Alternatives Considered

- **Authenticated chat:** rejected for MVP because it would pull auth/session policy into the demo.
- **Direct messages:** deferred because rooms prove the core shared-data behavior with less identity complexity.
- **Profiles and avatars:** deferred because storing `AuthorName` directly is enough for the no-login demo.
- **Local-only chat:** rejected for flagship chat because it would not prove realtime shared data.

## Unresolved Questions

- None for the first implementation plan.

## Planning Inputs

- Project name: Rooms chat app MVP.
- Primary acceptance test: two app clients can see the same rooms and messages without login.
- MVP data model candidates: `Room`, `Message`, and local username state.
- Likely core rules: username required before room list; rooms are public; messages store body, author name, room, and sent time.
- Likely implementation dependencies: InstantDB provider path, create mutations, live query refresh, navigation, basic text input, button events, scenario/runtime coverage.
- Next step: run `project-3-write-project-plan`.
