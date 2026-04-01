# Controls

## Owns
- `IPCFormControlType`
- `IPCFormItem` and all typed control variants
- user interaction inside forms

## Current Functionality
- Supported controls include:
  - `label`
  - `text`
  - `textarea`
  - `boolean`
  - `updown`
  - `choice`
  - `select`
  - `timer`
  - `stopwatch`
  - `box`
  - `image`
  - `autoplan`
  - `autoselector`
  - `robotphoto`
  - `robotviewer`
- Controls are instantiated in both edit and scout rendering paths.
- Generic `data-testid` support now exists for form controls by mode, type, and tag.
- `stopwatch` supports hold-mode behavior.
- `robotphoto` supports camera capture and file selection.

## Core User Stories
- As a scout, I can tap, type, hold, and select values quickly during a match.
- As a form designer, I can place and configure the controls needed for the game.
- As Central, I can trust that data-bearing controls serialize into stable scouting results.

## Test Focus
- control render in edit and scout modes
- control serialization/deserialization
- hold-mode stopwatch behavior
- camera/pick-photo behavior
- selector availability for automation

## Open Gaps
- no deterministic fake-camera seam yet
- no E2E test yet for the full control matrix
- confirmation and sync-dialog selectors still need dedicated coverage
