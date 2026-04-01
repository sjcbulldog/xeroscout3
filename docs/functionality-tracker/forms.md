# Forms

## Owns
- `IPCForm`
- `IPCTablet`
- form purpose: `team` or `match`
- top-level form structure and tablet size metadata

## Current Functionality
- Forms are loaded from JSON and shared across main and renderer.
- Each form has a purpose, tablet definition, and ordered sections.
- Forms are edited in Central and rendered in Scout.
- Forms are validated before a locked event can be used for scouting.

## Core User Stories
- As a scouting lead, I can define a team form and a match form for an event.
- As a scout, I receive the correct form for my assignment after sync.
- As Central, I reject invalid forms before they break live scouting.

## Test Focus
- form loads correctly
- purpose is respected
- invalid form is rejected
- synced form matches the stored form

## Open Gaps
- no end-to-end fixture pack for locked, sync-ready forms yet
- no dedicated E2E coverage for form transfer and render parity yet
