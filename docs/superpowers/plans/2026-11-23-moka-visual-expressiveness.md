# Moka Visual Expressiveness Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` for this plan. Steps use checkbox syntax.

**Goal:** Make Moka's room expressions varied, legible, event-aware, and consistent across all nine UI languages.

**Architecture:** Add a closed set of room expression keys shared by the client and server response contract. Render expression presets and vector accents through the existing layered rig; let `RoomMoka` coordinate single, short gesture sequences. Keep mood metadata optional and transient, with a safe client fallback.

**Tech Stack:** Expo SDK 58, React Native `Animated`, existing `react-native-svg`, Supabase Edge Function/Deno.

**Spec:** `docs/superpowers/specs/2026-11-23-moka-visual-expressiveness-design.md`

## Global Constraints

- No new native modules or dependencies.
- Do not change artwork or placement of shelf, mugs, books, couch, or blanket.
- Keep other `MokaRig` appearances unchanged unless an expression is explicitly passed by `RoomMoka`.
- Do not infer mood by matching Turkish or translated reply text.
- Mood metadata is optional, transient response data; no database or message-storage migration.
- Respect reduced motion, active-screen state, and the current animation budget.
- Preserve current reply text, action handling, and nine-language output.

## Latest user clarifications (2026-11-23)

- Keep the plant as one connected moving plant; never transform the opaque rectangular crop or its wall/window pixels. Clouds should drift during clear daytime and across clock phases.
- Hide wing/sleeve protrusions behind worn body clothing. Keep the separate AYAK art above clothing and give it subtle motion.
- Remove the baked dark wall blotch with a soft phase-matched wall-only overlay; preserve shelf, cups, books, couch, blanket, their art, and their positions.
- Include missing paid cosmetic/store catalog rows in the consolidated SQL. Live Supabase still requires applying the prepared SQL.

## Review Focus

- Missing or invalid mood metadata must fall back to `happy` without breaking reply handling.
- Mood tool calls must not be surfaced as user actions or consume the four-action limit.
- Crisis, canned, offline, and action-only replies must still render and select a safe mood.
- Fast repeated taps must restart the tickle response without overlapping gesture animations.
- Reduced-motion and inactive states must stop continuous/particle animation while keeping static facial expressions.

---

### Task 1: Add locale-neutral mood contract

**Files:**
- Create: `src/constants/room-expression.ts`
- Modify: `src/lib/mokaChat.ts`
- Modify: `src/app/moka.tsx`
- Modify: `supabase/functions/moka-chat/index.ts`

**Interfaces:**
- `ROOM_EXPRESSIONS`: readonly tuple of 16 mood keys.
- `RoomExpression`: union derived from that tuple.
- `isRoomExpression(value: unknown): value is RoomExpression`.
- `ROOM_FACE_PRESETS: Record<RoomExpression, RoomFacePreset>` with `eyeOpen`, `gaze`, `brow`, `cheek`, `beakOpen`, and optional `accent`.
- Successful `askMoka()` result gains optional `mood?: RoomExpression`.
- `moka-chat` returns `mood` only when it receives a valid closed-set mood tool call; mood tool is not a `ChatAction`.

- [ ] Add the 16 typed keys and runtime guard. Keep expression names language-neutral and stable.
- [ ] Add an optional visual-only `room_mood` tool to the server request, plus a system instruction to call it once alongside the reply. Include only its small schema on ordinary chat; include it with existing action tools when `useTools` is true.
- [ ] Parse the tool call separately from `actions`, return the enum alongside the unchanged reply and action fields, and use `empathetic` for the deterministic crisis reply.
- [ ] Validate `data.mood` in `askMoka()`; ignore absent/invalid values.
- [ ] Carry returned mood on the in-memory assistant `Item`; do not change persisted session shape or UI copy.

### Task 2: Extend the live face rig

**Files:**
- Modify: `src/components/MokaRig.tsx`
- Modify: `src/components/RoomMoka.tsx`
- Reuse: `src/constants/room-expression.ts`

**Interfaces:**
- `RigBody` gains optional `expression?: RoomExpression`; omitted value keeps existing rendering.
- `RigFace` receives resolved face preset through `RigBody`.
- `RoomMoka` accepts `mood: RoomExpression`.

- [ ] Define preset values for eye openness, gaze, brow angle, cheek tint, beak openness, and optional accent type.
- [ ] Add static SVG brow and cheek/tear/sweat/star/heart shapes behind animated wrappers; use opacity and transform for transitions.
- [ ] Pass expressions only from `RoomMoka`; keep `MokaRig` and wardrobe/default callers visually unchanged.
- [ ] Check presets at room size across the seven supported fur palettes; keep face geometry aligned to existing 512-unit rig coordinates.

### Task 3: Add signature acting and room reactions

**Files:**
- Modify: `src/components/RoomMoka.tsx`
- Modify: `src/app/moka.tsx`
- Modify: `src/components/RoomBackdrop.tsx`
- Modify: `src/constants/oda.ts`

**Interfaces:**
- `RoomMoka` receives `mood: RoomExpression`, `talking`, `thinking`, `celebrate`, `weather: SkyKind`, `brew`, and `engaged`.
- `moka.tsx` resolves mood by event metadata and app state, never reply-string matching.

- [ ] Add four signature sequences: giggle, shy wing-cover, proud double-hop, and cozy stretch/sigh. Run at most one sequence at a time.
- [ ] Map Moka taps to varied wink/curious/giggle states; five quick taps trigger `tickled`.
- [ ] Pass current weather, brew counter, and text-entry engagement from `moka.tsx` to `RoomMoka`; map task completion to `proud`/`cheer`, fresh coffee to eager→sip→content, weather change to a window glance and contextual expression, and active conversation to the optional server mood.
- [ ] Keep idle action scheduling quiet and varied; pause it during speech, typing, inactive state, and reduced motion.
- [ ] Fix hanging planter follow-through: raise `MOTION.asma.deg` to `1.35`; compose `vals.ivy * 0.6` into the planter root rotation around its existing suspension pivot; reduce trailing-vine flex to `±1.8deg` so stem, pot, and crown move together with leaves lagging slightly.
- [ ] Add a soft phase-matched SVG wall correction over the baked-in dark blotch behind the hanging cups; keep the radial edge below the shelf line and render dynamic cups above it.
- [ ] Remove `mimikOf()` from room mood selection; keep unrelated message-avatar behavior intact.

### Task 4: Integrate, inspect, and deliver

**Files:**
- Modify only the files listed in Tasks 1–3.
- No new translations or static room artwork required.

- [ ] Run `npx expo lint` on the modified application files and `npx tsc --noEmit`.
- [ ] Inspect the diff for protected room artwork/coordinates, unrelated Moka screens, and accidental locale changes.
- [ ] Commit the focused implementation and push to `origin/integration/tum-pr`.