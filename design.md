# XeroScout 3 — Design Document

**Version:** 3.0.26  
**Author:** Jack (Butch) Griffin  
**Platform:** Electron (Windows / macOS / Linux)  
**Language:** TypeScript

---

## 1. Overview

XeroScout 3 is an FRC (FIRST Robotics Competition) scouting system built as a cross-platform Electron desktop application. It is designed to be run on a small fleet of tablets/laptops at a competition event to collect, synchronise, and analyse match and team performance data.

The system consists of three distinct application personalities that are all delivered from the same codebase and executable, selected at launch via a command-line argument:

| Personality | CLI Arg   | Role |
|-------------|-----------|------|
| **Central** | `central` | Event operator station — manages the event, serves data to scouts, aggregates results |
| **Scout**   | `scout`   | Individual scouting tablet — collects match/team data on the field |
| **Coach**   | `coach`   | Drive-team coach tablet — consumes aggregated data for in-match decisions |

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 36+ |
| Main process | Node.js / TypeScript |
| Renderer process | TypeScript (compiled to a single webpack bundle) |
| Database | SQLite 3 (`sqlite3` npm package) |
| UI data tables | Tabulator Tables 6 |
| Charting | Chart.js 4 + chartjs-plugin-datalabels |
| Logging | Winston |
| Settings persistence | electron-settings |
| Networking | Node.js `net` (TCP) + `dgram` (UDP) |
| Service discovery | UDP broadcast (port 45456) |
| External data | Blue Alliance API, Statbotics API |
| Build / Package | Electron Forge + webpack |
| Package manager | npm (two separate workspaces: `main/`, `renderer/`) |

---

## 3. Repository Structure

```
xeroscout3/
├── main/                         # Electron main-process package
│   ├── src/
│   │   ├── main.ts               # Electron entry point & IPC registration
│   │   └── main/
│   │       ├── apps/             # Per-personality application classes
│   │       │   ├── scbase.ts     # Abstract base class for all app types
│   │       │   ├── sccentral.ts  # Central personality
│   │       │   ├── sccoach.ts    # Coach personality
│   │       │   ├── scscout.ts    # Scout personality
│   │       │   └── sccoachcentralbase.ts  # Shared base for Coach & Central
│   │       ├── project/          # Project / event data management
│   │       │   ├── project.ts    # Top-level project object
│   │       │   ├── projectinfo.ts
│   │       │   ├── datamgr.ts    # SQLite DB read/write logic
│   │       │   ├── formmgr.ts    # Scouting form loading & validation
│   │       │   ├── formulamgr.ts # Custom formula evaluation
│   │       │   ├── matchmgr.ts   # Match list management
│   │       │   ├── teammgr.ts    # Team roster management
│   │       │   ├── tabletmgr.ts  # Tablet assignment management
│   │       │   ├── picklistmgr.ts
│   │       │   ├── graphmgr.ts
│   │       │   ├── datasetmgr.ts
│   │       │   ├── playoffmgr.ts
│   │       │   └── datagen.ts    # Random/test data generator
│   │       ├── sync/             # Network synchronisation layer
│   │       │   ├── packetobj.ts  # Binary packet wrapper
│   │       │   ├── packettypes.ts # Packet type enum
│   │       │   ├── syncbase.ts
│   │       │   ├── syncclient.ts
│   │       │   ├── syncserver.ts
│   │       │   ├── syncpipe.ts
│   │       │   ├── syncclient.ts
│   │       │   ├── tcpclient.ts  # TCP client (scouts/coach connect to central)
│   │       │   ├── tcpserver.ts  # TCP server (central listens)
│   │       │   └── udpbroadcast.ts  # Central broadcasts its presence
│   │       ├── extnet/           # External network APIs
│   │       │   ├── ba.ts         # Blue Alliance API client
│   │       │   ├── badata.ts     # Blue Alliance data types
│   │       │   ├── statbotics.ts # Statbotics API client
│   │       │   └── netbase.ts
│   │       ├── model/            # Data model layer (wraps SQLite)
│   │       │   ├── datamodel.ts
│   │       │   ├── datarecord.ts
│   │       │   ├── matchmodel.ts
│   │       │   └── teammodel.ts
│   │       ├── ipchandlers.ts    # All IPC handler functions
│   │       ├── imagemgr.ts       # Icon / field image management
│   │       ├── logger.ts
│   │       ├── preload.ts        # Electron context-bridge
│   │       └── units/            # Unit tests
│   └── shared/                   # TypeScript shared between main & renderer
│       ├── ipc.ts                # All IPC interface types
│       ├── datavalue.ts
│       ├── expr.ts               # Expression parser/evaluator
│       ├── rulesengine.ts        # Form validation rules engine
│       ├── tabletdb.ts
│       ├── playoffs.ts
│       └── xerogeom.ts
│
└── renderer/                     # Renderer-process package (web)
    └── src/
        ├── apps/
        │   ├── xeroapp.ts        # Root renderer application, view router
        │   ├── hintmgr.ts        # In-app hint management
        │   ├── imagesrc.ts       # Image data cache
        │   └── resizebar.ts
        ├── views/                # UI views (one per feature)
        │   ├── forms/            # Form editor & form scouting views
        │   ├── picklist/         # Pick-list view
        │   ├── playoffs/         # Playoff bracket view
        │   ├── singleteam/       # Single-team analysis view
        │   ├── dataset/          # Data-set editor
        │   ├── formulas/         # Formula editor
        │   ├── editteams/        # Team roster editor
        │   ├── editmatches/      # Match list editor
        │   ├── selecttablet/     # Tablet-identity selection (scout)
        │   ├── syncipaddr/       # Manual IP address sync
        │   ├── dbview/           # Generic database table view
        │   ├── infoview.ts       # Event info view
        │   ├── teamstatus.ts     # Team scouting-status view
        │   ├── matchstatus.ts    # Match scouting-status view
        │   ├── teamdbview.ts     # Team database view
        │   └── matchdbview.ts    # Match database view
        ├── widgets/              # Reusable UI components
        ├── messages/             # Overlay message system
        ├── shared/               # Copied from main/src/shared at build time
        ├── utils/
        └── xeronav.ts            # Left-nav panel component
```

