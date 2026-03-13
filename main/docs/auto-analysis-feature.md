# Auto Analysis Feature Handoff

## Purpose
Add a new `Auto Analysis` section under `Analysis` that lets the user:

- pick a team
- see the autos stored for that team from team scouting
- see which auto was selected/played for that team in each match

This feature spans both repos in `G:\programming\xeroscout3`:

- `main`
- `renderer`

## Important Build Ownership Rule

This is the main reason the earlier change failed.

`main/package.json` does all of the following during a normal build:

1. builds the renderer from `../renderer`
2. copies `../renderer/dist/renderer/xeroapp.bundle.js` into `main/dist/renderer`
3. copies `../renderer/src/shared/*.ts` into `main/src/shared`

That means:

- `main/src/shared` is not the source of truth
- `main/dist/renderer/xeroapp.bundle.js` is not the source of truth

Any changes made directly to those files inside `main` will be overwritten the next time renderer build/copy runs.

## Source Of Truth By Area

### Main repo
Put these changes in `G:\programming\xeroscout3\main`:

- Central/Coach commands and nav entries
- IPC handlers in the Electron main process
- preload allowlist changes
- backend aggregation code that reads the DB and builds auto-analysis payloads

Relevant files:

- `src/main/apps/sccentral.ts`
- `src/main/apps/sccoach.ts`
- `src/main/apps/sccoachcentralbase.ts`
- `src/main/ipchandlers.ts`
- `src/main/preload.ts`
- `src/main.ts`
- `src/main/project/autoanalysis.ts`

### Renderer repo
Put these changes in `G:\programming\xeroscout3\renderer`:

- shared IPC type definitions
- renderer-side `Auto Analysis` view
- renderer view registration

Relevant locations:

- `src/shared/ipc.ts`
- `src/views/...` for the new auto-analysis view
- `src/apps/xeroapp.ts` or equivalent renderer view registration file

Do not treat `main/dist/renderer/xeroapp.bundle.js` as the permanent implementation location.

## Data Model For The Feature

### Where auto data comes from

Team autos:

- team form `autoplan` controls store a JSON string
- that JSON is saved into the team DB under the control tag

Match selected auto:

- match form `autoselector` controls show available autos by parsing the active team result
- the selected value stored in match scouting is only the auto name string

### Consequence

If two planner fields for the same team contain autos with the same name, the match DB cannot uniquely identify which planner field the selection came from.

The feature should treat this as:

- `matched` when exactly one stored auto matches the name
- `ambiguous` when more than one stored auto matches the name
- `other` when the stored value is `Other`
- `blank` when empty
- `unknown` when non-empty but not found in current stored autos

No storage migration is required for v1.

## Recommended IPC Payload

Define these in `renderer/src/shared/ipc.ts`, then let the normal copy step bring them into `main/src/shared`.

- `IPCAutoAnalysisNode`
- `IPCAutoAnalysisEdge`
- `IPCAutoAnalysisAuto`
- `IPCAutoAnalysisSelection`
- `IPCAutoAnalysisMatchRow`
- `IPCAutoAnalysisTeamSummary`
- `IPCAutoAnalysisPayload`

Suggested top-level payload shape:

```ts
interface IPCAutoAnalysisPayload {
  teams: IPCAutoAnalysisTeamSummary[];
  autosByTeam: { [teamNumber: string]: IPCAutoAnalysisAuto[] };
  matchesByTeam: { [teamNumber: string]: IPCAutoAnalysisMatchRow[] };
  plannerTags: string[];
  selectorTags: string[];
}
```

## Backend Implementation Notes

Create or keep the aggregation logic in `main/src/main/project/autoanalysis.ts`.

The backend should:

1. read the current team form and collect only `autoplan` tags
2. read the current match form and collect only `autoselector` tags
3. read team DB rows and parse planner JSON from those planner-tag columns
4. read match DB rows and collect selected auto values from those selector-tag columns
5. classify each selection against the current stored autos for that team
6. sort match rows in event order

This logic should live in `main`, because it depends on project/form/database managers.

## Renderer UI Recommendation

Create a dedicated `Auto Analysis` view in `renderer`.

Recommended layout:

- left panel: team list with search
- right top: stored auto cards grouped by planner tag
- right bottom: match history table with one column per `autoselector` tag

Recommended interaction:

- clicking a match row highlights the matching auto card
- ambiguous rows highlight all candidate auto cards
- `Other`, blank, and unknown values show badges but no forced diagram highlight

## Command / View Wiring

### Main
Add a new command like:

- `view-auto-analysis`

Wire it in:

- `src/main/apps/sccentral.ts`
- `src/main/apps/sccoach.ts`

Both apps should call:

```ts
this.setView("auto-analysis");
```

### Renderer
Register a matching renderer view named:

```ts
"auto-analysis"
```

## Build Flow

Once the renderer-side source changes are in the `renderer` repo:

1. build renderer from `main` or directly from `renderer`
2. let `main` copy the renderer bundle and shared IPC files
3. compile `main`

From `main`, the normal path is:

```powershell
npm run build
```

If you only changed `main` TypeScript:

```powershell
npx tsc
```

## Resume Checklist

When resuming this work later, do this in order:

1. open `G:\programming\xeroscout3\renderer`
2. add the auto-analysis shared IPC types in `renderer/src/shared/ipc.ts`
3. implement the renderer view in `renderer/src/views/...`
4. register the new view in renderer app startup
5. return to `G:\programming\xeroscout3\main`
6. add or finish backend aggregation and IPC wiring in `main/src/main/...`
7. run the normal build from `main`

## Do Not Rely On

These are generated or copied artifacts:

- `main/src/shared/ipc.ts` after renderer copy
- `main/dist/renderer/xeroapp.bundle.js`

Use them only for inspection, not as the permanent implementation target.
