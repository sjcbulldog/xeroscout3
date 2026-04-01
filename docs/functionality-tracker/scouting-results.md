# Scouting Results

## Owns
- `IPCScoutResult`
- `IPCScoutResults`
- initial values, draft state, and synced scouting payloads

## Current Functionality
- Scout captures control values into named typed values.
- Team and match results are stored and synced separately.
- Team results can be reused to support robot photo viewing and related workflows.
- Draft state and current section state are preserved in the scouting form view.

## Core User Stories
- As a scout, I can fill out a form and have my answers saved correctly.
- As Central, I can merge incoming results into the right team or match data.
- As a user, I do not lose work when switching sections or recovering from interruption.

## Test Focus
- result serialization
- result merge behavior
- duplicate item replacement rules
- draft restore behavior
- active team result usage in match scouting

## Open Gaps
- no full E2E assertion yet from form input through Central data update
- no artifact summary yet that compares sent vs received scouting payloads