---

## 4. Architecture

### 4.1 Process Model

XeroScout 3 uses the standard Electron two-process model with **context isolation** enabled:

```
┌──────────────────────────────────────────────────┐
│  Electron Main Process (Node.js)                 │
│  ─────────────────────────────                   │
│  SCBase → SCCentral / SCScout / SCCoach           │
│  Project (Managers)                              │
│  IPC Handlers                                    │
│  Sync Layer (TCP/UDP)                            │
│  External APIs (Blue Alliance, Statbotics)       │
│                │   ↑                             │
│           ipcMain.on / win.webContents.send      │
│                ↓   │                             │
│  Preload Script (contextBridge exposes API)      │
└──────────────────────────────────────────────────┘
                │   ↑  contextBridge
┌──────────────────────────────────────────────────┐
│  Electron Renderer Process (Chromium)            │
│  ─────────────────────────────                   │
│  XeroApp (view router)                           │
│  Views (per feature)                             │
│  Widgets / Nav                                   │
└──────────────────────────────────────────────────┘
```

`nodeIntegration` is `false`; the renderer communicates exclusively through the context-bridge surface exposed in `preload.ts`.

### 4.2 Application Class Hierarchy

```
SCBase (abstract)
├── SCScout
└── SCCoachCentralBaseApp (abstract)
    ├── SCCentral
    └── SCCoach
```

`SCBase` provides:
- Winston logger setup
- Electron settings read/write
- Navigation data dispatch (`sendNavData`)
- View switching (`setView` → `update-main-window-view` IPC)
- Icon/image loading from `content/images/`
- `isDevelop` detection

`SCCoachCentralBaseApp` adds the shared behaviour for the two roles that display and analyse data (Coach and Central), including project loading, form viewing, and the sync protocol's receiving side.

### 4.3 Renderer Architecture

The renderer is a single TypeScript/webpack bundle (`xeroapp.bundle.js`). On page load, `XeroApp` is instantiated and:
1. Registers IPC callbacks via the preload context bridge.
2. Waits for `xero-app-init` from the main process to learn its `IPCAppType`.
3. Constructs the two-pane layout (nav pane + view pane) with a resizable splitter.
4. Registers all views in a `viewmap_` keyed by view name string, filtered by app type.
5. On `update-main-window-view` IPC event, instantiates the requested view class and mounts it.

---

## 5. Application Personalities

### 5.1 Central (`SCCentral`)

The **Central** station is the operator's command-and-control laptop. It is the authoritative source of all event data.

