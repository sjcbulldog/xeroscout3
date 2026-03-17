# Team Robot Photo Sync Plan

## Current Structure
- Project state is split between `event.json`, `team.db`, `match.db`, and the image cache managed by `ImageManager`.
- Team and match scouting results sync as JSON through `ProvideResults`.
- Static images already sync by name through `RequestImages` / `ProvideImages`, and tablets only request images they do not already have locally.

## Feature Shape
- Team Scouting uses a new `robotphoto` form control in `capture` mode.
- Match Scouting uses the same `robotphoto` control in `display` mode, reading the configured source tag from the active team result.
- Robot photo binaries stay out of SQLite and out of raw event JSON payloads. Only the stable photo key is stored in scouting results and DB fields.

## Storage
- Team tablets store captured robot photos in the existing local image cache.
- Central stores the canonical event copy under `<project>/robot-photos`.
- `event.json` keeps a small `robot_photos_` manifest with team number, key, file name, format, and update time.

## Sync
- Team tablets upload new robot photos alongside `ProvideResults` using `robotPhotos` attachments.
- Central writes those files to the event directory before processing team results.
- Match tablets discover required robot photo keys from synced team results and request only missing files through the existing image sync flow.
- The image cache prevents re-downloading the same robot photo on later syncs.

## Image Format
- Robot photos are compressed in the renderer to WebP before storage or sync.
- Compression target is a 720p bounding box:
  - landscape up to `1280x720`
  - portrait up to `720x1280`
- WebP quality is `0.85`.
- The image pipeline now carries MIME type and extension metadata so PNG field assets and WebP robot photos can coexist.

## Testing
- Renderer bundle and main TypeScript compile pass through `npm run build` in `main/`.
- Existing automated tests pass through `npx vitest run` in `main/`.
