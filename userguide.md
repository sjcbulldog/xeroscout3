# XeroScout 3 — User's Guide

**Version 3.0**  
**Application:** FRC (FIRST Robotics Competition) Scouting System

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Network Setup](#3-network-setup)
4. [Central Station — Setup](#4-central-station--setup)
   - 4.1 [Launching Central](#41-launching-central)
   - 4.2 [Creating a New Event](#42-creating-a-new-event)
   - 4.3 [Opening an Existing Event](#43-opening-an-existing-event)
   - 4.4 [The Event Info View](#44-the-event-info-view)
   - 4.5 [Loading Data from the Blue Alliance](#45-loading-data-from-the-blue-alliance)
   - 4.6 [Manually Entering Teams and Matches](#46-manually-entering-teams-and-matches)
   - 4.7 [Creating and Selecting Scouting Forms](#47-creating-and-selecting-scouting-forms)
   - 4.8 [Assigning Tablets](#48-assigning-tablets)
   - 4.9 [Locking the Event](#49-locking-the-event)
   - 4.10 [Importing Images](#410-importing-images)
5. [Central Station — During the Event](#5-central-station--during-the-event)
   - 5.1 [Syncing with Scout Tablets](#51-syncing-with-scout-tablets)
   - 5.2 [Team Status View](#52-team-status-view)
   - 5.3 [Match Status View](#53-match-status-view)
   - 5.4 [Team Data View](#54-team-data-view)
   - 5.5 [Match Data View](#55-match-data-view)
   - 5.6 [Importing Blue Alliance Match Results](#56-importing-blue-alliance-match-results)
   - 5.7 [Exporting Data](#57-exporting-data)
6. [Central Station — Analysis Tools](#6-central-station--analysis-tools)
   - 6.1 [Formulas](#61-formulas)
   - 6.2 [Data Sets](#62-data-sets)
   - 6.3 [Single Team View (Charts)](#63-single-team-view-charts)
   - 6.4 [Pick Lists](#64-pick-lists)
   - 6.5 [Playoffs View](#65-playoffs-view)
7. [Form Editor](#7-form-editor)
   - 7.1 [Opening the Form Editor](#71-opening-the-form-editor)
   - 7.2 [Form Layout Basics](#72-form-layout-basics)
   - 7.3 [Adding and Editing Controls](#73-adding-and-editing-controls)
   - 7.4 [Control Types Reference](#74-control-types-reference)
   - 7.5 [Sections and Tabs](#75-sections-and-tabs)
   - 7.6 [Selecting, Moving, and Resizing](#76-selecting-moving-and-resizing)
   - 7.7 [Form Editor Keyboard Shortcuts](#77-form-editor-keyboard-shortcuts)
   - 7.8 [Saving the Form](#78-saving-the-form)
8. [Scout Tablet](#8-scout-tablet)
   - 8.1 [Launching Scout Mode](#81-launching-scout-mode)
   - 8.2 [Connecting to Central (Sync)](#82-connecting-to-central-sync)
   - 8.3 [Selecting Your Tablet Identity](#83-selecting-your-tablet-identity)
   - 8.4 [Scouting a Match or Team](#84-scouting-a-match-or-team)
   - 8.5 [Submitting Results](#85-submitting-results)
   - 8.6 [Uploading Results to Central](#86-uploading-results-to-central)
   - 8.7 [Playoff Scouting](#87-playoff-scouting)
9. [Coach Tablet](#9-coach-tablet)
   - 9.1 [Launching Coach Mode](#91-launching-coach-mode)
   - 9.2 [Syncing with Central](#92-syncing-with-central)
   - 9.3 [Analysis Views Available to the Coach](#93-analysis-views-available-to-the-coach)
   - 9.4 [Coach-Owned Pick Lists and Graphs](#94-coach-owned-pick-lists-and-graphs)
10. [Formulas Reference](#10-formulas-reference)
11. [Data Sets Reference](#11-data-sets-reference)
12. [Pick List Reference](#12-pick-list-reference)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Introduction

XeroScout 3 is an FRC scouting application that runs across a small fleet of laptops and tablets during a competition event. It is designed to:

- Collect **match scouting** data (one robot per tablet per match) and **team scouting** data (pit scouting) from multiple scout tablets simultaneously.
- Aggregate and analyse data at a **Central** operator station.
- Give the drive-team **Coach** fast access to charts, rankings, and pick lists at the field.

All three roles run from the **same executable** — the role is determined when the program is launched.

---

## 2. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│  CENTRAL (laptop / PC)                                      │
│  • Manages the event                                        │
│  • Hosts a TCP sync server (port 45455)                     │
│  • Broadcasts its IP via UDP (port 45456) every 5 seconds   │
└──────────────┬───────────────────────┬──────────────────────┘
               │  TCP sync             │  TCP sync
    ┌──────────▼──────────┐   ┌───────▼──────────┐
    │  SCOUT TABLET(s)    │   │  COACH TABLET    │
    │  • Collects data    │   │  • Views data    │
    │  • Uploads results  │   │  • Owns pick     │
    │                     │   │    lists/graphs  │
    └─────────────────────┘   └──────────────────┘
```

**Typical event workflow:**

1. Before the event, the Central operator creates an event project, loads the team list and match schedule from The Blue Alliance, designs scouting forms, and assigns tablets.
2. At the event, each scout syncs their tablet to Central and then scouts assigned matches or teams.
3. At regular intervals during the day, scouts re-sync to upload their data.
4. The coach syncs to receive a copy of all collected data and uses the analysis tools.
5. During alliance selection, the pick list view guides the coach.

---

## 3. Network Setup

XeroScout 3 supports several connection methods between tablets and Central:

| Method | When to use | How it works |
|--------|-------------|--------------|
| **Local (loopback)** | Running Central and Scout on the same machine (testing/development) | Connects to `127.0.0.1:45455` |
| **Cable** | Connecting via a direct Ethernet cable or a dedicated router | Connects to `192.168.1.1:45455` |
| **WiFi (auto-discover)** | On a shared WiFi network | Central broadcasts its IP on UDP 45456; tablets listen and connect automatically |
| **Manual IP** | Any network, when auto-discover is not working | User enters Central's IP address on the tablet |

> **Tip:** The Central status bar (bottom-left of the screen) displays the IP address Central is broadcasting, e.g. `Xero Central 3.0.26 (192.168.1.22)`. Use this IP for manual connections.

---

## 4. Central Station — Setup

### 4.1 Launching Central

Launch the application without any arguments (or with the `central` argument):

```
xeroscout3.exe central
```

On first launch (or when no recent event exists), the right pane shows **No Event Loaded**. The navigation panel on the left is empty.

Central automatically tries to connect to **The Blue Alliance** API on startup. The connection status appears in the bottom-right of the status bar:
- `Blue Alliance connected` — API is available; online features are enabled.
- `Blue Alliance not available — trying again` — no internet connection or API key issue; Central will retry every 5 seconds.

### 4.2 Creating a New Event

Go to **File → Create Event…**

A dialog asks you to choose a directory in which to store the event data. All event files (JSON configuration, SQLite databases) will live inside that directory.

After creation:
- The **Event Info** view opens automatically.
- The navigation panel shows the full menu of available views.
- The event is **unlocked** at this point — you can still edit forms and tablet assignments.

> **A note on event directories:** Every event is stored as a folder. The folder should be dedicated to that event. Do **not** store multiple events in the same folder.

### 4.3 Opening an Existing Event

**File → Open Event…** opens a folder picker. Navigate to the event directory and select it.

**File → Recent** lists previously opened events for one-click access.

> You can also launch Central with the path to an event directory as an argument:
> ```
> xeroscout3.exe central "C:\Scouting\2025_StormSurge"
> ```

### 4.4 The Event Info View

After loading an event, the **Event Info** view displays a table of key properties:

| Property | Description |
|----------|-------------|
| Location | File system path to the event directory |
| Name | Event name (from Blue Alliance or entered manually) |
| UUID | Unique event identifier (used to verify tablet connections) |
| Blue Alliance Key | The BA event key (e.g. `2025wass`) |
| Team Form | Filename of the currently loaded team scouting form |
| Match Form | Filename of the currently loaded match scouting form |
| Locked | Whether the event is locked for scouting |
| # Teams | Number of teams loaded |
| # Matches | Number of matches loaded |

### 4.5 Loading Data from the Blue Alliance

Once Blue Alliance is connected, use the **Data** menu:

1. **Data → Import Data From Blue Alliance (select event):**  
   Opens a searchable table of all events for the current year. Type any part of the event name in the search box to filter the list. Click a row to select the event, then confirm. XeroScout downloads teams, matches, OPR/DPR/CCWM, and team rankings.

2. **Data → Import Data From Blue Alliance** (after event is selected):  
   Re-downloads match results and rankings from BA into the existing event. Use this after each round of qualification matches to refresh ranking data.

3. **Data → Import Data From Statbotics:**  
   Downloads EPA (Expected Points Added) statistics per team from Statbotics.

A progress panel appears while data is loading. You can close it with the **Close** button when the download finishes.

> **Important:** You cannot download data while scout tablets are syncing. Wait for all syncs to complete before importing.

### 4.6 Manually Entering Teams and Matches

If the Blue Alliance is not available or you are running a practice/off-season event:

- **Data → Edit Teams** — opens a table where you can add, edit, or remove team numbers and nicknames.
- **Data → Edit Matches** — opens a table where you can add matches manually (comp level, match number, set number, red/blue alliance team numbers).

You can also import teams and matches from CSV files via **Data → Import Teams** and **Data → Import Matches**.

### 4.7 Creating and Selecting Scouting Forms

Each event uses two forms: one for **team scouting** (pit scouting) and one for **match scouting**.

**To create a new form:**
- Go to **File → Create Team Form** or **File → Create Match Form**.
- This opens the **Form Editor** (see [Section 7](#7-form-editor)).

**To select an existing form file:**
- Go to **File → Select Team Form** or **File → Select Match Form**.
- Pick a previously designed JSON form file.

**To view the current form:**
- Click **Team Form** or **Match Form** in the left navigation panel under the *Teams* or *Match* section. This displays the form in read-only preview mode.

> Forms are stored as JSON files. You can share form files between events and years.

### 4.8 Assigning Tablets

Before scouts can sync, you must define the tablets and assign them to either team or match scouting.

Click **Assign Tablets** in the left navigation panel (under the *General* section, only visible before locking).

The **Assign Tablets** view shows three columns:

| Column | Description |
|--------|-------------|
| Available | List of all defined tablets (not yet assigned to a purpose) |
| Match Tablets | Tablets assigned to match scouting |
| Team Tablets | Tablets assigned to team scouting |

**To add a tablet:** Click **Add Tablet**. A new tablet named "Tablet N" appears in the *Available* column. Click its name to rename it.

**To assign a tablet purpose:** Drag the tablet card from *Available* into either *Match Tablets* or *Team Tablets*.

**To remove a tablet:** Drag it back to *Available* or select it and press Delete.

**Tablet-to-team/match assignment** happens automatically when the event is locked:
- Each **match tablet** is assigned to scout a specific robot in specific matches (one per alliance position per match).
- Each **team tablet** is assigned to visit specific teams in the pits.

> **Tip:** For a standard 6-robot match, you need 6 match tablets (one per alliance position). Add more for redundancy.

### 4.9 Locking the Event

Once you have loaded teams, matches, and forms, and have defined all tablets, you must **lock the event** before scouts can sync.

Go to **File → Lock Event**.

Locking:
- Generates the per-tablet match and team assignments.
- Starts the **TCP sync server** on port 45455.
- Starts the **UDP discovery broadcast** on port 45456.

> **After locking**, scouts can connect. **The forms and tablet assignments are frozen** — you cannot change them without unlocking first. Data (team/match scouting results) can still be received and analysed at any time after locking.

### 4.10 Importing Images

You can import custom PNG images (e.g. field layout images, photos) for use in form controls.

Go to **Images → Import…** and select one or more PNG files. Imported images become available in the form editor under the *Image*, *Auto Planner*, and *Auto Selector* controls.

---

## 5. Central Station — During the Event

### 5.1 Syncing with Scout Tablets

Once the event is locked, Central listens for incoming tablet connections. Syncing is **tablet-initiated** — the scout taps Sync on their tablet and Central responds automatically.

During a sync, Central:
1. Sends the tablet's assignment list (teams or matches).
2. Sends the appropriate scouting form.
3. Receives any completed scouting results from the tablet.
4. Sends any field images the tablet needs.

Multiple tablets can sync simultaneously. Central displays sync progress in the status overlay.

> **Important:** Do not import Blue Alliance data while tablets are actively syncing.

### 5.2 Team Status View

Click **Team Status** in the left navigation panel (under *Teams*).

Displays a table with one row per team:

| Column | Description |
|--------|-------------|
| Number | Team number |
| Name | Team nickname |
| Tablet | Which tablet is assigned to scout this team |
| Status | Green "Scouted" if data has been received; blank otherwise |

Use this view to quickly see which teams have been pit-scouted and which are outstanding.

### 5.3 Match Status View

Click **Match Status** (under *Match*).

Displays a table with one row per (match × robot) combination:

| Column | Description |
|--------|-------------|
| Match | Competition level and match number |
| Team | Team number |
| Tablet | Assigned tablet |
| Status | Green "Scouted" if data has been received |

Use this to track which match assignments are complete before each round.

### 5.4 Team Data View

Click **Team Data** (under *Teams*).

Displays the full **team scouting database** as a spreadsheet-style table. Each row is a team; columns include:
- Base columns (team number, nickname)
- Blue Alliance-sourced columns (OPR, DPR, CCWM, rankings)
- Statbotics columns (EPA)
- Columns from your team scouting form fields

**Column visibility:** Right-click a column header to show or hide individual columns.

**Editing:** Some columns (those sourced from your form) are directly editable — click a cell and type to correct a value.

**Conditional formatting:** Cells can be highlighted with custom background/text colours based on formula rules. See [Section 6.1 Formulas](#61-formulas).

**Column width:** Drag column borders to resize. Column widths are saved between sessions.

### 5.5 Match Data View

Click **Match Data** (under *Match*).

Displays the **match scouting database**. Each row represents one robot's performance in one match. Columns include:
- Base columns (comp level, match number, set number, team key, alliance)
- Form field columns

All the same column management features apply as in the Team Data view (visibility, resizing, conditional formatting, editing).

### 5.6 Importing Blue Alliance Match Results

After qualification rounds are posted on The Blue Alliance, use **Data → Import Data From Blue Alliance** to refresh match results, scores, and updated rankings into the team database.

### 5.7 Exporting Data

- **Data → Export Team Data** — exports the team database to a CSV file.
- **Data → Export Match Data** — exports the match database to a CSV file.
- **Data → Export Formulas** — saves all formula definitions to a JSON file for reuse at future events.
- **Data → Import Formulas** — loads a previously exported formula JSON file into the current event.

---

## 6. Central Station — Analysis Tools

### 6.1 Formulas

Click **Formulas** in the left navigation panel (under *Analysis*).

Formulas are named mathematical or logical expressions that compute a value from team or match data columns. They can be used anywhere a data field is accepted: pick list columns, chart axes, and database conditional formatting.

**The Formulas table shows:**
- **Name** — unique identifier for the formula (used to reference it elsewhere)
- **Formula** — the expression text
- **Description** — optional human-readable explanation

**To add a formula:** Double-click the blank row at the bottom of the table. A dialog opens:
- Enter a name (must be unique).
- Enter the expression (see [Section 10 Formulas Reference](#10-formulas-reference)).
- Enter an optional description.
- Click OK.

**To edit a formula:** Double-click any cell in the formula's row.

**To delete a formula:** Click the delete icon (trash/×) in the leftmost column.

**Importing and exporting formulas:**  
Use **Data → Export Formulas** and **Data → Import Formulas** to save and reuse formula libraries across events. When importing, the duplicate policy can be set to keep existing or overwrite.

#### Conditional Formatting (Database Highlight Rules)

In the Team Data or Match Data views, you can set up rules to colour-highlight cells when a formula evaluates to true.

Right-click a column header and choose **Format Rules** (exact UI label may vary). Each rule specifies:
- Columns to apply to
- A boolean formula
- Background colour, text colour, font settings
- An optional message

### 6.2 Data Sets

Click **Datasets** in the left navigation panel (under *Event Setup*, Central only).

A **Data Set** defines which matches to include when aggregating data for a team. Data sets are used by formulas, charts, and pick list columns to filter the match data.

**Data Set types:**

| Kind | Description |
|------|-------------|
| All | All matches a team has played |
| First N | Only the first N matches |
| Last N | Only the most recent N matches |
| Range | Matches between two indices (inclusive) |
| Specific | A single exact match |

You can optionally add a **formula filter** to a data set (e.g. only include matches where the team scored more than 10 points).

**To add a data set:** Click **+ New Data Set** (or the sentinel row). A dialog opens to configure it.

**To edit or delete:** Click the edit/delete icon on any existing data set row.

See also [Section 11 Data Sets Reference](#11-data-sets-reference).

### 6.3 Single Team View (Charts)

Click **Single Team View** in the left navigation panel (under *Analysis*).

This view shows **Chart.js-rendered bar or line charts** comparing teams side by side. It is the primary visual analysis tool.

**Layout:**
- **Left panel** — list of saved chart configurations, plus a team selector and match selector.
- **Right panel** — the chart itself.

**Using charts:**
1. Select a chart configuration from the left panel list.
2. Check the team(s) you want to compare from the team list.
3. Optionally select a specific match from the match dropdown to scope the data.
4. The chart updates automatically.

**Creating a chart configuration:**
1. Click **+ New Config** (or double-click an empty area in the config list).
2. In the configuration dialog:
   - Enter a **name** and **title**.
   - Choose a **chart type** (bar, line, etc.).
   - Set X-axis and Y-axis labels.
   - Add **data items** for the left Y axis (and optionally the right Y axis). Each data item references a field name or formula and a data set.
3. Save the configuration.

**Grouping mode:** Toggle between *Teams within items* (each cluster of bars = one data item, colours = teams) and *Items within teams* (each cluster = one team, colours = data items).

### 6.4 Pick Lists

Click **Picklist** in the left navigation panel (under *Analysis*).

The **Pick List** view is used during alliance selection to rank and compare teams.

**Layout:**
- **Left panel** — list of saved pick list configurations.
- **Right panel** — the pick list table itself.

**The pick list table shows:**
| Column | Description |
|--------|-------------|
| Position | Current ranking position (1 = highest priority) |
| Team | Team number |
| Nickname | Team nickname |
| Notes | Editable per-team notes |
| Data columns | One column per configured data item |

**Reordering teams:** Drag rows up or down to change ranking order.

**Editing notes:** Click a notes cell and type.

**Cell colours:** Right-click a data cell to assign a custom background colour (colour picker with preset options). This is useful to mark teams for specific reasons.

**Column gradients:** Right-click a column header to apply a gradient colour scale across all teams in that column:
- *Min/Max* — linearly scales from the minimum to the maximum value.
- *Box5* — divides teams into 5 equal-sized percentile buckets.

**Creating a pick list configuration:**
1. Click **+ New Picklist** (or the add button in the config list).
2. In the configuration dialog:
   - Enter a name.
   - Add data columns — each references a field/formula and a data set.
   - Set initial team order (defaults to all teams in number order).
3. Save.

See also [Section 12 Pick List Reference](#12-pick-list-reference).

### 6.5 Playoffs View

Click **Playoffs** in the left navigation panel.

This view shows the **8-alliance playoff bracket** on a canvas. It is used to:
- Set which teams are on each alliance (Captain, 1st Pick, 2nd Pick).
- Record match outcomes.
- Track which alliances advance.

**Setting alliance teams:**
Right-click an alliance slot and choose **Set Alliance…** A dialog lets you enter the three team numbers for that alliance.

**Recording match outcomes:**
Right-click a match marker in the bracket and choose the winning alliance. The bracket updates to advance that alliance.

This same view appears on scout tablets (read-only) and on the coach tablet (editable).

---

## 7. Form Editor

The form editor is available in **Central** only. It is a WYSIWYG (What You See Is What You Get) pixel-exact layout editor for designing scouting forms.

### 7.1 Opening the Form Editor

- **File → Create Team Form** — creates a new blank team scouting form.
- **File → Create Match Form** — creates a new blank match scouting form.
- **File → Edit Team Form** — opens the current team form for editing.
- **File → Edit Match Form** — opens the current match form for editing.

### 7.2 Form Layout Basics

The form editor displays the form as it will appear on the tablet. Controls are placed at exact pixel positions.

**Sections (pages/tabs):** A form is divided into sections. Each section appears as a tab. Scouts swipe or tap through tabs during scouting. You can add as many sections as needed (e.g. Autonomous, Teleop, Endgame).

**Target tablet size:** At the top of the editor, a dropdown lets you select the target tablet model (which sets the form canvas dimensions). You can also enter custom dimensions.

### 7.3 Adding and Editing Controls

**Right-click** anywhere on the form canvas to open the context menu. Select the type of control you want to add from the *Add Control* submenu. The control is placed at the mouse position.

**To edit a control's properties:** Double-click the control. A property dialog opens with fields specific to the control type (tag name, label text, min/max values, choices, etc.).

**The `tag` field** is critical — it is the column name used in the scouting database. Tags must be unique within a form. Choose descriptive names like `auto_speaker`, `teleop_amp_scored`, `end_climb`.

### 7.4 Control Types Reference

| Control | Description | Key Properties |
|---------|-------------|----------------|
| **Label** | Static text for instructions or headings | Text content, font, colour |
| **Box** | A decorative rectangle for visual grouping | Border style, width, radius, shadow |
| **Image** | Displays a field diagram or photo | Image name, mirror X/Y |
| **Text Field** | Single-line text input | Tag, placeholder text |
| **Text Area** | Multi-line text input | Tag, rows, columns |
| **Up/Down Field** | Integer counter with + and − buttons | Tag, min value, max value, orientation |
| **Boolean Field** | Checkbox or toggle | Tag, accent colour |
| **Multiple Choice** | Radio button group (single or multi-select) | Tag, list of choices (text + value), orientation |
| **Select** | Drop-down selector | Tag, list of choices |
| **Timer** | Counts down from a preset time | Tag |
| **Stopwatch** | Counts up; optional "hold" mode for tracking duration of an activity | Tag, hold mode |
| **Auto Planner** | Interactive path-planning widget over a field image | Tag, field image, approved actions list, allow multiple autos |
| **Auto Selector** | Displays a set of autonomous routine options on a field image | Tag, field image |

### 7.5 Sections and Tabs

**To add a section:** Right-click the tab bar and choose **Add Section**.

**To rename a section:** Double-click the section tab. Enter the new name.

**To reorder sections:** Right-click the tab bar and use the Move Left / Move Right options, or use the keyboard shortcuts (see below).

**To delete a section:** Right-click the tab and choose **Delete Section**. All controls in that section are also deleted.

### 7.6 Selecting, Moving, and Resizing

**Click** a control to select it. A selection border with resize handles appears.

**Ctrl+Click** or **drag a selection rectangle** to select multiple controls simultaneously.

**Tab key** — when multiple controls overlap at the same spot, pressing Tab cycles through them to select the one underneath.

**Drag** a selected control to move it. Drag a **corner or edge handle** to resize it.

**Arrow keys** move the selected control(s):
- Arrow key alone: 1 pixel at a time
- Shift + Arrow: 10 pixels at a time
- Ctrl + Arrow: 50 pixels at a time
- Ctrl + Shift + Arrow: 250 pixels at a time

**Alignment:** Right-click a selection of multiple controls and choose **Align** → Left, Right, Top, Bottom, Center Horizontal, or Center Vertical.

**Sizing:** Right-click a selection and choose **Size** → Make Same Width, Same Height, or Same Size.

**Cut / Copy / Paste:** Standard Ctrl+X, Ctrl+C, Ctrl+V. Pasted controls appear offset from the originals.

**Undo / Redo:** Ctrl+Z to undo the last action. Redo is not currently bound to a keyboard shortcut — use the edit context menu if available.

**Lock a control:** Right-click and choose **Lock**. A locked control cannot be moved or resized accidentally. Unlock by right-clicking and choosing **Unlock**.

### 7.7 Form Editor Keyboard Shortcuts

Press **F1** in the form editor to display the full list of current keyboard shortcuts.

Common shortcuts include:

| Key | Action |
|-----|--------|
| Arrow keys | Move selected control(s) by 1px |
| Shift + Arrow | Move 10px |
| Ctrl + Arrow | Move 50px |
| Ctrl+Shift + Arrow | Move 250px |
| Tab | Cycle selection at cursor position |
| Ctrl+A | Select all controls on current section |
| Delete | Delete selected control(s) |
| Ctrl+Z | Undo |
| Ctrl+X / C / V | Cut / Copy / Paste |
| F1 | Show keybindings dialog |

### 7.8 Saving the Form

The form is saved automatically when you navigate away from the form editor. You can also explicitly save by pressing **Ctrl+S** (if bound) or by choosing **Save** from the right-click context menu.

The saved form JSON file is stored in the event directory and is referenced by name from `event.json`.

---

## 8. Scout Tablet

### 8.1 Launching Scout Mode

```
xeroscout3.exe scout
```

On first launch the scout sees a simple screen asking them to sync to Central to receive their assignments.

### 8.2 Connecting to Central (Sync)

Use the **File** menu on the scout:

| Menu Item | Connects to |
|-----------|------------|
| Sync Event Local (127.0.0.1) | Central on the same machine |
| Sync Event Cable (192.168.1.1) | Central via Ethernet/cable router |
| Sync Event WiFi (mDNS) | Central auto-discovered via UDP broadcast |
| Sync Event IP Address (Manual) | Central at a manually-entered IP address |

**For Manual IP:** Choosing this option opens the **Sync IP Address** view where you enter the Central's IP address (shown in the Central status bar). Press **Connect**.

During sync, the tablet:
1. Identifies itself to Central.
2. Downloads its tablet name and assigned purpose.
3. Downloads the appropriate scouting form.
4. Downloads its list of assigned teams or matches.
5. Uploads any completed results that have not yet been sent.
6. Downloads any field images needed.

A progress indicator is shown during sync. When sync finishes, the navigation panel on the left populates with the list of assignments.

### 8.3 Selecting Your Tablet Identity

On the **first sync**, Central sends a list of all defined tablets. A dialog appears for the scout to select which tablet they are using. Choose your tablet name from the list and click **OK**.

This selection is stored locally and remembered for future syncs with the same event.

> **Note:** If the tablet identity is wrong (e.g. two scouts accidentally picked the same tablet), the Central operator can correct assignments from the Assign Tablets view.

### 8.4 Scouting a Match or Team

After syncing, the left navigation panel lists your assigned items:
- **Match scouting:** Each entry shows the comp level, match number, set number, and team number (e.g. `QM-12 - 1-1425`).
- **Team scouting:** Each entry shows the team number.

Click an entry to open the scouting form for that match or team.

The form is displayed with the appropriate sections as tabs. Navigate between sections by clicking the tab labels.

**During match scouting:**
- **Stopwatch controls** start and stop by pressing the stopwatch button. Use these to time specific activities (e.g. time a robot spent at the source).
- **Timer controls** count down; tap to start/stop.
- **Up/Down fields** use the + and − buttons to count events (e.g. number of game pieces scored).
- **Boolean fields** (checkboxes) tap to toggle.
- **Multiple choice / Select** tap the desired option.
- **Auto Planner** (if present) lets you trace the robot's autonomous path over the field image.

**Alliance colour and field orientation:**
- On Central, the **Options** menu lets you choose red or blue alliance view and whether to mirror the field image. This setting affects how field images are displayed in forms.
- On scout tablets, the alliance colour and field orientation are set automatically based on the tablet's assignment.

### 8.5 Submitting Results

When you have completed data entry for a match or team, click the **Submit** button (or the checkmark button at the bottom of the form).

A **Confirmation dialog** appears showing a summary of the entered data. Review the values and:
- Click **Confirm** to accept and save the result.
- Click **Cancel** to return to the form and make corrections.

After confirmation, the result is saved locally on the tablet. The nav panel item for that assignment updates to show it is complete.

> **You can re-open and re-edit** a submitted result before uploading it to Central — simply click the entry again in the nav panel. The form re-opens with the previously entered values.

### 8.6 Uploading Results to Central

Results accumulate on the tablet until you sync again. To upload:

Use **File → Sync** (any available sync method). During sync, all completed results are automatically sent to Central.

Central stores the results in the SQLite database immediately. You can sync as frequently as needed — XeroScout handles deduplication.

### 8.7 Playoff Scouting

Once the alliance selection is complete and Central has configured the playoff bracket, scout tablets in **match scouting** mode will show a **View Playoffs** entry at the top of their nav panel (provided all 8 alliances have been configured).

Click **View Playoffs** to see the bracket. During playoffs, the tablet's assignments update to reflect the playoff match/alliance the tablet has been assigned to.

---

## 9. Coach Tablet

### 9.1 Launching Coach Mode

```
xeroscout3.exe coach
```

The coach tablet starts with an empty screen. It loads the last-used event automatically on subsequent launches.

### 9.2 Syncing with Central

Use the **File** menu:

| Menu Item | Description |
|-----------|-------------|
| Sync Event Local (127.0.0.1) | Same machine as Central |
| Sync Event Cable (192.168.1.1) | Via Ethernet/cable |
| Sync Event WiFi (mDNS) | Auto-discover via UDP |
| Sync Event IP Address (Manual) | Enter IP manually |

**Coach sync is a full read-only copy** of the event. During sync:
1. The coach sends any coach-owned graphs and pick lists to Central (so they are preserved).
2. Central sends the full project configuration.
3. Central sends the team and match SQLite databases as binary files.
4. Central sends the team and match scouting forms.

After sync, the coach has a local copy of all scouting data and can browse all analysis views without needing a network connection.

> **Sync frequently** to keep data current. Each sync replaces the previous local copy.

**To reset the coach tablet** (remove all event data and start fresh): **Reset → Reset Tablet** from the menu.

### 9.3 Analysis Views Available to the Coach

After syncing, the coach has access to:

| View | Description |
|------|-------------|
| **Event Info** | Summary of the loaded event |
| **Team Form** | Read-only view of the team scouting form |
| **Team Status** | Which teams have been pit-scouted |
| **Team Data** | Full team database with all collected data |
| **Match Form** | Read-only view of the match scouting form |
| **Match Status** | Scouting completion by match |
| **Match Data** | Full match database |
| **Playoffs** | Playoff bracket (editable by coach) |
| **Formulas** | View and edit coach-owned formulas |
| **Pick List** | Alliance selection tool |
| **Single Team View** | Charts comparing teams |

All database views support the same column visibility, conditional formatting, and sorting features as Central.

### 9.4 Coach-Owned Pick Lists and Graphs

The coach can create and manage **their own** pick lists and chart configurations. These are separate from Central's versions and survive sync.

When the coach re-syncs to Central, the coach's pick lists and chart configurations are **pushed back to Central** at the start of the sync. This means:
- The coach can set up pick lists and charts during the event.
- Central always has the coach's latest configurations after each sync.

To create a coach-owned pick list or chart, follow the same steps as described in [Section 6.3](#63-single-team-view-charts) and [Section 6.4](#64-pick-lists). Coach-owned items are automatically tagged as `owner: coach`.

---

## 10. Formulas Reference

Formulas are expressions that compute a numeric or boolean value from scouting data. They are written using the XeroScout expression language.

### Basic Syntax

- **Field names** — use the exact column name (tag) from the scouting form (e.g. `auto_speaker`, `teleop_amp_scored`).
- **Arithmetic:** `+  -  *  /`
- **Comparison:** `<  <=  >  >=  ==  !=`
- **Logical:** `&&` (AND), `||` (OR), `!` (NOT)
- **Conditional (ternary):** `condition ? value_if_true : value_if_false`

### Aggregate Functions

Formulas aggregate data across multiple matches (filtered by a data set). Common functions:

| Function | Description |
|----------|-------------|
| `avg(field)` | Average value across all matches in the data set |
| `sum(field)` | Sum of values |
| `max(field)` | Maximum value |
| `min(field)` | Minimum value |
| `count(field)` | Number of non-null/non-zero values |

### Examples

```
# Total average score contribution
avg(auto_speaker) + avg(auto_amp) + avg(teleop_speaker) + avg(teleop_amp)

# Percentage of matches where robot climbed
count(end_climb) / count(match_number) * 100

# Consistency metric (prefer teams with low variance who score well)
avg(teleop_scored) - stddev(teleop_scored)

# Boolean: is this team a strong climber?
avg(end_climb_score) > 10
```

### Using Formulas in Other Places

Once a formula is defined, you can reference it by name anywhere a column/field is accepted:
- As a **data column in a pick list** — use the formula name as the field.
- As a **data item in a chart** — use the formula name as the field.
- As a **conditional formatting rule** — the formula must evaluate to a boolean.
- In **data set filters** — filter which matches are included.

---

## 11. Data Sets Reference

Data sets control which of a team's matches are used when computing aggregate statistics (averages, sums, etc.).

### Why Data Sets Matter

By the end of qualifications a team may have played 8–10 matches. You might want to compare:
- Overall performance (All matches)
- Recent form (Last 3 matches)
- Early-event vs. late-event performance (Range)

### Configuring a Data Set

| Field | Description |
|-------|-------------|
| **Name** | Unique identifier (used to reference the data set in formulas/charts/picklists) |
| **Kind** | All, First N, Last N, Range, or Specific |
| **First** | N for "First N", or start index for Range |
| **Last** | N for "Last N", or end index for Range |
| **Filter formula** | Optional boolean expression to include only matches meeting a condition |

### Default Data Set

The implicit default (no data set specified) includes all matches. You do not need to create a data set named "All" — simply leave the data set field blank in pick list/chart configurations.

---

## 12. Pick List Reference

### What a Pick List Represents

A pick list is an ordered ranking of all teams at the event. During alliance selection, the alliance captain walks down the list top to bottom and picks available teams.

### Configuration Fields

| Field | Description |
|-------|-------------|
| **Name** | Unique name for the pick list |
| **Columns** | List of data columns (field, formula, or expression + data set) to display |
| **Teams** | Ordered team list (drag rows to reorder) |
| **Notes** | One note string per team (editable inline) |
| **Cell Colours** | Per-cell background colours (set by right-clicking a cell) |
| **Column Gradients** | Min/Max or Box5 gradient applied to an entire column |
| **Column Widths** | Position, Team, Nickname, Notes, and per-data-column widths |

### Gradient Modes

| Mode | Description |
|------|-------------|
| **Min/Max** | The team with the highest value gets the most saturated colour; the lowest gets the least. Linear interpolation between. |
| **Box5** | Teams are split into 5 equal-count buckets (top 20%, next 20%, etc.) and each bucket gets a distinct colour. Useful when a few outlier values would compress the Min/Max scale. |

### Workflow During Alliance Selection

1. Open the Pick List view on the Central or Coach device.
2. Select your pre-configured pick list from the left panel.
3. As teams are picked by other alliances, you may want to drag them to the bottom or add a note.
4. Use cell colours to mark teams you are targeting vs. those you would avoid.

---

## 13. Troubleshooting

### "No Event Loaded" on startup

Central opens the most recently used event automatically. If the event directory no longer exists, it falls back to this message. Use **File → Open Event…** to browse to the correct directory.

### Blue Alliance not connecting

- Check that the machine running Central has internet access.
- Central retries every 5 seconds automatically; wait a moment.
- You can proceed without the Blue Alliance — manually enter teams and matches instead.

### Scout tablet can't find Central (WiFi sync)

- Ensure both machines are on the **same WiFi network**.
- Check that Central has started its sync server — the Event must be **locked**. The Central status bar should show the IP address.
- Try **Manual IP** sync instead: enter the IP shown in Central's status bar.
- Ensure no firewall is blocking TCP port 45455 or UDP port 45456.

### Scout tablet shows "No tablets found"

Central has no tablets defined. The operator needs to add tablets in the **Assign Tablets** view and then lock the event.

### Sync says "Event UUID mismatch"

The Coach or Scout is trying to sync with a different event than the one currently open. Ensure both machines are working with the same event. On the Coach, use **Reset → Reset Tablet** to clear the cached event, then sync again.

### Data appears to be duplicated in the database

XeroScout handles deduplication of scouting results by tablet name and assignment. If duplicate rows appear, it may indicate two scouts used the same tablet name. Contact the Central operator to review tablet assignments.

### "Cannot download data while tablets are syncing"

Wait for all active tablet syncs to finish before importing data from the Blue Alliance. If a sync appears stuck, you can use **Data → Clear Stuck External Download** to reset the flag.

### Form editor: control disappears after placement

The control may have been placed off the edge of the canvas. Use Ctrl+A to select all controls and check their coordinates in the position display at the top.

### Log files

If you encounter a reproducible error, log files are stored in:
```
~/.xeroscout/logs/
```
Log files are named `xeroscout-central-*.txt`, `xeroscout-scout-*.txt`, or `xeroscout-coach-*.txt`.

---

*XeroScout 3 — User's Guide*  
*Application by Jack (Butch) Griffin*