**Responsibilities:**
- Create or open an event project (stored as a directory with `event.json` + SQLite databases).
- Import event data from the Blue Alliance (teams, matches, OPR, rankings) or from CSV.
- Design and store scouting forms (JSON form definitions).
- Assign tablets to specific teams or matches.
- Run a **TCP sync server** (port 45455) — scouts and coaches connect to it.
- Run a **UDP broadcast** (port 45456) — advertises Central's IP address to the local network so tablets can discover it automatically.
- Receive scouting results from scouts and persist them to SQLite.
- Expose analysis views: team/match databases, formulas, datasets, graphs, pick lists, single-team summaries, playoff bracket.
- Export data to CSV.

**Navigation menu (when event loaded):**

| Section | Items |
|---------|-------|
| General | Help, About |
| Event Setup | Event Info, Assign Tablets, Datasets |
| Teams | Team Form, Team Status, Team Data |
| Match | Match Form, Match Status, Match Data |
| — | Playoffs |
| Analysis | Formulas, Pick List, Single Team View |

### 5.2 Scout (`SCScout`)

Each scouting tablet runs in **Scout** mode. It is a thin client that obtains its configuration from Central via sync.

**Responsibilities:**
- Self-identify: select a tablet name and scouting purpose (team or match) from the list provided by Central.
- Connect to Central (local loopback, fixed IP 192.168.1.1, WiFi mDNS, or manually entered IP address).
- Download the appropriate scouting form (team or match JSON) and the assignment list.
- Present a scouting form UI for each assigned team/match.
- Cache completed results locally.
- On re-sync, upload completed results and download any assignments or form updates.
- Optionally show playoff bracket.

**Navigation:** Dynamic list of teams or matches assigned to this tablet; tapping an entry opens the scouting form.

### 5.3 Coach (`SCCoach`)

The **Coach** tablet is used by the drive-team coach at the field.

**Responsibilities:**
- Connect to Central and sync a read-only copy of the event project (team/match DBs + forms).
- View team and match analysis: Team Status, Team Data, Match Status, Match Data, Single Team View, Pick List, Playoff Bracket.
- Provide coach-specific graph configurations and pick lists that are pushed back to Central during sync.
- Sync modes: local (127.0.0.1), cable (192.168.1.1), WiFi (mDNS), manual IP.

---

## 6. Project / Event Model

All persistent event state lives in a **project directory**. The structure is:

```
<project-dir>/
├── event.json          # Master project state (JSON, kept with up to 10 rolling backups)
├── team.db             # SQLite database — one row per team, columns from form fields + BA data
└── match.db            # SQLite database — one row per (match × team), columns from form fields
```

The project directory on Central lives under the user's choice path. On Coach tablets, project directories are automatically created under `~/.xeroscout/projects/<uuid>/`.

### 6.1 `event.json` Structure

The `ProjectInfo` object is serialised to `event.json`. It contains:

| Field | Type | Description |
|-------|------|-------------|
| `uuid_` | string | UUID uniquely identifying this event (used to verify sync partners) |
| `name_` | string | Event name (used when not a Blue Alliance event) |
| `locked_` | boolean | When true, event is locked for scouting — form and tablet assignments are frozen |
| `frcev_` | BAEvent | Blue Alliance event descriptor |
| `team_info_` | TeamData | Team roster |
| `match_info_` | MatchInfo | Match schedule |
| `form_info_` | FormInfo | Paths to team/match form JSON files |
| `data_info_` | DataInfo | Scouting result arrays, column configs |
| `tablet_info_` | TabletInfo | Tablet definitions and assignments |
| `formula_info_` | FormulaInfo | Named formula expressions |
| `dataset_info_` | DataSetInfo | Named data sets (match range filters) |
| `graph_info_` | GraphInfo | Chart configurations |
| `picklist_info_` | PickListData | Pick list configurations |
| `playoff_info_` | IPCPlayoffStatus | Alliance selections and match outcomes |
| `team_db_info_` / `match_db_info_` | DataModelInfo | SQLite schema metadata |
| `hidden_hints_` | string[] | IDs of dismissed in-app hints |

Backups: on every write, the project rotates up to 10 backup copies (`event-1.json` … `event-10.json`).

### 6.2 Manager Objects

`Project` owns a set of manager objects, each responsible for one domain:

| Manager | Responsibility |
|---------|---------------|
| `TeamManager` | Team list CRUD |
| `MatchManager` | Match schedule CRUD |
| `FormManager` | Load, validate, and serve form JSON |
| `DataManager` | SQLite team/match DB access, result ingestion |
| `DataSetManager` | Named match-set filters used by formulas/graphs |
| `FormulaManager` | Parse and evaluate named expressions |
| `TabletManager` | Tablet definition and assignment management |
| `GraphManager` | Chart configuration persistence |
| `PicklistMgr` | Pick list configuration and data computation |
| `PlayoffManager` | Playoff bracket state |

