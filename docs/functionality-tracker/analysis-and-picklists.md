# Analysis And Picklists

## Owns
- auto analysis payloads
- formulas
- datasets
- picklists
- graph and prediction configuration surfaces

## Current Functionality
- Central and Coach expose analysis-oriented views after event setup.
- Auto analysis, formulas, datasets, picklists, and match prediction are part of the navigation model.
- These features depend on stable team/match data flowing into the DB layer first.

## Core User Stories
- As a strategist, I can inspect derived metrics after scouting data arrives.
- As a coach, I can use picklists and single-team views for decision-making.
- As an analyst, I can trust that derived views are built on valid scouting data.

## Test Focus
- view registration and basic load
- config save/load behavior
- derived data generation against fixture data
- resilience to empty or partial data

## Open Gaps
- these features currently rely more on unit-level coverage than E2E coverage
- no fixture-driven E2E yet for end-to-end “scout -> sync -> analysis view updates”
