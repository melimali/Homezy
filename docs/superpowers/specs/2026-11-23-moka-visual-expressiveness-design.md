# Moka's Expressive Room Design

**Status:** Approved for implementation by Melih  
**Selected direction:** Hybrid live rig, vector face accents, and signature poses  
**Scope:** Moka room only

## Intent

Make Moka the expressive visual center of the cozy room. Faces should feel distinct and respond to what the user does, while small idle moments make the room feel inhabited. The room's existing art remains the stage.

## Current state

`RoomMoka` already uses the layered `RigBody` rig. It breathes, blinks, shifts its gaze, talks, yawns, sips, stretches, nods off, and celebrates. The room currently receives six moods (`happy`, `cheer`, `wow`, `sleepy`, `neutral`, `sad`). The face rig already has independently animated eyes, eyelids, beak, and speech mouth. Mood selection in `moka.tsx` currently inspects Turkish reply text, so expression choice can be inconsistent in other supported languages.

## Goals

- Expand the room to a palette of 16 clear emotional states: content, happy, cheer, wow, curious, shy, playful, proud, thinking, focused, empathetic, worried, sleepy, cozy, tickled, and sad.
- Make states visibly different at phone size without swapping the seated character image or moving Moka from the cushion.
- Give Moka a varied set of short, event-based reactions and quiet idle acting.
- Select expressions through language-neutral mood keys, never by matching translated reply text.
- Preserve reduced-motion, inactive-screen, and low-end device behavior.

## Non-goals and constraints

- Do not change the shelf, mugs, books, couch, or blanket artwork or placement.
- Do not redesign the room layout or replace the existing room illustrations.
- Do not add native modules or new dependencies.
- Keep new user-facing text on the existing nine-language localization path; expressions should work without adding text.
- Keep non-room Moka appearances unchanged by making expanded face controls optional and passing them only from `RoomMoka`.

## Approaches considered

1. **Expand the rig only.** Lowest asset and runtime cost, but expression changes may remain too subtle.
2. **Draw a complete character image for every mood.** Strong, bespoke looks, but many assets increase package weight and risk pose/scale jumps.
3. **Hybrid — selected by Melih.** Keep the stable live rig, add SVG facial accents and a few authored gesture sequences. This gives many combinations without a large image set or a new native dependency.

## Design

### Expression system

Introduce a typed room expression key and a small preset table for eyes, eyelids, gaze, brow angle, cheek color, and beak openness. Build optional facial accents with the already installed `react-native-svg`: brows, blush, a tear or sweat bead, and small stars/hearts for selected moods. Keep the existing fur and rig layers. Crossfade expression changes over a short, consistent interval so the face never pops or shifts.

Reuse the rig for four signature gesture sequences: playful giggle, shy wing-cover and blush, proud double-hop, and cozy stretch/sigh. These are temporary actions layered over the seated rig, not replacement character stickers. Only one signature action runs at a time.

### Reaction direction

- **Tap Moka:** cycle varied wink, curious, and giggle reactions; five quick taps trigger the tickled sequence. Keep the existing long-press customization action.
- **Task complete:** proud expression, double-hop, and a brief star accent. Completing all work retains the existing celebration trigger.
- **Fresh coffee:** eager look, sip, then content expression.
- **Weather change:** glance toward the window, then choose cozy, curious, or wow based on the current sky.
- **Conversation:** carry an optional typed mood key alongside the reply. If absent, use a safe room default. Do not inspect Turkish or translated text to infer mood.
  The key is a closed-set enum returned optionally by `moka-chat`; the client validates it and falls back safely when absent or invalid. It is transient response metadata: no message-storage or database migration, and no change to reply text, actions, or language.
- **Idle:** after a quiet interval, choose one low-key act (look around, blink, stretch, yawn, sip, or smile). Use weighted variety, avoid immediate repeats, and pause during typing, speech, inactive screens, or reduced motion.

### Room staging

Coordinate expression timing with existing window-weather, light, steam, and plant animations. Add short accents close to Moka (for example, a few hearts or stars during a reaction); do not add full-screen color washes. Keep all protected background objects and their placements untouched. The hanging planter must read as one connected plant: the suspension pivot moves the pot, stem, and leaves together, while the trailing vine keeps only a smaller secondary flex. Current leaf-only flex makes the stem look stiff. The dark wall blotch behind the hanging cups is baked into the phase base art, not a runtime lighting effect. Add a soft phase-matched SVG wall correction behind the cups; preserve shelf/cup pixels and geometry.

### Performance and accessibility

Use React Native `Animated` with the native driver for opacity and transforms, and the existing SVG package for static vector shapes. Schedule only one foreground expression/action and cap temporary face accents. Reuse values, pause loops when the app is inactive, and respect the current reduced-motion setting. Reduced motion keeps discrete expression changes with a simple fade and disables looping gestures and particles.

## Delivery stages

1. Add the room expression key and preset mapping; preserve existing callers and default appearance.
2. Add brows, cheek/tear/sweat/sparkle accents to the room rig and verify alignment across fur colors.
3. Add the four gesture sequences and event mapping for taps, coffee, task completion, weather, and idle.
4. Add the optional mood key to the chat response/client path with a safe fallback; leave reply copy and existing message storage unchanged.
5. Check every supported UI language, day/night/weather states, rapid taps, reduced motion, foreground/background transitions, and short/long phones. Commit only the related files and push to `integration/tum-pr` after the design is approved and implementation is complete.

## Acceptance criteria

- All 16 expression keys produce distinguishable faces at the target room size.
- Moka stays seated at the same scale and anchor through every expression and gesture.
- All language variants select the same semantic mood for the same event; no mood depends on Turkish keywords.
- No protected background object changes artwork or position.
- No new native module or dependency is required.
- At most one expressive gesture and a small, bounded set of temporary accents run together; reduced motion and inactive states stop loops.
- Existing room/chat behavior remains intact when no optional mood key is present.