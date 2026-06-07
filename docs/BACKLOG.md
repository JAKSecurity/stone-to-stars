# Rogue · Civ -- Backlog
> Last verified: 2026-06-07

Hub tracking surface for the AI Assistant registry. Detailed design lives in
`docs/superpowers/specs/` and `docs/superpowers/plans/`; resolved defects in
`docs/KNOWN_ISSUES.md`.

## Capabilities

| ID | Name | Status | Phase | Priority | Depends On | Description |
|----|------|--------|-------|----------|------------|-------------|
| C1 | Vertical slice (P0+P1) | Delivered | Core Loop |  |  | Timed survivor run -> 4 resources -> tech tree + base camp -> Stone->Bronze -> localStorage save. 38 unit tests. |
| C2 | Art pass | Delivered | Visuals | P1 | C1 | Claude-authored sprites via shape-data + render-pass pipeline (flat now, shaded as a later global toggle). |
| C3 | Content & ages | In Progress | Depth | P2 | C1 | Iron->Space ages, more techs/buildings/enemies, weapon evolutions, juice + balance. |
| C4 | The Last Stand finale | Planned | Endgame | P3 | C3 | Space-invaders boss run + victory screen. |

## Active

| ID | Title | Status | Priority | Capability | Ticket |
|----|----|----|----|----|----|
| RC-001 | Fix combat auto-attack no-damage (NaN enemy HP) | Delivered | P1 | C1 |  |
| RC-002 | Execute art-pass plan (calibrate hero, ratify, fan out) | Delivered | P1 | C2 | docs/superpowers/plans/2026-06-06-art-pass.md |
| RC-003 | Hero evolves visually by age (Bronze/Iron gear) | Open | P2 | C3 | docs/tickets/RC-003-hero-evolves-by-age.md |
| RC-004 | Multi-tier gems (Diablo II–inspired faceting + quality progression) | Open | P3 | C3 | docs/tickets/RC-004-multi-tier-gems.md |
| RC-005 | Scope + plan the next age (Iron) content slice | Delivered | P1 | C3 | docs/tickets/RC-005-content-ages-iron-slice.md |
| RC-006 | Data-driven weapon system | Open | P1 | C3 | docs/tickets/RC-006-data-driven-weapons.md |
| RC-007 | Enemy + biome + expedition systems | Open | P2 | C3 | docs/tickets/RC-007-enemy-biome-expedition.md |
| RC-008 | Iron age content (techs/buildings/biome/enemies/weapons) | Open | P2 | C3 | docs/tickets/RC-008-iron-content.md |
| RC-009 | Juice + balance pass | Open | P2 | C3 | docs/tickets/RC-009-juice-balance.md |
