# Architecture Memory

## Core Layout
- `main/` owns Electron bootstrap, IPC registration, managers, sync transport, logging, and tests.
- `renderer/` owns views, widgets, forms, controls, and user interaction logic.
- `main/content/` contains the loaded HTML/CSS/assets bundle.

## Main Data Structures To Remember
- `IPCForm`
- `IPCSection`
- `IPCFormItem` and typed control variants
- `IPCScoutResult` / `IPCScoutResults`
- `IPCDatabaseData`
- `IPCTabletDefn`

## Navigation And Views
- Renderer views are registered centrally in `renderer/src/apps/xeroapp.ts`.
- Central and Scout share the same runtime shell but expose different views.
- Nav entries come from the main process and are rendered in `renderer/src/xeronav.ts`.

## Sync And Event State
- Central starts sync when a project is locked and loaded.
- Scout with no event UUID opens the empty text view.
- Central with an event fixture path can boot directly into the `info` view.

## Testing-Relevant Design Notes
- Generic form control selectors are now available from the `FormControl` base class.
- App/view/nav/status/tab selectors are now stable enough for initial automation.
- The next E2E value is no longer “launch the app”; it is “launch a locked event and prove local sync works.”
