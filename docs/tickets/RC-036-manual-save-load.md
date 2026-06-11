# RC-036: Manual save/load — save slots + export/import
**Status**: Delivered  **Priority**: P3  **Type**: Feature
**Created**: 2026-06-11

## Summary
Give the player a way to save and load a game deliberately — beyond today's single implicit
localStorage autosave. Likely shape: named/numbered save slots and/or export-to-file +
import-from-file, so progress can be backed up and restored.

## Context
(Renumbered from RC-034 on 2026-06-11 — that ID was taken by the dungeon-expeditions work
merged from a parallel session.) Raised by Jeff during the RC-031 (weapon redesign) spec review, 2026-06-11. The trigger: the
save system hard-resets on every save-version bump (RC-017 stance, reaffirmed for RC-031's
v4 bump — no migrations). Manual save/load softens that policy's cost: players can keep a
pre-bump save export, share saves, or maintain multiple civs. Current persistence is a single
implicit `localStorage` slot in `src/state/saveLoad.ts` (`CURRENT_VERSION` gate, reset on
mismatch).

Backlog item for now — not scheduled; ticketed while it was top of mind.

## Acceptance Criteria
- [ ] (To be defined at pickup; candidate scope below)
- [ ] Multiple save slots and/or JSON export + import from the title/civ screen
- [ ] Version gate still applies on load (stale versions refused with a clear message, not a crash)
- [ ] Save/load round-trip unit-tested

## References
- `src/state/saveLoad.ts` (single-slot autosave, version reset gate)
- RC-017 (exponential economy — origin of the reset-on-bump stance)
- RC-031 (weapon redesign — v4 bump that re-raised this)

## Resolution
Delivered. New pure module `src/state/saveSlots.ts`: 3 slots at `${SAVE_KEY}-slot-{1|2|3}`
storing `{ savedAt, civ }`, with `saveToSlot / loadSlot / deleteSlot / slotInfo / listSlots`
and `exportSave / importSave`. Same version gate as the autosave load (added shared
`isCurrentVersion` + exported `CURRENT_VERSION` in `saveLoad.ts`) — wrong-version/corrupt
slots read as null but the bytes are retained (never deleted). `importSave` parses, gates the
version, and runs a minimal shape check (version/banked/researched/buildings/traditions, with
arrays rejected where an object is required). UI: a flat "Save Slots" panel in `civScreen.ts` —
3 cards (Save with confirm only when occupied, Load with confirm always), Export-to-file
(`rogue-civ-save-YYYY-MM-DD.json` via Blob+anchor), and Import via hidden file input (null →
inline "Incompatible or corrupt save"; success → confirm → adopt). Wired through a new
`onCivReplaced(civ)` callback that persists to autosave + re-renders. 19 new unit tests
(`tests/saveSlots.test.ts`); suite 288 → 307 green, build green. Live Playwright (port 5300):
save→card shows date/runs; research pottery→load slot 1→state reverted; export downloads the
dated JSON; import valid file→adopted (runs 42); import garbage→inline error, game unharmed.
