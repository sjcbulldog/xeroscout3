# Tablets

## Owns
- `IPCTabletDefn`
- tablet purpose assignment
- tablet scheduling and event assignments

## Current Functionality
- Tablets are configured in Central.
- Tablets have a purpose: `team` or `match`.
- Central generates tablet schedules for teams and matches.
- Scout uses tablet identity to determine what data and assignments it should receive.

## Core User Stories
- As Central, I assign tablets to team scouting or match scouting.
- As a scout, I select the correct tablet and receive the right assignment.
- As an event operator, I lock an event only when the tablet setup is valid.

## Test Focus
- tablet configuration load/save
- tablet selection dialog behavior
- schedule generation validity
- assignment-based nav population in Scout

## Open Gaps
- no fixture builder yet for realistic tablet schedules in E2E
- no E2E test yet for tablet selection followed by sync
