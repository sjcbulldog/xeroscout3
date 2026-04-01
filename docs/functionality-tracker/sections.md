# Sections

## Owns
- `IPCSection`
- ordered pages within a form
- section names and contained controls

## Current Functionality
- Sections are rendered as tabbed pages in the scouting UI.
- Section ordering is significant and defines navigation flow.
- Switching sections captures current control state into form data.
- Draft persistence depends on section-aware state capture.

## Core User Stories
- As a scout, I move through a form one section at a time.
- As a form designer, I can organize controls into clear sections.
- As a user returning from interruption, I resume in the right section with saved progress.

## Test Focus
- section ordering
- section tab selection
- state preservation across section changes
- draft restore to the correct section

## Open Gaps
- no dedicated E2E test yet for multi-section happy-path scouting
- feature-specific tab selectors exist at the widget layer, but section-flow assertions still need to be written