---

## 7. Scouting Form System

Forms are JSON files that conform to the `IPCForm` interface.

```
IPCForm
├── purpose: "team" | "match"
├── tablet: { name, size: { width, height } }
└── sections: IPCSection[]
         └── items: IPCFormItem[]
```

### 7.1 Control Types

| Type | Description |
|------|-------------|
| `label` | Static text label |
| `text` | Single-line text input |
| `textarea` | Multi-line text input |
| `boolean` | Checkbox / toggle |
| `updown` | Integer counter with +/− buttons, min/max bounds |
| `choice` | Radio-button group (horizontal or vertical), supports multi-select |
| `select` | Drop-down selector |
| `timer` | Countdown timer |
| `stopwatch` | Elapsed-time stopwatch (optional hold mode) |
| `box` | Decorative border/container box |
| `image` | Displays a field image; supports mirror-x/mirror-y |
| `autoplan` | Autonomous path planning widget over a field image |
| `autoselector` | Autonomous routine selector with field image |

Every item has absolute `x, y, width, height` coordinates (pixel-based layout), plus font styling and colour properties.

### 7.2 Form Editing (Central only)

The `XeroEditFormView` provides a WYSIWYG form editor. Controls can be placed, moved, resized, and styled. Key bindings and an undo/redo stack (`undo.ts`) are supported.

### 7.3 Form Scouting (Scout + Coach)

`XeroScoutFormView` renders the form using its absolute layout. The `RulesEngine` runs background validation rules over the form at a timed interval, emitting warnings for layout conflicts (overlapping items, items outside bounds, etc.).

---

## 8. Network Synchronisation

### 8.1 Packet Protocol

All sync communication uses a simple binary packet framing:

```
[4-byte length][1-byte type][payload bytes]
```

Packet types are defined in `PacketType` enum (`packettypes.ts`) and cover the full sync handshake vocabulary.

### 8.2 Scout ↔ Central Sync

```
Scout                          Central (TCP Server :45455)
  ──── HelloFromScouter ────►
  ◄─── ProvideTablets ─────
  ──── RequestMatchList ───►
  ◄─── ProvideMatchList ───
  ──── RequestTeamList ────►
  ◄─── ProvideTeamList ────
  ──── RequestTeamForm ────►
  ◄─── ProvideTeamForm ────
  ──── RequestMatchForm ───►
  ◄─── ProvideMatchForm ───
  ──── ProvideResults ─────►   (scout uploads collected data)
  ◄─── ReceivedResults ────
  ──── RequestImages ──────►
  ◄─── ProvideImages ──────
  ──── GoodbyeFromScouter ─►
```

Central uses the `UDPBroadcast` class to emit a discovery packet (`xeroscout3:<team>,<ip>`) every 5 seconds on UDP port 45456 so scouts can auto-discover Central on the LAN.

### 8.3 Coach ↔ Central Sync

```
Coach                          Central (TCP Server :45455)
  ──── HelloFromCoach ──────►
  ◄─── HelloFromCoach ─────   (Central echoes with event UUID)
  ──── ProvideCoachGraphs ─►   (Coach sends its graph configs)
  ◄─── ReceivedCoachGraphs
  ──── ProvideCoachPickLists►
  ◄─── ReceivedCoachPickLists
  ──── RequestProject ─────►
  ◄─── ProvideProject ─────
  ──── RequestTeamDB ──────►
  ◄─── ProvideTeamDB ──────   (raw SQLite file bytes)
  ──── RequestMatchDB ─────►
  ◄─── ProvideMatchDB ─────   (raw SQLite file bytes)
  ──── RequestTeamForm ────►
  ◄─── ProvideTeamForm ────
  ──── RequestMatchForm ───►
  ◄─── ProvideMatchForm ───
  ──── GoodbyeFromCoach ───►
```

### 8.4 Sync Discovery Modes

| Mode | Mechanism |
|------|-----------|
| Local (loopback) | Connects to `127.0.0.1:45455` |
| Cable | Connects to fixed IP `192.168.1.1:45455` |
| WiFi (mDNS) | Listens for UDP broadcast packets from Central |
| Manual IP | User enters IP address in the `sync-ipaddr` view |

---

