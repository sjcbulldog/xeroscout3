# Team Robot Photo Storage

## Current Design
- Team Scouting uses a `robotphoto` form control in `capture` mode.
- Match Scouting uses a `robotphoto` control in `display` mode and reads the active team's captured value.
- The robot photo is stored directly in scouting results as a `data:image/webp;base64,...` string.

## Capture Flow
- `Take a Photo` opens an in-app camera dialog using `getUserMedia`.
- `Pick` opens the normal file chooser for common image types.
- Both paths decode the selected image, resize it to a preview-friendly size, and re-encode it to WebP.

## Storage And Sync
- Robot photos are not written to the Windows filesystem as part of normal storage.
- Team Scout, sync packets, and Central all treat the robot photo as normal string form data.
- `team.db` stores the same WebP data URL string that was captured on the tablet.
- Robot photo database columns are hidden by default because the raw value is not useful in table views.

## Image Format
- Photos are converted to `image/webp` in the renderer before storage.
- The long edge is capped at `960px`.
- WebP quality is `0.85`.

## Validation
- `npm run build` in `main/`
- `npx vitest run` in `main/`
