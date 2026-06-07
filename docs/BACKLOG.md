# Rogue · Civ -- Backlog
> Last verified: 2026-06-06

Hub tracking surface for the AI Assistant registry. Detailed design lives in
`docs/superpowers/specs/` and `docs/superpowers/plans/`; resolved defects in
`docs/KNOWN_ISSUES.md`.

## Capabilities

| ID | Name | Status | Phase | Priority | Depends On | Description |
|----|------|--------|-------|----------|------------|-------------|
| C1 | Vertical slice (P0+P1) | Delivered | Core Loop |  |  | Timed survivor run -> 4 resources -> tech tree + base camp -> Stone->Bronze -> localStorage save. 38 unit tests. |
| C2 | Art pass | Delivered | Visuals | P1 | C1 | Claude-authored sprites via shape-data + render-pass pipeline (flat now, shaded as a later global toggle). |
| C3 | Content & ages | Planned | Depth | P2 | C1 | Iron->Space ages, more techs/buildings/enemies, weapon evolutions, juice + balance. |
| C4 | The Last Stand finale | Planned | Endgame | P3 | C3 | Space-invaders boss run + victory screen. |

## Active

| ID | Title | Status | Priority | Capability | Ticket |
|----|----|----|----|----|----|
| RC-001 | Fix combat auto-attack no-damage (NaN enemy HP) | Delivered | P1 | C1 |  |
| RC-002 | Execute art-pass plan (calibrate hero, ratify, fan out) | Delivered | P1 | C2 | docs/superpowers/plans/2026-06-06-art-pass.md |
| RC-003 | Hero evolves visually by age (Bronze/Iron gear) | Open | P2 | C3 | docs/tickets/RC-003-hero-evolves-by-age.md |
| RC-004 | Multi-tier gems (Diablo II–inspired faceting + quality progression) | Open | P3 | C3 | docs/tickets/RC-004-multi-tier-gems.md |