## 9. Data Storage

### 9.1 SQLite Databases

Two separate SQLite files back the scouting data:

- **`team.db`** — one row per team; columns from the team scouting form fields plus Blue Alliance data (OPR, rankings, etc.)
- **`match.db`** — one row per (match × team) combination; columns from the match scouting form fields

Both databases are managed through the `DataModel` base class with subclasses `TeamDataModel` and `MatchDataModel`. Schema is built dynamically based on form fields; adding a new field to a form causes a new column to be added to the corresponding database.

Column metadata (`IPCColumnDesc`) tracks the source of each column:
- `form` — derived from a scouting form field
- `bluealliance` — imported from the Blue Alliance API
- `statbotics` — imported from the Statbotics API
- `base` — built-in system field

### 9.2 Column Display Configuration

Both database views support:
- Per-column visibility (hide/show)
- Per-column width
- Frozen (pinned) columns
- Conditional formatting via `IPCCheckDBViewFormula` rules (formula evaluates per-row; sets background/text colour/font)

---

## 10. Formula & Analysis System

### 10.1 Formula Language

The `FormulaManager` stores named formulas (`IPCFormula`), each containing an expression string. Formulas are evaluated using the `Expr` class (expression parser) against team or match data rows.

Two formula sets exist:
- **Central formulas** — owned by Central, shared across the analysis suite
- **Coach formulas** — authored by the coach; pushed to Central during sync

### 10.2 Data Sets

A **DataSet** (`IPCDataSet`) is a named match filter used to scope analysis. It specifies which matches to include:
- `all` — all matches
- `first N` — the first N matches
- `last N` — the most recent N matches
- `range [first, last]` — matches between two indices
- `specific` — one exact match by comp level / number / set

### 10.3 Graphs

`GraphManager` stores `IPCGraphConfig` objects. Each config defines:
- Chart type (line, bar, etc.)
- X-axis and dual Y-axis labels
- Teams to display
- Left and right data items, each referencing a field/formula and a dataset

### 10.4 Pick Lists

`PicklistMgr` stores `IPCPickListConfig` objects. Each pick list contains:
- An ordered list of teams
- A set of display columns (field or formula + dataset)
- Per-team notes
- Per-cell background colour overrides
- Column gradient colour scales (`minmax` or `box5`)

---

## 11. External Integrations

### 11.1 Blue Alliance (TBA)

The `BlueAlliance` class (`ba.ts`) fetches:
- Event list by year
- Team roster for an event
- Match schedule
- OPR / DPR / CCWM data
- Team rankings

TBA requires an API key. Connection status is shown in the status bar (`Blue Alliance connected` / `Connecting...`).

### 11.2 Statbotics

The `StatBotics` class provides EPA (Expected Points Added) statistics per team. These are incorporated as extra columns in the team database.

---

## 12. IPC Contract

All communication between the main process and renderer process uses Electron IPC (`ipcMain.on` / `win.webContents.send`). The complete surface is defined in `main/src/shared/ipc.ts` and wired in `main.ts` and `ipchandlers.ts`.

### Selected IPC Events (Renderer → Main)

| Event | Purpose |
|-------|---------|
| `get-nav-data` | Request navigation tree data |
| `execute-command` | Execute a named command (e.g. open event, assign tablets) |
| `get-info-data` | Get event info for the info view |
| `get-team-db` / `get-match-db` | Fetch full database data |
| `update-team-db` / `update-match-db` | Commit a cell change |
| `get-form` | Fetch a form definition |
| `save-form` | Persist a modified form |
| `get-team-status` / `get-match-status` | Get scouting completion status |
| `provide-result` | Scout submits a completed form result |
| `get-formulas` / `update-formula` / `delete-formula` | Formula CRUD |
| `get-datasets` / `update-datasets` | Dataset CRUD |
| `get-picklist-configs` / `save-picklist-config` / `get-picklist-data` | Picklist management |
| `get-chart-data` | Fetch rendered chart data |
| `get-single-team-configs` / `update-single-team-configs` | Single-team view config |
| `get-playoff-status` / `set-alliance-teams` / `set-playoff-match-outcome` | Playoff management |
| `sync-ipaddr` | Initiate sync to a manually entered IP |
| `splitter-changed` | Persist the nav/view splitter position |

### Selected IPC Events (Main → Renderer)

