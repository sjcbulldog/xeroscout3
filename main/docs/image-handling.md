# Image Handling and Transfer Flow

## Overview
Images are managed end-to-end by a shared `ImageManager` class and a handful of Electron IPC handlers. XeroCentral owns the canonical copy of every field or form image, and XeroScouter keeps a local cache that is populated during sync. All form definitions refer to images by **basename** (no extension), and the runtime resolves those names to concrete `.png` files on disk.

## Storage Locations
- **Packaged defaults** – When XeroCentral boots, it points `ImageManager` at the bundled directory `content/images` so packaged assets such as `field2025.png` and `missing.png` are always available (`src/main/apps/scbase.ts:42-43`).
- **User cache** – Both apps compute a writable cache root under `<user data>/<app name>/images/<app type>` (`src/main/imagemgr.ts:79-102`). Central writes imported images here; Scouter writes files received from the hub.
- **File naming contract** – When Central imports an image, the file is copied verbatim into the cache and stored under the basename without extension (`src/main/imagemgr.ts:57-66`). Scouter follows the same convention and emits `<name>.png` when materializing base64 payloads (`src/main/imagemgr.ts:70-76`).

## Renderer Interaction
- The renderer keeps its own cache and drives requests through the preload bridge. On startup it registers for `send-images` and `send-image-data`, then immediately asks for the blank and missing placeholders (`dist/renderer/xeroapp.bundle.js:56-119`).
- IPC wiring in the main process funnels `get-images`/`get-image-data` events to the current app instance (`src/main/ipchandlers.ts:478-503`). Central responds by calling `SCBase.sendImages()` and `sendImageData()`.
- `sendImageData()` reads the resolved path, base64 encodes it, and falls back to `missing.png` if the requested image is absent (`src/main/apps/scbase.ts:136-151`, `src/main/apps/scbase.ts:361-368`).

## XeroCentral Workflow
1. **Boot** – Constructs `ImageManager('central', content/images)` and indexes both the packaged and user cache directories (`src/main/apps/scbase.ts:38-43`, `src/main/imagemgr.ts:29-38`).
2. **Import** – When the operator chooses *Import Image…*, the selected file is copied into Central's cache and the image list pushed to the renderer (`src/main/apps/sccentral.ts:615-639`).
3. **Serving to UI** – The renderer pulls the list and previews directly from Central via the IPC bridge (`src/main/apps/scbase.ts:136-151`).
4. **Responding to Scouters** – During sync, Central listens for `PacketType.RequestImages`, resolves each name to a real path, reads the bytes, and returns a base64 map in `PacketType.ProvideImages` (`src/main/apps/sccentral.ts:2044-2062`). If no file is found the payload is an empty string, so the downstream device writes a zero-byte image.

## Sync Handshake (Cable Sync)
1. Scouter parses both the team and match forms, collecting all controls whose type is `image` (`src/main/apps/scscout.ts:809-827`).
2. For each unique basename that is missing locally, Scouter queues a `PacketType.RequestImages` message (`src/main/apps/scscout.ts:830-876`, `src/main/sync/packettypes.ts:3-28`).
3. Central answers with `PacketType.ProvideImages`, sending a JSON map of `{ name: base64 }` where `base64` is the PNG payload encoded from disk (`src/main/apps/sccentral.ts:2044-2062`).
4. Scouter materializes each entry to `<cache>/<name>.png`, updates its index, and immediately re-runs the dependency check so any remaining gaps trigger additional requests (`src/main/apps/scscout.ts:717-724`, `src/main/imagemgr.ts:70-76`).
5. The renderer on the tablet uses the same `get-image-data` IPC call path as Central to display images while filling out forms.

## XeroScouter Workflow Details
- **Startup cache** – Scouter builds its `ImageManager('scout')` with only the user cache; there are no packaged images beyond whatever was last synced (`src/main/apps/scbase.ts:38-43`).
- **Reset handling** – Choosing *Reset Tablet* wipes the cache directory via `ImageManager.removeAllImages()` and clears the runtime state, guaranteeing the next sync will re-download every referenced image (`src/main/apps/scscout.ts:320-347`, `src/main/imagemgr.ts:128-135`).
- **Fallback coverage** – The UI always has access to the bundled `blank` and `missing` assets because the renderer requests them immediately; if a specific asset was not delivered, Scouter serves the `missing` data in its place (`src/main/apps/scbase.ts:147-151`).

## File Path Touchpoints
| Location | Role |
| --- | --- |
| `src/main/apps/scbase.ts:38-43` | Derives `content/images` (Central) and creates an `ImageManager` with optional packaged assets. |
| `src/main/imagemgr.ts:57-76` | Copies imports into `<user cache>` and writes base64 payloads to `<name>.png`. |
| `src/main/imagemgr.ts:79-136` | Resolves the cache root from environment variables, creates the directory tree, scans for `.png` files, and deletes cached files on reset. |
| `src/main/apps/sccentral.ts:615-639` | File picker callback that imports images and refreshes the renderer list. |
| `src/main/apps/scbase.ts:136-151` | Main-process IPC handler that base64 encodes on-disk images for renderer consumption. |
| `src/main/apps/sccentral.ts:2044-2062` | Responds to cable sync image requests by reading files and building the JSON payload. |
| `src/main/apps/scscout.ts:717-724` | Writes synced images to disk and merges them into the local map. |
| `src/main/apps/scscout.ts:809-876` | Computes required image basenames from form definitions and issues `PacketType.RequestImages` for anything missing. |
| `dist/renderer/xeroapp.bundle.js:56-119` | Renderer-side cache that drives `get-image-data` requests and tracks basenames. |

## Failure Modes to Watch
- **Cache directory discovery** – The non-Windows branch only checks `process.env.HOMEDIR`; on macOS or Linux where only `HOME` is defined, `ImageManager.findUserImageDir()` returns `undefined`, preventing imports from being written (`src/main/imagemgr.ts:93-101`). Verify the environment variables or patch the lookup.
- **Empty payloads** – If Central cannot resolve a path, the sync response carries an empty string. Scouter dutifully writes that as a zero-byte PNG, and subsequent reads will still fail. Adding logging around `getImage()` and alerting in this branch can surface missing files (`src/main/apps/sccentral.ts:2048-2056`).
- **Name mismatches** – Forms must reference the basename returned by `ImageManager.addImage()` (e.g., `reef2025`). If a form requests `reef2025.png`, the lookup fails because the map strips extensions. Validate form JSON when debugging missing assets.

## Recommendations for Debugging
1. Log the resolved cache paths for both apps at startup to confirm the directories exist and are writable.
2. Add temporary logging in Central's `RequestImages` handler to record the filesystem path and whether `fs.readFileSync` succeeded (`src/main/apps/sccentral.ts:2044-2054`).
3. On tablets, check the cache directory after sync to ensure `<name>.png` files are present; if they are zero bytes, trace back to the Central response.
4. Validate form JSON to ensure `image` fields use the expected basenames and that those names appear in Central's `ImageManager.getImageNames()` list.