| Event | Purpose |
|-------|---------|
| `xero-app-init` | Bootstrap renderer with app type + splitter position |
| `update-main-window-view` | Switch to a named view |
| `send-nav-data` | Deliver navigation tree |
| `send-info-data` | Deliver event info |
| `send-app-status` | Update status bar (left / middle / right) |
| `send-team-db` / `send-match-db` | Deliver database records |
| `send-form` | Deliver a form JSON |
| `send-hint-db` | Deliver hint records |
| `send-images` / `send-image-data` | Deliver image metadata / base64 data |
| `prompt-string-request` | Ask renderer to show a string input dialog |
| `set-status-visible` / `set-status-text` | Show/hide/set a status overlay |

---

## 13. Renderer View Registry

`XeroApp.registerViews()` maps view name strings to view classes. Each view is restricted to specific app types:

| View Name | Class | Available In |
|-----------|-------|-------------|
| `text` | `XeroTextView` | All |
| `info` | `XeroInfoView` | Central, Coach |
| `select-event` | `XeroSelectEvent` | Central |
| `assign-tablets` | `XeroAssignTablets` | Central |
| `form-edit` | `XeroEditFormView` | Central |
| `form-scout` | `XeroScoutFormView` | Central, Scout, Coach |
| `team-status` | `XeroTeamStatus` | Central, Coach |
| `team-db` | `XeroTeamDatabaseView` | Central, Coach |
| `match-status` | `XeroMatchStatus` | Central, Coach |
| `match-db` | `XeroMatchDatabaseView` | Central, Coach |
| `select-tablet` | `XeroSelectTablet` | Scout |
| `sync-ipaddr` | `XeroSyncIPAddrView` | Scout, Coach |
| `formulas` | `XeroFormulasView` | Central, Coach |
| `playoffs` | `XeroPlayoffsView` | All |
| `datasets` | `DataSetEditor` | Central |
| `edit-teams` | `EditTeamsView` | Central |
| `edit-matches` | `EditMatchesView` | Central |
| `singleteam` | `SingleTeamView` | Central, Coach |
| `picklist` | `PickListView` | Central, Coach |

---

## 14. Build System

The project uses two separate npm workspaces:

**Renderer** (`renderer/`):
1. `tsc` — transpile TypeScript to JavaScript in `dist/`
2. `webpack` — bundle `dist/` into a single `dist/renderer/xeroapp.bundle.js`

**Main** (`main/`):
1. Build renderer (step above)
2. Copy `xeroapp.bundle.js` into `main/dist/renderer/`
3. Copy shared TypeScript files from `renderer/src/shared/` into `main/src/shared/`
4. `tsc` — compile main-process TypeScript

**Packaging** (via Electron Forge):
- Windows: `electron-forge make` → Squirrel installer or Inno Setup script (`installer/`)
- macOS: `electron-forge make` → `.app` bundle
- Linux: `electron-forge make` → `.deb` package

---

## 15. Settings & Persistence

Application settings (window bounds, splitter positions, last opened event, etc.) are stored using `electron-settings`, which writes to the OS user data directory. Settings keys are namespaced by app type (e.g. `central_splitter`, `coach-last-event-loaded`).

---

## 16. Logging

Winston is used for structured JSON logging. Log files are written to `~/.xeroscout/logs/`. In development mode (detected by `XERODEVELOP` env var or executable path containing `cygwin64/butch`), a single file per session is reused and the log level is `silly`; in production, a unique timestamped file is created per run at `info` level. Renderer log messages are forwarded to the main-process logger via the `logClientMessage` IPC handler.

---

## 17. Key Design Decisions

1. **Three-in-one executable** — a single Electron application serves all three roles, reducing distribution and update complexity. The role is selected via a command-line argument.

2. **Shared TypeScript types** — the `shared/` directory is copied from `renderer/src/shared/` into `main/src/shared/` at build time, ensuring the IPC contract types are always in sync without a separate package.

3. **Absolute-positioned form layout** — forms use pixel-exact coordinates, making them device-size agnostic once the target tablet size is known, and simplifying the WYSIWYG editor.

4. **SQLite file transfer for Coach sync** — rather than a record-by-record sync protocol, the Coach sync transfers the raw SQLite binary files. This is simpler and ensures exact fidelity, at the cost of full-file transfer.

5. **Rolling backups on every project write** — `event.json` is written with up to 10 rolling backups, providing a simple recovery mechanism without a formal versioned database.

6. **Context isolation** — Electron `contextIsolation: true` with `nodeIntegration: false` follows Electron security best practices; all privileged APIs are exposed through the context bridge in `preload.ts`.
