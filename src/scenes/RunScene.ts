import Phaser from 'phaser';
import { RunModifiers, RunResult, Resource, Expedition, BiomeDef, EnemyDef, EquippedPassive, RunStats, OnHit } from '../game/types';
import { initialRunStats, addXp, xpProgress } from '../run/runStats';
import { rollDraft, DraftOption, draftLayout } from '../run/draft';
import {
  EquippedWeapon, initialWeapons, addWeapon, swapWeapon, levelWeapon, defOf,
  weaponShot, WeaponShot, equipHybrid,
  weaponStatText, weaponLevelGainText,
} from '../run/weapons';
import { fuseWeapons, fusionName } from '../run/fusion';
import { resolveShape } from '../run/archetypes';
import { VFX_KITS, VfxKit, kitForHybrid } from '../run/vfxKits';
import { addPassive, levelPassive, fusePassives, passiveDefOf, recomputeStats } from '../run/passives';
import { PASSIVES } from '../run/passiveData';
import { RELICS, BLOOD_RUSH_DURATION_MS, BRAMBLE_DAMAGE, OVERCHARGE_PERIOD_MS } from '../run/relicData';
import {
  rollFoodDrop, rollBonusGem, foodHeal, bloodRushBonus, secondWindRevive, regenTick,
} from '../run/relics';
import { ACTIVES } from '../run/activeData';
import { BASE_ACTIVE_CHARGES } from '../run/actives';
import { WEAPONS } from '../run/weaponData';
import { BIOMES } from '../run/biomeData';
import { ENEMIES } from '../run/enemyData';
import { apexEnemyId } from '../run/expedition';
import { GemTier, gemTierForExpeditionTier, gemSpriteId, gemDisplayScale, gemValueTier } from '../run/gemTier';
import { rewardValueForTier } from '../game/economy';
import {
  bossFreeTable, bossJackpotGems, BOSS_HP_MULT, dropsCatalyst,
} from '../run/bossEvent';
import { playSfx } from '../audio';
import { isTouchDevice } from '../platform/device';
import { TouchControls } from './touchControls';
import { activeAimPoint, Vec2 } from './touchMath';
import {
  orbitAngle, orbitPosition, lobFlightMs, lobProgress, lobGroundPosition, lobArcHeight, withinRadius,
  ORBIT_RADIUS, ORBIT_HIT_INTERVAL_MS, LOB_BLAST_RADIUS, LOB_PEAK_HEIGHT,
  boomerangVelocity, homingVelocity, chainNextTarget,
  BOOMERANG_OUT_MS, CHAIN_RANGE, CHAIN_FALLOFF, ZONE_TICK_MS,
  TRAIL_RADIUS, TRAIL_LINGER_MS, ZONE_RADIUS, SLOW_MS,
} from '../run/projectileMotion';
import {
  ChargerState, ChargerPhase, initChargerState, chargerStep, CHARGER_CONFIG,
  circlerVelocity, CIRCLER_RADIUS, standoffVelocity, STANDOFF_MIN, STANDOFF_MAX,
} from '../run/enemyBehavior';
import { mulberry32 } from '../run/rng';
import {
  generateLayout, DungeonLayout, Barrier,
  WALL_THICKNESS, BARRIER_THICKNESS, routeAround, AGGRO_RADIUS, clampToPlayable,
} from '../run/dungeonGen';
import { enemyPlacements, gemPlacements, pickBiasedResource, openPoint } from '../run/dungeonPopulate';
import { combineMutators, applyHaulMult } from '../run/mutators';
import { MUTATORS } from '../run/mutatorData';
import { POIS, PoiDef, PoiId, ALTAR_WAKE_SCREENS, COURIER_SPEED_MULT, COURIER_DESPAWN_MS } from '../run/poiData';
import { rollPois, shrineWave, shrineJackpot, courierJackpot } from '../run/poi';
import { fleeVelocity } from '../run/enemyBehavior';
import {
  InvasionWave, FormationState, WAVES, formationStep, MOTHERSHIP_HP_MULT, mothershipPhase,
} from '../run/invasion';
import {
  VOLLEY_COOLDOWN_MS, VOLLEY_DAMAGE_MULT,
  SLASH_RANGE, SLASH_ARC_RAD, SLASH_WINDUP_MS, SLASH_COOLDOWN_MS,
  BEAM_AIM_MS, BEAM_WIDTH, BEAM_COOLDOWN_MS, BEAM_DAMAGE_MULT,
  FLAME_CONE_RANGE, FLAME_COOLDOWN_MS,
  MORTAR_COOLDOWN_MS, MORTAR_BLAST, MORTAR_FLIGHT_MS,
  SPAWNER_COOLDOWN_MS,
  HAUNT_DROP_MS, HAUNT_LINGER_MS,
  ENRAGE_MULT,
  arcContains, beamHits, enrageActive, flamePatchPoints, spawnerMaySummon,
  enemyDamageMult, bossDamageMult,
} from '../run/enemyAttacks';

// Sprites + movement render at 2x and the play field fills the window (the field is the canvas size).
const RUN_SCALE = 2;

// RC-020: pitch the gem-pickup chime up by the gem's value (kept musical, ~one-octave span).
const gemValueToSemitones = (v: number) => Math.min(12, Math.floor(Math.log2(Math.max(1, v)) * 2));

// End-of-run "Zone Cleared" ceremony: clear non-boss enemies, magnet every gem in, then summarize.
const CEREMONY_MS = 3000;

// Hard cap on enemy projectiles alive at once — guarantees there are never more than this many to
// dodge, even at end-game mob density. Combined with low per-enemy fire cadence below.
// RC-040: raised 10 → 16 to give the volley profile headroom (its ~700ms cadence eats the old cap).
const MAX_ENEMY_BULLETS = 16;

// RC-042 — The Last Stand finale tuning (scene-side; the pure wave/phase math lives in invasion.ts).
const FINALE_BEAT_MS = 1500;               // inter-wave banner beat before the next stage spawns
const FINALE_ARENA_SCREENS = 1.5;          // arena = viewport × this per axis (floored below)
const FINALE_ARENA_MIN_W = 1500;           // floor so wave 5's 8-col grid always has march room
const FINALE_ARENA_MIN_H = 1100;
const MOTHERSHIP_DRIFT_SPEED = 40;         // px/s pre-RUN_SCALE — slow horizontal drift at the top
const MOTHERSHIP_DRONE_PERIOD_MS = 4000;   // phase 2+: one invader_drone add per period…
const MOTHERSHIP_MAX_DRONES = 4;           // …capped at this many concurrent live adds

// Enemy projectile profiles by attack type. `speed` is pre-RUN_SCALE and deliberately slow so the
// shots are easy to sidestep. `range` (melee only) gates firing to when the player is close.
const ENEMY_SHOT = {
  ranged: { speed: 70, lifeMs: 4000, cooldownMs: 3400, damageMult: 0.8, color: 0xff5544, radius: 7 },
  melee: { speed: 110, lifeMs: 650, cooldownMs: 1600, damageMult: 1.0, color: 0xff8833, radius: 7, range: 200 },
} as const;

// rc-015's orbit/lob constants predate RUN_SCALE; scale their world-space radii + projectile size so
// they stay proportional in the 2× play field (ring isn't hugging the hero, AoE matches enemy size).
const ORBIT_RING = ORBIT_RADIUS * RUN_SCALE;
const LOB_BLAST = LOB_BLAST_RADIUS * RUN_SCALE;
const PROJ_SIZE = 14 * RUN_SCALE; // orbit/lob projectile display size
const CHARGER_CONFIG_SCALED = { ...CHARGER_CONFIG, trigger: CHARGER_CONFIG.trigger * RUN_SCALE };

interface RunInit {
  modifiers: RunModifiers;
  expedition: Expedition;
  onComplete: (result: RunResult) => void;
  heroSprite?: string;
  mutators?: string[]; // RC-029: ephemeral per-launch wager ids
  // RC-039: ESC pause menu — main.ts shows/hides its DOM overlay in response to this.
  onPauseMenu?: (open: boolean) => void;
}

export class RunScene extends Phaser.Scene {
  private mods!: RunModifiers;
  private onComplete!: (r: RunResult) => void;
  private onPauseMenu?: (open: boolean) => void; // RC-039
  private stats = initialRunStats({
    maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'],
    pickupRadius: 60, moveSpeedMult: 1, fireRateMult: 1,
    draftRerolls: 0, startWeaponLevel: 1, actives: [],
  });
  private expedition!: Expedition;
  private biome!: BiomeDef;
  private layout!: DungeonLayout;

  private player!: Phaser.GameObjects.Image & { body: Phaser.Physics.Arcade.Body };
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private gems!: Phaser.Physics.Arcade.Group;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private touch?: TouchControls;
  private lastMoveDir: Vec2 = { x: 0, y: -1 };

  private collected: Record<Resource, number> = { exploration: 0, science: 0, industry: 0, culture: 0 };
  private elapsed = 0;
  private lastSweepMs = 0; // RC-038: throttle for the ~1s containment sweep
  private equipped: EquippedWeapon[] = initialWeapons();
  private passives: EquippedPassive[] = [];
  // RC-025 relic slot + mechanic state
  private relic: string | null = null;
  private secondWindUsed = false;
  private bloodRushUntil = -Infinity;
  private overchargeMs = 0;
  private regenHealed = 0;           // lifetime regen spent against the 25% budget
  private foods!: Phaser.Physics.Arcade.Group;
  private catalysts = 0;
  private catalystTokens: any[] = [];
  private baseStats!: RunStats; // snapshot of the run's base stats (civ mods), set in create()
  // RC-029: ephemeral per-launch mutators. Field initializers keep restarts safe; init() reassigns both.
  private mutatorIds: string[] = [];
  private mutFx = combineMutators([]);
  private weaponCooldowns: Record<string, number> = {};
  private bossId = '';
  private bossEnemy: any = null;
  private trickleBiome!: BiomeDef;          // biome.spawnTable minus the boss (the random-spawn pool)
  private bossHp?: { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text };
  private paused = false;
  // RC-039: ESC pause menu. Distinct from `paused` (which the draft overlay also drives) so ESC
  // only closes a pause it opened, never a draft. When true, `paused` is also true + physics paused.
  private pauseMenuOpen = false;
  private finished = false;
  private pendingComplete: RunResult | null = null;
  private ceremony = false;
  private ceremonyMs = 0;
  private pendingDrafts = 0;
  private rerollsLeft = 0;
  private lobs: Array<{
    img: any;
    start: { x: number; y: number };
    target: { x: number; y: number };
    elapsed: number;
    flightMs: number;
    damage: number;
    onHit: OnHit;
    kit: VfxKit; // RC-031 VFX: tints the lob, zone patch, and landing impact/shake
  }> = [];
  // RC-031: lingering damage fields shared by trail (burning ground behind you) and zone (mine
  // field at a lob landing). World-anchored visuals — no scrollFactor(0), they live in the world.
  private patches: Array<{
    x: number; y: number; bornMs: number; lingerMs: number; radius: number;
    tickDamage: number; lastTick: Map<any, number>; gfx: Phaser.GameObjects.Arc; tint: number;
  }> = [];
  // RC-040: enemy ground hazards (flamejet patches, haunt trail). A second patch list that mirrors
  // `patches` but ticks the PLAYER (never enemies) on a ZONE_TICK_MS re-hit cadence. Reset in init();
  // the gfx circles are scene-owned and reaped on shutdown like the player `patches`.
  private enemyPatches: Array<{
    x: number; y: number; bornMs: number; lingerMs: number; radius: number;
    tickDamage: number; lastPlayerTick: number; gfx: Phaser.GameObjects.Arc;
  }> = [];
  private enemyUidCounter = 0;
  // RC-026 POIs: the seeded dungeon rng (kept from create() for POI rolls/placement/wave/jackpot),
  // the placed POIs, and the shrine-wave tracking. Indicators are one reused screen-fixed text per
  // POI. All reset in init().
  private dungeonRng: () => number = mulberry32(0);
  private pois: Array<{ def: PoiDef; x: number; y: number; obj: any; consumed: boolean; indicator?: Phaser.GameObjects.Text }> = [];
  private shrineWaveIds: Set<string> = new Set();
  private shrinePending: { x: number; y: number } | null = null;
  private hud!: Phaser.GameObjects.Text;
  // RC-022 B3 HUD strip: a thin XP-progress bar under the HUD text, and a kill counter.
  private xpBarBg!: Phaser.GameObjects.Rectangle;
  private xpBarFill!: Phaser.GameObjects.Rectangle;
  private kills = 0;
  // RC-022 B6: throttle muzzle flashes — min gap between flashes (rapid-fire spam guard).
  private lastFlashMs = -Infinity;
  private heroSprite = 'hero';
  // RC-031: chosen right-click active id (wired from this.mods.activeItem in Task 11). Stays
  // undefined until then; the loadout HUD line guards on it.
  private activeId?: string;
  // RC-031: charges consumed this run. Tracked separately so refreshStatsFromPassives() can
  // subtract them after recomputeStats() yields the new MAX — preventing passive picks from
  // refunding already-spent charges (infinite-charges bug).
  private chargesSpent = 0;
  private lastHeavyShakeMs = -Infinity;
  // RC-042 — The Last Stand finale. `finale` routes init/create/update around the normal dungeon
  // systems (spawner/POIs/deposits); the formation controller + mothership phases below replace
  // them. finaleWave: 0 = not started, 1–5 = formation waves, 6 = mothership. All reset in init().
  private finale = false;
  private finaleWave = 0;
  private finaleBeatMs = 0;                 // >0 → inter-wave banner beat counting down
  private formation: FormationState | null = null;
  private formationY = 0;                   // formation origin y (drops toward the player on edges)
  private formationWaveDef: InvasionWave | null = null;
  private formationMembers: Array<{ e: any; dx: number; dy: number }> = []; // grid offsets from origin
  private mothershipObj: any = null;
  private msDriftDir: 1 | -1 = 1;
  private msAttackMs = 0;                   // countdown to the next phase attack
  private msNextAttack: 'mortar' | 'beam' = 'mortar'; // phase-3 alternation
  private msDroneMs = 0;                    // countdown to the next drone add (phase 2+)

  constructor() { super('run'); }

  init(data: RunInit) {
    this.mods = data.modifiers;
    this.onComplete = data.onComplete;
    this.onPauseMenu = data.onPauseMenu; // RC-039
    this.expedition = data.expedition;
    this.biome = BIOMES[data.expedition.biomeId];
    this.heroSprite = data.heroSprite ?? 'hero';
    this.stats = initialRunStats(this.mods);
    // RC-029: ephemeral per-launch mutators. Frail applies to maxHp HERE, before create()'s
    // baseStats snapshot, so the passive recompute model treats it as part of the run's base.
    this.mutatorIds = data.mutators ?? [];
    this.mutFx = combineMutators(this.mutatorIds);
    if (this.mutFx.effects.maxHpMult !== 1) {
      this.stats.maxHp = Math.max(1, Math.round(this.stats.maxHp * this.mutFx.effects.maxHpMult));
      this.stats.hp = this.stats.maxHp;
    }
    this.collected = { exploration: 0, science: 0, industry: 0, culture: 0 };
    this.elapsed = 0;
    this.equipped = initialWeapons(this.mods.startWeapon); // RC-027: chosen starting weapon
    // Heritage tradition: start the run's weapon(s) above level 1.
    const startLvl = this.mods.startWeaponLevel;
    if (startLvl > 1) {
      for (const w of this.equipped) {
        for (let lvl = 1; lvl < startLvl; lvl++) {
          this.equipped = levelWeapon(this.equipped, w.id);
        }
      }
    }
    // Oratory tradition: rerolls available this run.
    this.rerollsLeft = this.mods.draftRerolls;
    this.passives = [];
    this.relic = null;
    this.secondWindUsed = false;
    this.bloodRushUntil = -Infinity;
    this.overchargeMs = 0;
    this.regenHealed = 0;
    this.catalysts = 0;
    this.catalystTokens = [];
    this.chargesSpent = 0;
    this.lastHeavyShakeMs = -Infinity;
    this.weaponCooldowns = {};
    this.paused = false; this.pauseMenuOpen = false; this.finished = false; this.pendingComplete = null; this.pendingDrafts = 0;
    this.ceremony = false; this.ceremonyMs = 0;
    this.lobs = [];
    this.patches = [];
    this.enemyPatches = []; // RC-040: reset enemy ground hazards each run
    this.enemyUidCounter = 0;
    this.kills = 0;            // RC-022 B3: reset the per-run kill counter
    this.lastFlashMs = -Infinity; // RC-022 B6: reset the muzzle-flash throttle
    // RC-026: reset all POI scene state. Destroy any stale indicator objects from a prior run
    // before clearing the array, and re-seed the dungeon rng reference (create() reassigns it).
    for (const p of this.pois) p.indicator?.destroy();
    this.pois = [];
    this.shrineWaveIds = new Set();
    this.shrinePending = null;
    this.dungeonRng = mulberry32(0);
    // RC-042: finale mode + all formation/mothership state.
    this.finale = data.expedition.finale === true;
    this.finaleWave = 0;
    this.finaleBeatMs = 0;
    this.formation = null;
    this.formationY = 0;
    this.formationWaveDef = null;
    this.formationMembers = [];
    this.mothershipObj = null;
    this.msDriftDir = 1;
    this.msAttackMs = 0;
    this.msNextAttack = 'mortar';
    this.msDroneMs = 0;
  }

  create() {
    // RC-031: the chosen right-click active and its base charges. Set BEFORE the baseStats
    // snapshot so the powder_bandolier passive (effectPerLevel.activeCharges) stacks on top of
    // this base via recomputeStats rather than being clobbered by the snapshot.
    this.activeId = this.mods.activeItem;
    this.stats.activeCharges = this.activeId ? BASE_ACTIVE_CHARGES : 0;
    // RC-031: snapshot the run's base stats (civ modifiers, set in init()) so passive changes
    // always recompute from this base rather than accumulating incrementally.
    this.baseStats = { ...this.stats };
    // RC-034: the run is a procedurally generated dungeon DUNGEON_SCREENS x the viewport. The seed
    // is logged so any layout bug is reproducible (generateLayout is deterministic per seed).
    // RC-042: the finale instead uses a fixed walled arena (no barriers/obstacles — clean march
    // lanes for the invader formation); buildTerrain below still raises the RC-038 perimeter walls.
    const seed = (Math.random() * 0xffffffff) >>> 0;
    if (this.finale) {
      console.info('[run] last stand arena');
      this.layout = this.finaleArenaLayout();
    } else {
      console.info(`[run] dungeon seed ${seed}`);
      this.layout = generateLayout(mulberry32(seed), this.scale.width, this.scale.height);
    }
    const { width, height } = this.layout;
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor(this.biome.visual?.ground ?? this.biome.tint);
    this.drawBackground(width, height);

    const player = this.add.image(this.layout.start.x, this.layout.start.y, this.heroSprite);
    player.setDisplaySize(34 * RUN_SCALE, 42 * RUN_SCALE);
    this.physics.add.existing(player);
    this.player = player as any;
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    // The sprite frame has transparent padding, so the default body is wider than the visible hero and
    // you'd snag on obstacle corners with room to spare. Shrink the body to ~64% of the display,
    // centered, so collisions match what you see. (shrinkBody sizes proportionally, not in raw px.)
    this.shrinkBody(this.player, 0.64);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.gems = this.physics.add.group();
    this.obstacles = this.physics.add.staticGroup();
    this.buildTerrain(this.layout);

    this.keys = {
      up: this.input.keyboard!.addKey('W'),
      down: this.input.keyboard!.addKey('S'),
      left: this.input.keyboard!.addKey('A'),
      right: this.input.keyboard!.addKey('D'),
    };

    // RC-031: right-click fires the loadout's active item at the world point under the cursor.
    // disableContextMenu so the browser menu doesn't eat the right-click. The handler is
    // scene-level but gated on rightButtonDown(), so it never collides with the left-click
    // pointerdown handlers on draft cards / buttons. Named const + shutdown cleanup prevents
    // duplicate handler accumulation if a future restart-pattern change re-runs create().
    this.input.mouse?.disableContextMenu();
    const onPointer = (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.useActive(p.worldX, p.worldY);
    };
    this.input.on('pointerdown', onPointer);
    this.events.once('shutdown', () => this.input.off('pointerdown', onPointer));

    // RC-043: enable a 2nd touch pointer so the joystick and a button can be held together
    // (Phaser tracks one touch pointer by default), then mount the touch overlay on touch devices.
    this.input.addPointer(2);
    if (isTouchDevice()) {
      this.touch = new TouchControls(this, {
        onActive: () => this.useActiveAtNearest(),
        onPause: () => this.togglePauseMenu(),
      });
    }

    // RC-039: ESC toggles the pause menu. Registered as a keydown listener (not a polled key) so the
    // edge fires once per press. Gated so it only acts when no draft overlay is up: a draft already
    // pauses via `paused`, and ESC must not close it (v1). The handler + shutdown cleanup mirror the
    // pointer handler above so a future restart that re-runs create() can't accumulate duplicates.
    const onEsc = () => this.togglePauseMenu();
    this.input.keyboard!.on('keydown-ESC', onEsc);
    this.events.once('shutdown', () => {
      this.touch?.destroy(); this.touch = undefined;
      this.input.keyboard?.off('keydown-ESC', onEsc);
      this.onPauseMenu?.(false); // RC-039: ensure the DOM overlay is hidden if the scene tears down while paused
    });

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.hitEnemy(b as any, e as any));
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.hitPlayer(e as any));
    this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => this.hitPlayerProjectile(b as any));
    this.physics.add.overlap(this.player, this.gems, (_p, g) => this.collectGem(g as any));
    this.foods = this.physics.add.group();
    this.physics.add.overlap(this.player, this.foods, (_p, f) => this.collectFood(f as any));
    // Obstacles block movement for both the player and the chasing enemies (they bunch up on them).
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);

    this.hud = this.add.text(12, 12, '',
      { fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setDepth(10).setScrollFactor(0);

    // RC-022 B3: a thin XP-progress bar under the two HUD lines — the single most important missing
    // feedback (how close the next draft is). Screen-fixed, origin top-left, fill scales 0..1.
    const XP_BAR_W = 220, XP_BAR_H = 8, xpBarY = 64;
    this.xpBarBg = this.add.rectangle(12, xpBarY, XP_BAR_W, XP_BAR_H, 0x101418, 0.85)
      .setOrigin(0, 0).setDepth(10).setScrollFactor(0).setStrokeStyle(1, 0x000000, 0.6);
    this.xpBarFill = this.add.rectangle(12, xpBarY, 0, XP_BAR_H, 0x4ea3ff, 1)
      .setOrigin(0, 0).setDepth(11).setScrollFactor(0);

    // RC-019: the biome's toughest enemy becomes an announced mini-boss — pull it from the random
    // spawn pool (the card threat-rating still reads it from the untouched biome.spawnTable).
    // RC-042: in the finale the "boss" is the mothership — bossId feeds the boss HP-bar label and
    // the formation controller does ALL spawning, so the placed roster / gems / POIs are skipped.
    this.bossId = this.finale ? 'invader_mothership' : apexEnemyId(this.biome.spawnTable);
    this.bossEnemy = null;
    this.bossHp = undefined;
    this.trickleBiome = { ...this.biome, spawnTable: bossFreeTable(this.biome.spawnTable, this.bossId) };

    if (this.finale) {
      // RC-042: open on a banner beat — wave 1 spawns when it elapses (updateFinale).
      this.finaleBeatMs = FINALE_BEAT_MS;
      this.showFinaleBanner('🛸 Wave 1/5');
      return;
    }

    // RC-034: the whole roster is placed at generation — no trickle. Mobs sleep until aggro'd;
    // the apex mini-boss is pre-placed at the far end with its RC-019 stats, announced on aggro.
    const placeRng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
    for (const p of enemyPlacements(placeRng, this.layout, this.expedition.tier,
      this.trickleBiome, this.bossId, BIOMES, ENEMIES, this.mutFx.effects.enemyCountMult)) {
      const e = this.spawnEnemyAt(ENEMIES[p.id], p.x, p.y);
      e.setData('asleep', true);
      if (p.isBoss) {
        const maxHp = ENEMIES[p.id].baseHp * BOSS_HP_MULT;
        e.setData('hp', maxHp);
        e.setData('maxHp', maxHp);
        e.setData('isBoss', true);
        // RC-009: bosses use the steeper boss curve (1×→6×), not the regular curve stacked on top.
        // Re-set contactDamage over spawnEnemyAt's regular-mult value.
        const def = ENEMIES[p.id];
        e.setData('contactDamage', Math.round(def.contactDamage * bossDamageMult(this.expedition.tier)));
        // RC-019 playtest: apex boss rendered at 2× size; re-apply shrinkBody so the physics
        // body scales with the new display size (shrinkBody uses source-frame px, so body world
        // size = sourceW * 0.72 * scaleX — doubling scaleX via setDisplaySize doubles the body).
        e.setDisplaySize(def.displaySize.w * RUN_SCALE * 2, def.displaySize.h * RUN_SCALE * 2);
        this.shrinkBody(e, 0.72);
        this.bossEnemy = e;
      }
    }
    for (const g of gemPlacements(placeRng, this.layout, this.expedition.tier, this.biome)) {
      this.dropGem(g.x, g.y, g.resource);
    }

    // RC-026: roll + place this dungeon's 2 opt-in POIs with a seed-derived rng kept on the scene
    // (shrine-wave composition and jackpot rolls reuse it, so a seed reproduces its POIs end-to-end).
    this.dungeonRng = mulberry32((seed ^ 0x85ebca6b) >>> 0);
    this.placePois();
  }

  /** RC-026: place each rolled POI in a far quadrant (best-of-N farthest open point ≥ 1.2 screen
   *  widths from start), obstacle-safe via dungeonPopulate's openPoint sampler. Shrine/altar are
   *  physics-less structures; the courier (Task 8) is spawned here as an enemy with poiCourier data. */
  private placePois() {
    const minDist = this.scale.width * 1.2;
    for (const id of rollPois(this.dungeonRng)) {
      const def = POIS[id as PoiId];
      const { x, y } = this.farPoiPoint(minDist);
      this.placePoi(def, x, y);
    }
  }

  /** Materialise one POI. Shrine/altar are physics-less structures rendered here; the courier is an
   *  enemy whose spawn + flee/despawn/jackpot lifecycle is wired in Task 8 via spawnCourierAt(). The
   *  `pois` entry's obj is the structure image (or the courier sprite); indicators key off the stored
   *  x/y, which all POIs carry. */
  private placePoi(def: PoiDef, x: number, y: number) {
    if (def.id === 'courier') {
      const e = this.spawnCourierAt(x, y);
      this.pois.push({ def, x, y, obj: e, consumed: false });
      return;
    }
    const size = (def.id === 'shrine' || def.id === 'altar') ? 48 : 34;
    const obj = this.add.image(x, y, def.sprite).setDepth(8);
    obj.setDisplaySize(size * RUN_SCALE, size * RUN_SCALE);
    this.pois.push({ def, x, y, obj, consumed: false });
  }

  /** RC-026: spawn the treasure courier as a sleeping flee enemy at the POI point. Tagged poiCourier
   *  so it is win-exempt and pays its jackpot (not its `drop`) on catch. Its speed is set from the
   *  PLAYER's base speed (180 × RUN_SCALE) × COURIER_SPEED_MULT — catchable with routing regardless of
   *  the player's passives/mutators. The despawn timer starts on first wake (see wakeEnemy). */
  private spawnCourierAt(x: number, y: number): any {
    const e = this.spawnEnemyAt(ENEMIES.treasure_courier, x, y);
    e.setData('asleep', true);
    e.setData('poiCourier', true);
    e.setData('speed', 180 * RUN_SCALE * COURIER_SPEED_MULT);
    return e;
  }

  /** Best-of-N sample for a far-quadrant, obstacle-safe POI point. Mirrors the boss-lair sampler but
   *  prefers the first candidate clearing `minDist` from start; falls back to the farthest seen. */
  private farPoiPoint(minDist: number): { x: number; y: number } {
    let best = openPoint(this.dungeonRng, this.layout, 80);
    let bestD = Math.hypot(best.x - this.layout.start.x, best.y - this.layout.start.y);
    for (let i = 0; i < 24; i++) {
      const p = openPoint(this.dungeonRng, this.layout, 80);
      const d = Math.hypot(p.x - this.layout.start.x, p.y - this.layout.start.y);
      if (d > bestD) { bestD = d; best = p; }
      if (bestD >= minDist) break;
    }
    return best;
  }

  /** RC-026: per-frame POI activation. Walking onto an unconsumed shrine summons its guardian wave
   *  (awake + aggroed — the wager); walking onto an altar grants a free catalyst and wakes the area.
   *  The courier is an enemy, so it has no walk-over activation here. */
  private updatePois() {
    const reach = 60 * RUN_SCALE;
    for (const poi of this.pois) {
      if (poi.consumed) continue;
      if (poi.def.id === 'courier') { this.updateCourierDespawn(poi); continue; }
      if (!withinRadius(this.player.x, this.player.y, poi.x, poi.y, reach)) continue;
      if (poi.def.id === 'shrine') this.activateShrine(poi);
      else if (poi.def.id === 'altar') this.activateAltar(poi);
    }
  }

  /** RC-026: a live courier past its despawnAt fades out and is destroyed WITHOUT jackpot or kill
   *  credit — it escaped. Marks the POI consumed so its edge indicator dies with it. */
  private updateCourierDespawn(poi: { obj: any; consumed: boolean }) {
    const e = poi.obj;
    if (!e?.active || poi.consumed) return;
    const despawnAt = e.getData('despawnAt');
    if (despawnAt === undefined || this.elapsed < despawnAt) return;
    poi.consumed = true; // stops the indicator + re-entry; the catch path also checks getData
    this.tweens.add({ targets: e, alpha: 0, duration: 300, onComplete: () => { if (e.active) e.destroy(); } });
  }

  /** Shrine: consume the structure, then spawn the tier-scaled guardian wave awake + aggroed around
   *  it. The wave's uids are tracked; when the last falls (applyDamageToEnemy), the culture jackpot
   *  bursts at the shrine. Wave COMPOSITION uses the seeded dungeonRng (reproducible); only spawn
   *  jitter uses Math.random. */
  private activateShrine(poi: { def: PoiDef; x: number; y: number; obj: any; consumed: boolean }) {
    poi.consumed = true;
    poi.obj?.setTint?.(0x444444); // dark the awakened structure
    const wave = shrineWave(this.dungeonRng, this.biome.spawnTable, this.expedition.tier);
    this.shrineWaveIds = new Set<string>();
    for (const id of wave) {
      if (!ENEMIES[id]) continue;
      const ang = Math.random() * Math.PI * 2;
      const r = (140 + Math.random() * 120) * RUN_SCALE;
      const e = this.spawnEnemyAt(ENEMIES[id], poi.x + Math.cos(ang) * r, poi.y + Math.sin(ang) * r);
      e.setData('asleep', true);
      this.wakeEnemy(e); // awake + aggroed — the wager
      this.shrineWaveIds.add(e.getData('uid'));
    }
    this.shrinePending = { x: poi.x, y: poi.y };
    playSfx('boss-arrival');
    // Defensive: if the biome table somehow yielded no spawnable guardians, pay immediately so the
    // shrine never silently swallows its reward (shrineWaveIds empty + shrinePending set otherwise
    // strands the jackpot). Real biome tables always spawn a wave, so this is belt-and-suspenders.
    if (this.shrineWaveIds.size === 0) this.payShrineJackpot();
  }

  /** Altar: consume → +1 catalyst (free fusion material) + a wake sweep over ~1.5 screens, so the
   *  reward is paid for by a sudden surge of awakened defenders. */
  private activateAltar(poi: { def: PoiDef; x: number; y: number; obj: any; consumed: boolean }) {
    poi.consumed = true;
    poi.obj?.setTint?.(0x444444);
    this.catalysts += 1;
    playSfx('gem-pickup', { semitones: 12 });
    const wakeR = this.scale.width * ALTAR_WAKE_SCREENS;
    (this.enemies.getChildren() as any[]).forEach((e) => {
      if (e.active && withinRadius(poi.x, poi.y, e.x, e.y, wakeR)) this.wakeEnemy(e);
    });
    this.cameras.main.shake(140, 0.006);
  }

  /** RC-026: when a shrine-wave enemy dies, drop it from the tracking set; on the last kill, burst
   *  the culture jackpot at the shrine. Called from applyDamageToEnemy's death branch by uid. */
  private onShrineWaveDeath(uid: string) {
    if (!this.shrineWaveIds.has(uid)) return;
    this.shrineWaveIds.delete(uid);
    if (this.shrineWaveIds.size === 0) this.payShrineJackpot();
  }

  /** Burst the shrine's culture jackpot at the pending shrine point, then clear it. No-op if no
   *  shrine is pending. */
  private payShrineJackpot() {
    const at = this.shrinePending;
    if (!at) return;
    for (const g of shrineJackpot(this.expedition.tier)) {
      const ang = Math.random() * Math.PI * 2, rr = 30 + Math.random() * 60;
      this.dropGem(at.x + Math.cos(ang) * rr, at.y + Math.sin(ang) * rr, g.resource, { valueOverride: g.value });
    }
    this.shrinePending = null;
    playSfx('gem-pickup', { semitones: 12 });
  }

  /** RC-026: burst the courier's big MIXED jackpot around (x, y). Shared by the damage-kill death
   *  branch and the contact-catch path in hitPlayer (stealth catch). Composition uses dungeonRng. */
  private payCourierJackpot(x: number, y: number) {
    for (const g of courierJackpot(this.dungeonRng, this.expedition.tier)) {
      const ang = Math.random() * Math.PI * 2, rr = 30 + Math.random() * 60;
      this.dropGem(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, g.resource, { valueOverride: g.value });
    }
    playSfx('gem-pickup', { semitones: 12 });
  }

  /** RC-026: one reused screen-fixed icon per off-camera POI, clamped to the screen edge toward the
   *  POI's world position. Hidden when the POI is on-camera, consumed, or its object is gone
   *  (courier despawn, Task 8). Depth 58 sits above the HUD strip but below banners. */
  private updatePoiIndicators() {
    const cam = this.cameras.main;
    const view = cam.worldView;
    const { width, height } = this.scale;
    const pad = 22;
    for (const poi of this.pois) {
      const gone = poi.consumed || (poi.obj && poi.obj.active === false);
      const onScreen = !gone &&
        poi.x >= view.x && poi.x <= view.x + view.width &&
        poi.y >= view.y && poi.y <= view.y + view.height;
      if (gone || onScreen) {
        poi.indicator?.setVisible(false);
        continue;
      }
      if (!poi.indicator) {
        poi.indicator = this.add.text(0, 0, poi.def.icon, { fontSize: '24px', stroke: '#000', strokeThickness: 4 })
          .setOrigin(0.5).setScrollFactor(0).setDepth(58);
      }
      // Screen-space vector from screen center toward the POI, scaled out to the padded edge so the
      // icon sits on whichever edge (vertical or horizontal) the direction hits first.
      const sx = poi.x - cam.scrollX, sy = poi.y - cam.scrollY;
      const cx = width / 2, cy = height / 2;
      const dx = sx - cx, dy = sy - cy;
      const maxX = (width / 2) - pad, maxY = (height / 2) - pad;
      const scale = Math.min(maxX / Math.max(Math.abs(dx), 1e-6), maxY / Math.max(Math.abs(dy), 1e-6));
      poi.indicator.setVisible(true).setPosition(cx + dx * scale, cy + dy * scale);
    }
  }

  /** Biome ground + grid + specks from the biome palette (RC-021), falling back to tint/white. */
  private drawBackground(width: number, height: number) {
    const v = this.biome.visual;
    const gridColor = v ? Phaser.Display.Color.HexStringToColor(v.grid).color : 0xffffff;
    const speckColor = v ? Phaser.Display.Color.HexStringToColor(v.speck).color : 0xffffff;

    const grid = this.add.graphics().setDepth(-10);
    grid.lineStyle(1, gridColor, v ? 0.16 : 0.05);   // hued tints read at higher alpha than white
    const step = 96;
    for (let x = 0; x <= width; x += step) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += step) grid.lineBetween(0, y, width, y);

    const specks = Math.min(1800, Math.round((width * height) / 9000));
    for (let i = 0; i < specks; i++) {
      this.add.circle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 2), speckColor, v ? 0.4 : 0.06).setDepth(-9);
    }
  }

  /** RC-034: materialise the generated layout — perimeter walls, chokepoint barriers (river with a
   *  bridge deck / wall with a gateway opening), and the biome-themed obstacle props. All collision
   *  bodies join this.obstacles, so the existing player/enemy colliders cover them. */
  private buildTerrain(layout: DungeonLayout) {
    const { width, height } = layout;
    const t = WALL_THICKNESS;
    this.addStaticRect(width / 2, t / 2, width, t, 0x000000, 0.55);            // north wall
    this.addStaticRect(width / 2, height - t / 2, width, t, 0x000000, 0.55);  // south wall
    this.addStaticRect(t / 2, height / 2, t, height, 0x000000, 0.55);         // west wall
    this.addStaticRect(width - t / 2, height / 2, t, height, 0x000000, 0.55); // east wall

    for (const b of layout.barriers) this.buildBarrier(b, layout);
    for (const o of layout.obstacles) this.addObstacleProp(o.x, o.y, o.r);
  }

  /** A filled, collidable static rectangle registered into the obstacles group. */
  private addStaticRect(x: number, y: number, w: number, h: number, color: number, alpha: number) {
    const rect = this.add.rectangle(x, y, w, h, color, alpha).setDepth(-1);
    rect.setStrokeStyle(2, 0xffffff, 0.08);
    this.physics.add.existing(rect, true);
    this.obstacles.add(rect as any);
  }

  /** One chokepoint: two collidable band segments with the opening between them. Rivers get a
   *  walkable bridge deck across the gap; walls read as a broken gateway (the opening itself).
   *  v1 generation emits vertical bands only — see dungeonGen. */
  private buildBarrier(b: Barrier, layout: DungeonLayout) {
    const color = b.kind === 'river' ? 0x2f6f9f : 0x1a1a22;
    const alpha = b.kind === 'river' ? 0.8 : 0.85;
    const segments = [
      { from: 0, to: b.gap.start },
      { from: b.gap.end, to: layout.height },
    ];
    for (const s of segments) {
      const len = s.to - s.from;
      if (len <= 0) continue;
      this.addStaticRect(b.pos, s.from + len / 2, BARRIER_THICKNESS, len, color, alpha);
    }
    if (b.kind === 'river') {
      this.add.rectangle(b.pos, (b.gap.start + b.gap.end) / 2,
        BARRIER_THICKNESS + 24, b.gap.end - b.gap.start, 0x8a6a42, 0.9)
        .setDepth(-2).setStrokeStyle(2, 0x000000, 0.3);
    }
  }

  /** One biome-themed obstacle prop — sprite + the rc-017 inset-circle body (visuals unchanged
   *  from the pre-RC-034 scatter; only the position source moved to the seeded layout). */
  private addObstacleProp(x: number, y: number, r: number) {
    const set = this.biome.visual?.obstacles ?? [];
    let obj: Phaser.GameObjects.GameObject & { body: Phaser.Physics.Arcade.Body };
    if (set.length) {
      const id = set[Phaser.Math.Between(0, set.length - 1)];
      const img = this.add.image(x, y, id).setDepth(-1);
      img.setDisplaySize(r * 2, r * 2);
      obj = img as any;
    } else {
      const rock = this.add.ellipse(x, y, r * 2, r * 1.6, 0x000000, 0.4).setDepth(-1);
      rock.setStrokeStyle(2, 0xffffff, 0.08);
      obj = rock as any;
    }
    this.physics.add.existing(obj, true);
    const cr = r * 0.8;
    (obj.body as unknown as Phaser.Physics.Arcade.StaticBody).setCircle(cr, r - cr, r - cr);
    this.obstacles.add(obj);
  }

  update(_t: number, deltaMs: number) {
    // Guard the scene-restart race: a queued update() can fire after the previous
    // scene was stopped but before create() rebuilds the player. (Not reachable in
    // normal play — a run is always stopped before the next starts — but cheap insurance.)
    // Drain a deferred run-completion first (set by finish() from inside a collision callback), now
    // that the physics step has unwound — safe to stop the scene and tear down groups here.
    if (this.pendingComplete) {
      const r = this.pendingComplete;
      this.pendingComplete = null;
      this.onComplete(r);
      return;
    }
    this.touch?.update();
    if (this.paused || !this.player?.body) return;
    const dt = deltaMs;
    // Once the dungeon is cleared we hand off to the Zone-Cleared ceremony, which runs its own
    // trimmed loop — just sweep gems in — until it finishes the run.
    if (this.ceremony) { this.updateCeremony(dt); return; }
    this.elapsed += dt;

    const speed = 180 * RUN_SCALE * this.stats.moveSpeedMult;
    const b = this.player.body;
    b.setVelocity(0);
    const tv = this.touch?.moveVector();
    if (tv && (tv.x !== 0 || tv.y !== 0)) {
      // Touch: analog joystick (components already in [-1, 1]).
      b.setVelocity(tv.x * speed, tv.y * speed);
      this.lastMoveDir = { x: tv.x, y: tv.y };
    } else {
      // Desktop: unchanged WASD behavior.
      if (this.keys.left.isDown) b.setVelocityX(-speed);
      if (this.keys.right.isDown) b.setVelocityX(speed);
      if (this.keys.up.isDown) b.setVelocityY(-speed);
      if (this.keys.down.isDown) b.setVelocityY(speed);
      if (b.velocity.x !== 0 || b.velocity.y !== 0) {
        this.lastMoveDir = { x: Math.sign(b.velocity.x), y: Math.sign(b.velocity.y) };
      }
    }

    // RC-038: clamp the player every frame — a wall-collision bounce at the border can displace him
    // past the perimeter; re-seat him inside the playable field before anything reads his position.
    const pc = clampToPlayable(this.player.x, this.player.y, this.layout.width, this.layout.height, WALL_THICKNESS + 24);
    if (pc.x !== this.player.x || pc.y !== this.player.y) this.player.body.reset(pc.x, pc.y);

    for (const w of this.equipped) {
      this.weaponCooldowns[w.id] = (this.weaponCooldowns[w.id] ?? 0) - dt;
      if (this.weaponCooldowns[w.id] <= 0) {
        const shot = weaponShot(defOf(w), w.level, this.stats.damageMult);
        this.fireWeapon(shot, w.id);
        this.weaponCooldowns[w.id] =
          shot.cooldownMs / (this.stats.fireRateMult + bloodRushBonus(this.elapsed, this.bloodRushUntil));
      }
    }

    if (this.bossHp) {
      if (this.bossEnemy?.active) this.updateBossHpBar();
      else this.destroyBossHpBar();
    }

    (this.enemies.getChildren() as any[]).forEach((e) => {
      // RC-042: formation members + the mothership are positioned by the finale controller below —
      // the chase/behavior movement must not fight it.
      if (e.getData('finaleControlled')) return;
      if (e.getData('asleep')) {
        const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
        if (d > AGGRO_RADIUS) { e.body.setVelocity(0, 0); return; }
        this.wakeEnemy(e);
      }
      this.updateEnemyMovement(e, dt);
    });
    this.updateEnemyFire(dt);
    this.updateEnemyProfiles(dt); // RC-040: telegraphed attack profiles (slash/beam/mortar/…)
    this.updateEnemyPatches();    // RC-040: enemy ground hazards tick the player
    if (this.finale) this.updateFinale(dt); // RC-042: formation march / mothership phases / victory

    // RC-038 containment failsafe: ~once a second, any enemy that has drifted outside the playable
    // field (knockback/tunneling, whatever the cause) is hard-reset back inside via body.reset —
    // re-seating the body cleanly rather than nudging velocity. This is the soft-lock guard: a
    // strayed last enemy re-enters and becomes killable, so the clear can always complete.
    if (this.elapsed - this.lastSweepMs >= 1000) {
      this.lastSweepMs = this.elapsed;
      const { width: ww, height: wh } = this.layout;
      const m = WALL_THICKNESS + 24;
      (this.enemies.getChildren() as any[]).forEach((e) => {
        if (!e.active) return;
        const c = clampToPlayable(e.x, e.y, ww, wh, m);
        if (c.x !== e.x || c.y !== e.y) e.body.reset(c.x, c.y);
      });
    }

    // RC-026: POI proximity activation (shrine wave / altar wake) + off-screen edge indicators.
    this.updatePois();
    this.updatePoiIndicators();

    this.vacuumGems();

    // --- Orbit projectiles: ride a ring around the player (RC-015) ---
    (this.bullets.getChildren() as any[]).forEach((b) => {
      if (b.getData('behavior') !== 'orbit') return;
      const angle = orbitAngle(b.getData('index'), b.getData('count'), this.elapsed);
      const pos = orbitPosition(this.player.x, this.player.y, ORBIT_RING, angle);
      b.body.reset(pos.x, pos.y);
    });

    // --- Lob projectiles: arc to a target and detonate on landing (RC-015) ---
    for (let i = this.lobs.length - 1; i >= 0; i--) {
      const lob = this.lobs[i];
      lob.elapsed += dt;
      const t = lobProgress(lob.elapsed, lob.flightMs);
      const ground = lobGroundPosition(lob.start, lob.target, t);
      lob.img.setPosition(ground.x, ground.y - lobArcHeight(t) * RUN_SCALE);
      const apex = 1 + 0.5 * (lobArcHeight(t) / LOB_PEAK_HEIGHT);
      lob.img.setDisplaySize(PROJ_SIZE * apex, PROJ_SIZE * apex);
      if (t >= 1) {
        const onHit = lob.onHit;
        this.detonate(lob.target.x, lob.target.y, lob.damage, (onHit.explode ?? LOB_BLAST_RADIUS) * RUN_SCALE);
        // RC-031 VFX: the verb's impact style + shake class fire at the landing point.
        this.kitImpact(lob.kit, lob.target.x, lob.target.y);
        // RC-031 zone (dynamite): the blast also leaves a lingering ticking field.
        if (onHit.zoneMs) {
          this.spawnPatch(lob.target.x, lob.target.y, ZONE_RADIUS * RUN_SCALE,
            onHit.zoneMs, lob.damage * 0.4, lob.kit.tint);
        }
        lob.img.destroy();
        this.lobs.splice(i, 1);
      }
    }

    // --- RC-031 boomerang/homing steering: bullets carry their own trajectory each frame. ---
    (this.bullets.getChildren() as any[]).forEach((b) => {
      const traj = b.getData('trajectory');
      if (traj === 'boomerang') {
        let phase = b.getData('phase');
        if (phase === 'out' && this.elapsed - b.getData('bornMs') >= BOOMERANG_OUT_MS) {
          phase = 'return'; b.setData('phase', phase);
        }
        const aim = b.getData('aim');
        const v = boomerangVelocity(
          phase, aim.x, aim.y, this.player.x, this.player.y, b.x, b.y,
          b.getData('speed') ?? 300 * RUN_SCALE,
        );
        b.body.setVelocity(v.vx, v.vy);
        if (phase === 'return' && Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y) < 24 * RUN_SCALE) {
          b.destroy();
        }
      } else if (traj === 'homing') {
        const t = this.nearestEnemy() as any;
        if (t) {
          const v = homingVelocity(
            b.body.velocity.x, b.body.velocity.y, b.x, b.y, t.x, t.y,
            b.getData('speed') ?? 360 * RUN_SCALE, dt,
          );
          b.body.setVelocity(v.vx, v.vy);
        }
      }
    });

    // --- RC-031 lingering damage fields (trail patches + zones) tick on enemies in range. ---
    for (let i = this.patches.length - 1; i >= 0; i--) {
      const p = this.patches[i];
      const age = this.elapsed - p.bornMs;
      if (age >= p.lingerMs) { p.gfx.destroy(); this.patches.splice(i, 1); continue; }
      p.gfx.setAlpha(0.28 * (1 - age / p.lingerMs) + 0.08);
      (this.enemies.getChildren() as any[]).forEach((e) => {
        if (!e.active || !withinRadius(p.x, p.y, e.x, e.y, p.radius)) return;
        const last = p.lastTick.get(e) ?? -Infinity;
        if (this.elapsed - last >= ZONE_TICK_MS) {
          p.lastTick.set(e, this.elapsed);
          this.applyDamageToEnemy(e, p.tickDamage);
        }
      });
    }

    // RC-031 passives regen, now drawing from the RC-025 lifetime budget (25% of CURRENT maxHp).
    const regenned = regenTick(this.stats.regenHps, dt, this.regenHealed, this.stats.maxHp, this.stats.hp);
    if (regenned > 0) {
      this.stats.hp += regenned;
      this.regenHealed += regenned;
    }

    // RC-025 Overcharge: refund one SPENT active charge per period (never exceeds the recompute max,
    // because consumption is tracked via chargesSpent — see refreshStatsFromPassives).
    if (this.hasRelic('overcharge')) {
      this.overchargeMs += dt;
      if (this.overchargeMs >= OVERCHARGE_PERIOD_MS) {
        this.overchargeMs -= OVERCHARGE_PERIOD_MS;
        if (this.chargesSpent > 0) {
          this.chargesSpent -= 1;
          this.stats.activeCharges += 1;
        }
      }
    }

    this.hud.setText(
      `HP ${Math.ceil(this.stats.hp)}/${this.stats.maxHp}  Lv${this.stats.level}  ` +
      `🧭${this.collected.exploration} 🔬${this.collected.science} 🏭${this.collected.industry} 🎭${this.collected.culture}  ` +
      `☠ ${this.kills}  ·  ${this.enemies.countActive(true)} left\n` +
      this.finaleHudTag() + this.loadoutHudLine(),
    );
    // RC-022 B3: XP bar fill tracks progress to the next level (shares xpForLevel via xpProgress).
    this.xpBarFill.width = this.xpBarBg.width * xpProgress(this.stats);

    // RC-034: the dungeon is cleared when every placed enemy (and any splitter children) is dead.
    // RC-026: the treasure courier is exempt — you can clear the dungeon while it's still fleeing.
    // RC-042: NOT in the finale — the field is legitimately empty between waves (and before wave 1);
    // the finale's victory ceremony is started explicitly by updateFinale on mothership death.
    const remaining = (this.enemies.getChildren() as any[])
      .filter((e) => e.active && !e.getData('poiCourier')).length;
    if (remaining === 0 && !this.finale) this.startCeremony();
  }

  /** RC-025: does the (single) relic slot hold this relic? */
  private hasRelic(id: string): boolean { return this.relic === id; }

  /** RC-031 loadout HUD: second line — weapons + levels, passive icons + levels, the active
   *  icon × charges (absent when no active is equipped), and catalysts. */
  private loadoutHudLine(): string {
    const loadout = this.equipped.map((w) => `${defOf(w).name} L${w.level}`).join(' | ');
    const passiveStr = this.passives.map((p) => `${passiveDefOf(p).icon}${p.level}`).join('');
    const relicStr = this.relic ? `〔${RELICS[this.relic].icon}〕` : '';
    const activeStr = this.activeId ? `${ACTIVES[this.activeId].icon}×${this.stats.activeCharges}` : '';
    const catalystStr = this.catalysts > 0 ? `⚗️×${this.catalysts}` : '';
    // RC-029: echo active wagers + the haul multiplier they earn.
    const mutStr = this.mutatorIds.length
      ? this.mutatorIds.map((id) => MUTATORS[id]?.icon ?? '?').join('') + `×${this.mutFx.rewardMult.toFixed(2)}`
      : '';
    return [loadout, passiveStr, relicStr, activeStr, catalystStr, mutStr].filter((s) => s).join('   ');
  }

  /**
   * Gems are vacuumed in only within pickupRadius — outside it they stay put, so collection is
   * positional and the radius (widened by the Lodestone passive) actually matters. The Zone-Cleared
   * ceremony reuses this with a world-sized radius (and a higher speed) to sweep everything in.
   */
  private vacuumGems(speed = 340) {
    (this.gems.getChildren() as any[]).forEach((g) => {
      const d = Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y);
      if (d < this.stats.pickupRadius * RUN_SCALE) {
        this.physics.moveToObject(g, this.player, speed * RUN_SCALE);
      } else {
        g.body.setVelocity(0, 0);
      }
      // RC-022 B5: a top-tier gem's glow rides along as it's magnetted in.
      const glow = g.getData('glow');
      if (glow?.active) glow.setPosition(g.x, g.y);
    });
    // RC-025: food pickups magnet exactly like gems.
    (this.foods.getChildren() as any[]).forEach((f) => {
      const d = Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y);
      if (d < this.stats.pickupRadius * RUN_SCALE) this.physics.moveToObject(f, this.player, speed * RUN_SCALE);
      else f.body.setVelocity(0, 0);
    });
  }

  /**
   * Dungeon cleared: flash a "Zone Cleared" banner, wipe every non-boss enemy (each drops its gem as a
   * parting reward), and crank the pickup radius past the screen edges so the next few seconds magnet
   * every gem in before the run summary. Bosses (data flag 'isBoss') are spared for future fights.
   */
  private startCeremony() {
    if (this.ceremony || this.finished) return;
    this.ceremony = true;
    this.ceremonyMs = CEREMONY_MS;
    this.destroyBossHpBar();
    playSfx('zone-cleared'); // RC-020

    (this.enemies.getChildren() as any[]).slice().forEach((e) => {
      if (e.getData('isBoss')) return;
      this.dropGem(e.x, e.y, e.getData('drop'));
      this.stopChargerTell(e);
      e.destroy();
    });
    // Catalysts on the floor auto-collect at the ceremony — the boss usually dies last and the
    // player is frozen here, so a walk-over token would otherwise be unreachable (RC-031 review).
    let autocollected = 0;
    for (const tok of this.catalystTokens) {
      if (tok.active) { tok.destroy(); this.catalysts += 1; autocollected += 1; }
    }
    if (autocollected > 0) playSfx('gem-pickup', { semitones: 12 });
    this.catalystTokens = [];
    // Freeze the hero and magnet radius out past the screen so every gem flies in.
    this.player.body.setVelocity(0, 0);
    this.stats.pickupRadius = this.layout.width + this.layout.height;

    this.showZoneClearedBanner();
  }

  private updateCeremony(dt: number) {
    this.player.body.setVelocity(0, 0);
    this.vacuumGems(2400);
    this.hud.setText(
      `${this.biome.name} Cleared!   ` +
      `🧭${this.collected.exploration} 🔬${this.collected.science} 🏭${this.collected.industry} 🎭${this.collected.culture}`,
    );
    this.ceremonyMs -= dt;
    if (this.ceremonyMs <= 0) this.finish(false);
  }

  private showZoneClearedBanner() {
    const { width, height } = this.scale;
    this.cameras.main.flash(320, 70, 200, 110); // green wash
    const txt = this.add.text(width / 2, height / 2 - 40, `${this.biome.name} Cleared!`, {
      fontSize: '48px', color: '#ffffff', fontStyle: 'bold', stroke: '#0b2', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(40).setScale(0.4).setAlpha(0).setScrollFactor(0);
    this.tweens.add({ targets: txt, scale: 1, alpha: 1, duration: 360, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: txt, alpha: 0, delay: CEREMONY_MS - 700, duration: 650,
      onComplete: () => txt.destroy(),
    });
  }

  /** RC-031 VFX: resolve a shot's screen signature. Hybrids keep the body archetype's motion/shake
   *  but borrow tint + impact from their palette parent (first base ≠ body); base weapons use their
   *  own kit. Drives projectile tint, patch tint, impact style and shake class. */
  private kitFor(shot: WeaponShot): VfxKit {
    const body = shot.archetype;
    if (shot.bases.length >= 2) {
      const palette = shot.bases.find((b) => b !== body) ?? body;
      return kitForHybrid(body, palette);
    }
    return VFX_KITS[body];
  }

  /** Apply a kit's impact style + shake class at (x, y). 0 → no shake, 1 → light, 2 → heavy. */
  private kitImpact(kit: VfxKit, x: number, y: number) {
    if (kit.impact === 'ring') {
      const ring = this.add.circle(x, y, 14 * RUN_SCALE, kit.tint, 0.45).setDepth(24).setScale(0.3);
      this.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 220, ease: 'Power2', onComplete: () => ring.destroy() });
    } else if (kit.impact === 'sparks') {
      for (let s = 0; s < 4; s++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = this.add.circle(x, y, 2.2, kit.tint, 0.95).setDepth(26);
        this.tweens.add({
          targets: sp, x: x + Math.cos(ang) * 14, y: y + Math.sin(ang) * 14, alpha: 0,
          duration: 180, onComplete: () => sp.destroy(),
        });
      }
    } else {
      // 'flash' — a brief tinted pop at the impact point.
      const f = this.add.circle(x, y, 9 * RUN_SCALE, kit.tint, 0.6).setDepth(26);
      this.tweens.add({ targets: f, scale: 0.2, alpha: 0, duration: 150, onComplete: () => f.destroy() });
    }
    if (kit.shake === 1) this.cameras.main.shake(80, 0.003);
    else if (kit.shake === 2) {
      if (this.elapsed - this.lastHeavyShakeMs >= 120) {
        this.lastHeavyShakeMs = this.elapsed;
        this.cameras.main.shake(140, 0.006);
      }
    }
  }

  /** RC-022 B6: a brief tinted circle at the player's muzzle when a projectile volley fires, nudged
   *  a few px along the aim so it reads as the gun's flash. Self-destroying (alpha-out ~80ms).
   *  Throttled to one flash per ~90ms so rapid-fire weapons don't spam overlapping flashes. */
  private muzzleFlash(kit: VfxKit, aimAngle: number) {
    if (this.elapsed - this.lastFlashMs < 90) return;
    this.lastFlashMs = this.elapsed;
    const off = 10 * RUN_SCALE;
    const fx = this.player.x + Math.cos(aimAngle) * off;
    const fy = this.player.y + Math.sin(aimAngle) * off;
    const flash = this.add.circle(fx, fy, 8, kit.tint, 0.85)
      .setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash, scale: 1.4, alpha: 0, duration: 80,
      onComplete: () => flash.destroy(),
    });
  }

  private fireWeapon(shot: WeaponShot, weaponId: string) {
    const kit = this.kitFor(shot);
    switch (shot.trajectory) {
      case 'orbit': this.summonOrbit(shot, weaponId, kit); return;      // persistent ring — no per-refresh shot sound
      case 'lob':   playSfx('shoot'); this.fireLob(shot, kit); return;  // zone lands → spawnPatch via lob landing
      case 'trail': this.dropTrailPatch(shot, kit); return;             // no projectile at all — burns the ground
      default: break; // straight / boomerang / homing / chain fire projectiles below
    }
    playSfx('shoot'); // RC-020 (recipe self-throttles)
    const target = this.nearestEnemy() as any;
    const baseAngle = target
      ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y)
      : -Math.PI / 2;
    // RC-022 B6: a small muzzle flash at the player when a volley fires (projectile verbs only —
    // orbit/trail/lob returned above). Throttled so rapid-fire can't spam flashes.
    this.muzzleFlash(kit, baseAngle);
    for (let i = 0; i < shot.count; i++) {
      // fan the volley around the aim angle when there is more than one projectile
      const offset = shot.count > 1
        ? (i - (shot.count - 1) / 2) * (shot.spread / (shot.count - 1))
        : 0;
      const angle = baseAngle + offset;
      const bullet = this.add.image(this.player.x, this.player.y, shot.sprite) as any;
      bullet.setDisplaySize(12 * RUN_SCALE, 12 * RUN_SCALE);
      bullet.setTint(kit.tint); // RC-031 VFX: projectile reads its verb's palette
      this.physics.add.existing(bullet);
      this.bullets.add(bullet);
      bullet.setData('damage', shot.damage);
      bullet.setData('kit', kit); // RC-031 VFX: impact style + shake fire on hit
      bullet.setData('onHit', shot.onHit);
      bullet.setData('pierce', shot.onHit.pierce ?? 0);
      bullet.setData('ignoresArmor', shot.onHit.ignoreArmor ?? false);
      bullet.setData('hitIds', new Set<string>());
      bullet.setData('trajectory', shot.trajectory);
      bullet.setData('speed', shot.speed * RUN_SCALE); // boomerang/homing steering read this
      if (shot.trajectory === 'boomerang') {
        bullet.setData('phase', 'out');
        bullet.setData('aim', { x: Math.cos(angle), y: Math.sin(angle) });
        bullet.setData('bornMs', this.elapsed);
      }
      bullet.body.setVelocity(Math.cos(angle) * shot.speed * RUN_SCALE, Math.sin(angle) * shot.speed * RUN_SCALE);
      // Range = speed × life; earlier weapons get a shorter life so their shots don't cross the field.
      // Boomerangs despawn by returning to the player (in update), so they skip the lifeMs timer.
      if (shot.trajectory !== 'boomerang') this.time.delayedCall(shot.lifeMs, () => bullet.destroy());
    }
  }

  /** Trail weapons (flame_jet/flamethrower, speed 0) burn the ground behind you — a patch at your
   *  feet each cooldown. The weapon's cooldownMs IS the drop cadence; no extra timer needed. */
  private dropTrailPatch(shot: WeaponShot, kit: VfxKit) {
    this.spawnPatch(this.player.x, this.player.y, TRAIL_RADIUS * RUN_SCALE,
      TRAIL_LINGER_MS, shot.damage, kit.tint);
  }

  /** Spawn a lingering damage field (trail patch / zone). tickDamage applies per ZONE_TICK_MS per
   *  enemy. World-anchored — no scrollFactor(0). */
  private spawnPatch(x: number, y: number, radius: number, lingerMs: number, tickDamage: number, tint: number) {
    const gfx = this.add.circle(x, y, radius, tint, 0.28).setDepth(6);
    this.patches.push({ x, y, bornMs: this.elapsed, lingerMs, radius, tickDamage, lastTick: new Map(), gfx, tint });
  }

  /** RC-031: fire the loadout's right-click active at (x, y) in WORLD space (so it lands under the
   *  cursor on the scrolled camera). Spends one charge; no-op when there's no active, no charges,
   *  or the run is paused / in the victory ceremony. World-anchored visuals (no scrollFactor 0). */
  private useActive(x: number, y: number) {
    if (!this.activeId || this.stats.activeCharges <= 0 || this.paused || this.ceremony) return;
    this.chargesSpent += 1;
    this.stats.activeCharges = Math.max(0, this.stats.activeCharges - 1);
    const def = ACTIVES[this.activeId];
    playSfx('draft-open'); // placeholder cue; a bespoke per-active recipe is optional later.
    const e = def.effect;
    if (e.kind === 'slow') {
      // A blue ring fades over the slow's duration; enemies caught in it lose move speed until
      // slowUntil (read by enemyVelocity, same fields as the on-hit slow).
      const ring = this.add.circle(x, y, e.radius * RUN_SCALE, 0x66ccff, 0.25).setDepth(7);
      this.tweens.add({ targets: ring, alpha: 0, duration: e.durationMs, onComplete: () => ring.destroy() });
      (this.enemies.getChildren() as any[]).forEach((en) => {
        if (en.active && withinRadius(x, y, en.x, en.y, e.radius * RUN_SCALE)) {
          en.setData('slowPct', e.pct);
          en.setData('slowUntil', this.elapsed + e.durationMs);
        }
      });
    } else if (e.kind === 'dot') {
      // A lingering cloud reusing the trail/zone patch system. dps is converted to per-tick damage.
      this.spawnPatch(x, y, e.radius * RUN_SCALE, e.durationMs, e.dps * (ZONE_TICK_MS / 1000), 0x77dd55);
    } else if (e.kind === 'burst') {
      // `count` blasts ringed around the point, staggered 120ms apart, each scaled by damageMult.
      for (let i = 0; i < e.count; i++) {
        const ang = (i / e.count) * Math.PI * 2;
        const bx = x + Math.cos(ang) * e.radius * 0.5 * RUN_SCALE;
        const by = y + Math.sin(ang) * e.radius * 0.5 * RUN_SCALE;
        this.time.delayedCall(i * 120, () => this.detonate(bx, by, e.damage * this.stats.damageMult, e.radius * RUN_SCALE));
      }
    } else {
      // Exhaustiveness guard: a new ActiveEffect kind must add a branch here or this won't compile.
      const _exhaustive: never = e;
      return _exhaustive;
    }
  }

  /** RC-043: the touch ⚡ button — fire the active at the nearest enemy (no cursor on touch),
   *  falling back to the last movement direction, then straight up. */
  private useActiveAtNearest(): void {
    const t = this.nearestEnemy() as { x: number; y: number } | null;
    const aim = activeAimPoint(this.player.x, this.player.y, t ? { x: t.x, y: t.y } : null, this.lastMoveDir);
    this.useActive(aim.x, aim.y);
  }

  /** Orbit: keep `count` projectiles riding a ring around the player. Re-summoning (each cooldown)
   *  replaces this weapon's ring so it refreshes to the current level without stacking. Orbiter
   *  angle comes from the global run clock, so a replaced ring resumes at the same phase — seamless. */
  private summonOrbit(shot: WeaponShot, weaponId: string, kit: VfxKit) {
    (this.bullets.getChildren() as any[])
      .filter((b) => b.getData('behavior') === 'orbit' && b.getData('weaponKey') === weaponId)
      .forEach((b) => b.destroy());

    for (let i = 0; i < shot.count; i++) {
      const orb = this.add.image(this.player.x, this.player.y, shot.sprite) as any;
      orb.setDisplaySize(PROJ_SIZE, PROJ_SIZE);
      orb.setTint(kit.tint); // RC-031 VFX: orbit ring reads its verb's palette
      this.physics.add.existing(orb);
      this.bullets.add(orb);
      orb.body.setVelocity(0, 0);
      orb.setData('behavior', 'orbit');
      orb.setData('damage', shot.damage);
      orb.setData('index', i);
      orb.setData('count', shot.count);
      orb.setData('weaponKey', weaponId);
    }
  }

  /** Lob: arc `count` projectiles to a target point and detonate on landing. Purely visual in
   *  flight (no overlap body) — damage is a radius query at the landing point in `detonate`. */
  private fireLob(shot: WeaponShot, kit: VfxKit) {
    const target = this.nearestEnemy() as any;
    const aim = target
      ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y)
      : -Math.PI / 2;
    const dist = target
      ? Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y)
      : 220;

    for (let i = 0; i < shot.count; i++) {
      const offset = shot.count > 1
        ? (i - (shot.count - 1) / 2) * (shot.spread / (shot.count - 1))
        : 0;
      const angle = aim + offset;
      const tx = this.player.x + Math.cos(angle) * dist;
      const ty = this.player.y + Math.sin(angle) * dist;
      const img = this.add.image(this.player.x, this.player.y, shot.sprite).setDepth(15) as any;
      img.setDisplaySize(PROJ_SIZE, PROJ_SIZE);
      img.setTint(kit.tint); // RC-031 VFX: lob reads its verb's palette in flight
      this.lobs.push({
        img,
        start: { x: this.player.x, y: this.player.y },
        target: { x: tx, y: ty },
        elapsed: 0,
        flightMs: lobFlightMs(dist, shot.speed * RUN_SCALE),
        damage: shot.damage,
        onHit: shot.onHit,
        kit,
      });
    }
  }

  /** Resolve an explosion at (x,y): shock-ring + shake, then AoE damage to enemies within `radius`.
   *  Default radius keeps plain lobbers (grenade/mortar) backward compatible; RC-031 callers pass an
   *  onHit.explode-derived radius. */
  private detonate(x: number, y: number, damage: number, radius = LOB_BLAST) {
    const ring = this.add.circle(x, y, radius, 0xffaa33, 0.4).setDepth(24).setScale(0.15);
    this.tweens.add({
      targets: ring, scale: 1, alpha: 0,
      duration: 260, ease: 'Power2', onComplete: () => ring.destroy(),
    });
    this.cameras.main.shake(120, 0.006);
    (this.enemies.getChildren() as any[]).forEach((e) => {
      if (e.active && withinRadius(x, y, e.x, e.y, radius)) {
        this.applyDamageToEnemy(e, damage);
      }
    });
  }

  private nearestEnemy(): Phaser.GameObjects.GameObject | null {
    let best: any = null, bestD = Infinity;
    (this.enemies.getChildren() as any[]).forEach((e) => {
      const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (d < bestD) { bestD = d; best = e; }
    });
    return best;
  }

  /** Create one enemy of `def` at (x,y) with all run-state data. Shared by edge spawns and
   *  RC-018 splitter death-spawns. */
  private spawnEnemyAt(def: EnemyDef, x: number, y: number) {
    // RC-038: single choke point — every spawn (placed roster, splitter children, shrine wave,
    // courier, boss) flows through here, so clamping the position here keeps the whole roster inside
    // the playable field. Margin clears the wall band plus a body's half-width.
    const c = clampToPlayable(x, y, this.layout.width, this.layout.height, WALL_THICKNESS + 24);
    const enemy = this.add.image(c.x, c.y, def.sprite) as any;
    enemy.setDisplaySize(def.displaySize.w * RUN_SCALE, def.displaySize.h * RUN_SCALE);
    this.physics.add.existing(enemy);
    this.enemies.add(enemy);
    enemy.setData('uid', `e${++this.enemyUidCounter}`); // RC-031: stable id for chain hit-memory
    enemy.setData('hp', def.baseHp);
    enemy.setData('maxHp', def.baseHp); // RC-040: enrage reads hp/maxHp (boss overrides both below)
    enemy.setData('drop', def.drop);
    enemy.setData('xp', def.xp);
    enemy.setData('speed', def.speed * RUN_SCALE * this.mutFx.effects.enemySpeedMult);
    enemy.setData('contactDamage', Math.round(def.contactDamage * enemyDamageMult(this.expedition.tier)));
    enemy.setData('armor', (def.armor ?? 0) + this.mutFx.effects.enemyArmorAdd);
    enemy.setData('attack', def.attack);
    // RC-040 attack profile + enrage. profileMs counts down to the next telegraphed attack (staggered
    // like fireMs so co-spawned mobs don't act in unison). enrageRateMult divides cooldowns and
    // multiplies speed once the mob enrages (1 = not yet). baseSpeed is the un-enraged speed so the
    // enrage speed boost is applied once, not compounded per frame.
    enemy.setData('attackProfile', def.attackProfile);
    enemy.setData('enrage', def.enrage === true);
    enemy.setData('spawns', def.spawns);
    enemy.setData('enraged', false);
    enemy.setData('enrageRateMult', 1);
    if (def.attackProfile) enemy.setData('profileMs', Phaser.Math.Between(600, 2200));
    // RC-018 movement archetype + per-enemy mutable state.
    enemy.setData('behavior', def.behavior ?? 'chase');
    enemy.setData('split', def.split);
    if (def.behavior === 'charger') enemy.setData('chargerState', initChargerState());
    if (def.behavior === 'circler') enemy.setData('circlerDir', Phaser.Math.Between(0, 1) === 0 ? -1 : 1);
    // Stagger first shots so spawns don't volley in unison.
    enemy.setData('fireMs', Phaser.Math.Between(800, 2600));
    // Match the hitbox to the visible mob so you don't get stuck on enemies that look clear.
    this.shrinkBody(enemy, 0.72);
    return enemy;
  }

  /** RC-034: rouse a sleeping mob (proximity or damage). Waking the boss runs its RC-019 arrival
   *  moment — banner + HP bar — repointed from the old timed telegraph to first contact. */
  private wakeEnemy(e: any) {
    if (!e.getData('asleep')) return;
    e.setData('asleep', false);
    if (e.getData('isBoss')) this.onBossAggro();
    // RC-026: the courier's flee window starts the instant it first wakes — catch it before it escapes.
    if (e.getData('poiCourier') && e.getData('despawnAt') === undefined) {
      e.setData('despawnAt', this.elapsed + COURIER_DESPAWN_MS);
    }
  }

  private onBossAggro() {
    playSfx('boss-arrival'); // RC-020
    const { width, height } = this.scale;
    const name = ENEMIES[this.bossId]?.name ?? 'Boss';
    const banner = this.add.text(width / 2, height * 0.22, `⚔ ${name} blocks your path`, {
      fontSize: '34px', color: '#ffdd55', stroke: '#000', strokeThickness: 5, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(60).setScrollFactor(0);
    this.tweens.add({ targets: banner, alpha: 0, y: banner.y - 20, delay: 1600, duration: 700, onComplete: () => banner.destroy() });
    this.createBossHpBar();
  }

  private createBossHpBar() {
    const { width } = this.scale;
    const w = Math.min(520, width * 0.6), h = 16, x = (width - w) / 2;
    // Position below the full HUD strip (text + XP bar) so the bar never overlaps the counter.
    const hudBottom = this.xpBarBg.getBounds().bottom;
    const y = hudBottom + 14;
    const bg = this.add.rectangle(x, y, w, h, 0x220000, 0.85).setOrigin(0, 0).setDepth(60).setScrollFactor(0).setStrokeStyle(2, 0x000000);
    const fill = this.add.rectangle(x, y, w, h, 0xff3322, 1).setOrigin(0, 0).setDepth(61).setScrollFactor(0);
    const label = this.add.text(width / 2, y + h + 2, ENEMIES[this.bossId]?.name ?? 'Boss', {
      fontSize: '15px', color: '#ffdddd', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(61).setScrollFactor(0);
    this.bossHp = { bg, fill, label };
  }

  private updateBossHpBar() {
    if (!this.bossHp || !this.bossEnemy) return;
    const frac = Math.max(0, Math.min(1, this.bossEnemy.getData('hp') / this.bossEnemy.getData('maxHp')));
    this.bossHp.fill.width = this.bossHp.bg.width * frac;
  }

  private destroyBossHpBar() {
    if (!this.bossHp) return;
    this.bossHp.bg.destroy(); this.bossHp.fill.destroy(); this.bossHp.label.destroy();
    this.bossHp = undefined;
  }

  /** Shrink a physics body to `frac` of the sprite's display size, kept centered. */
  private shrinkBody(obj: any, frac: number) {
    const body = obj.body as Phaser.Physics.Arcade.Body;
    const sw = obj.width, sh = obj.height; // source-frame px; footprint = sw·frac·displayScale
    body.setSize(sw * frac, sh * frac);
    body.setOffset((sw * (1 - frac)) / 2, (sh * (1 - frac)) / 2);
  }

  /** RC-018: per-frame movement by archetype. `chase`/default keeps the simple beeline; the
   *  others call the pure enemyBehavior functions and apply the returned velocity. */
  private updateEnemyMovement(e: any, dt: number) {
    // RC-031: an onHit.slowPct hit cuts move speed until slowUntil. Scale the final speed every
    // movement branch uses by `slowed` (1 = unaffected).
    const slowed = (e.getData('slowUntil') ?? 0) > this.elapsed ? Math.max(0, 1 - (e.getData('slowPct') ?? 0)) : 1;
    const speed = (e.getData('speed') as number) * slowed;
    // RC-026 flee (treasure courier): steer directly AWAY from the player. routeAround targets the
    // player, so it would route a fleeing courier THROUGH a gap toward you — wrong. Skip it; the
    // obstacle/barrier colliders already make the courier slide along walls instead of pinning.
    if ((e.getData('behavior') ?? 'chase') === 'flee') {
      const v = fleeVelocity(this.player.x, this.player.y, e.x, e.y, speed);
      e.body.setVelocity(v.vx, v.vy);
      return;
    }
    const waypoint = routeAround(e.x, e.y, this.player.x, this.player.y, this.layout.barriers);
    if (waypoint.x !== this.player.x || waypoint.y !== this.player.y) {
      this.physics.moveTo(e, waypoint.x, waypoint.y, speed);
      return;
    }
    const behavior = (e.getData('behavior') ?? 'chase') as string;
    if (behavior === 'chase') { this.physics.moveToObject(e, this.player, speed); return; }

    const dx = this.player.x - e.x, dy = this.player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;

    if (behavior === 'charger') {
      const prev = (e.getData('chargerState') as ChargerState) ?? initChargerState();
      const r = chargerStep(prev, dist, ux, uy, speed, dt, CHARGER_CONFIG_SCALED);
      e.setData('chargerState', r.state);
      e.body.setVelocity(r.vx, r.vy);
      this.renderChargerTell(e, r.state.phase);
    } else if (behavior === 'circler') {
      const dir = (e.getData('circlerDir') as number) ?? 1;
      const r = circlerVelocity(e.x, e.y, this.player.x, this.player.y, dir, speed, CIRCLER_RADIUS * RUN_SCALE);
      e.body.setVelocity(r.vx, r.vy);
    } else if (behavior === 'standoff') {
      const r = standoffVelocity(dist, ux, uy, speed, STANDOFF_MIN * RUN_SCALE, STANDOFF_MAX * RUN_SCALE);
      e.body.setVelocity(r.vx, r.vy);
    } else {
      this.physics.moveToObject(e, this.player, speed);
    }
  }

  /** RC-018: charger telegraph. Renders only on phase changes — an amber scale-pulse during the
   *  windup so the dash is readable before it lands, cleared when the dash begins. */
  private renderChargerTell(e: any, phase: ChargerPhase) {
    if (e.getData('chargerPhase') === phase) return;
    e.setData('chargerPhase', phase);
    if (phase === 'windup') {
      e.setTint(0xffcc33);
      e.setData('baseScaleX', e.scaleX); e.setData('baseScaleY', e.scaleY); // restore point
      const tween = this.tweens.add({
        targets: e, scaleX: e.scaleX * 1.25, scaleY: e.scaleY * 1.25,
        duration: 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      e.setData('tellTween', tween);
    } else {
      this.stopChargerTell(e);
      e.clearTint();
    }
  }

  /** Stop a charger's telegraph tween (if any) and restore its base scale. Safe to call before the
   *  sprite is destroyed; do NOT call after destroy() (the data manager is gone). */
  private stopChargerTell(e: any) {
    const tween = e.getData('tellTween') as Phaser.Tweens.Tween | undefined;
    if (tween) { tween.stop(); e.setData('tellTween', undefined); }
    const bx = e.getData('baseScaleX'), by = e.getData('baseScaleY');
    if (typeof bx === 'number' && typeof by === 'number') e.setScale(bx, by);
  }

  /** Per-frame: armed enemies count down and fire a slow, dodgeable projectile (global cap enforced). */
  private updateEnemyFire(dt: number) {
    for (const e of this.enemies.getChildren() as any[]) {
      const atk = e.getData('attack') as 'ranged' | 'melee' | undefined;
      if (!atk) continue;
      if (e.getData('asleep')) continue; // RC-034: sleeping mobs hold fire
      let fireMs = (e.getData('fireMs') ?? 0) - dt;
      if (fireMs <= 0) {
        const prof = ENEMY_SHOT[atk];
        const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
        // RC-037: in the scrolled dungeon (RC-034) a ranged mob must be genuinely on-camera to fire —
        // otherwise it snipes the player from off-screen. Gate on the shooter being inside the
        // viewport's worldView, inset ~24px so a mob at the very edge isn't yet shooting.
        const view = this.cameras.main.worldView;
        const onCamera =
          e.x >= view.x + 24 && e.x <= view.right - 24 &&
          e.y >= view.y + 24 && e.y <= view.bottom - 24;
        const inRange = atk === 'ranged' ? onCamera : d < (prof as typeof ENEMY_SHOT.melee).range;
        if (inRange && this.enemyBullets.countActive(true) < MAX_ENEMY_BULLETS) {
          this.fireEnemyShot(e, atk);
          // RC-040: enraged mobs fire faster — divide the cadence by the rate mult (1 when calm).
          fireMs = (prof.cooldownMs + Phaser.Math.Between(-300, 700)) / (e.getData('enrageRateMult') ?? 1);
        } else {
          fireMs = 300; // capped or out of range — try again shortly
        }
      }
      e.setData('fireMs', fireMs);
    }
  }

  private fireEnemyShot(enemy: any, type: 'ranged' | 'melee') {
    const prof = ENEMY_SHOT[type];
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    const b = this.add.circle(enemy.x, enemy.y, prof.radius, prof.color).setDepth(5) as any;
    b.setStrokeStyle(2, 0x000000, 0.45);
    this.physics.add.existing(b);
    this.enemyBullets.add(b);
    b.setData('damage', Math.round(enemy.getData('contactDamage') * prof.damageMult));
    b.body.setVelocity(Math.cos(angle) * prof.speed * RUN_SCALE, Math.sin(angle) * prof.speed * RUN_SCALE);
    this.time.delayedCall(prof.lifeMs, () => b.destroy());
  }

  // ========================= RC-040 enemy attack profiles =========================
  // updateEnemyProfiles dispatches per-profile telegraphed attacks (mirror of updateEnemyFire).
  // Every profile is asleep-gated and (except slash, which needs proximity anyway) held while the
  // shooter is off-camera, matching the RC-037 fire gate. Per-enemy state lives on enemy data
  // (profileMs countdown, telegraph objects, spawner child uids) so it dies with the sprite.

  /** True if the enemy is inside the camera worldView inset 24px — the RC-037 off-screen fire gate. */
  private enemyOnCamera(e: any): boolean {
    const v = this.cameras.main.worldView;
    return e.x >= v.x + 24 && e.x <= v.right - 24 && e.y >= v.y + 24 && e.y <= v.bottom - 24;
  }

  /** RC-025 Second Wind: once per run, a lethal hit leaves the player at 30% maxHp instead.
   *  Returns true when it fired (caller skips finish). */
  private trySecondWind(): boolean {
    if (!this.hasRelic('second_wind') || this.secondWindUsed || this.finished) return false;
    this.secondWindUsed = true;
    this.stats.hp = secondWindRevive(this.stats.maxHp);
    // Unmistakable feedback: white flash + banner, mirroring celebrateFusion's screen-fixed pattern.
    this.cameras.main.flash(420, 255, 255, 255);
    const banner = this.add.text(this.scale.width / 2, this.scale.height * 0.3,
      `🕊️ Second Wind`, { fontSize: '40px', color: '#eef6ff', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 },
    ).setOrigin(0.5).setDepth(60).setScrollFactor(0).setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({ targets: banner, alpha: 0, delay: 1500, duration: 600, onComplete: () => banner.destroy() });
    return true;
  }

  /** Apply `amount` HP damage to the player with the standard hit feedback (flash + shake + death
   *  check). Shared by every player-damaging enemy attack (slash/beam/mortar/enemy patches). */
  private damagePlayer(amount: number, attacker?: any) {
    if (amount <= 0 || this.finished || this.ceremony) return;
    this.stats.hp -= amount;
    playSfx('player-hit');
    this.cameras.main.flash(90, 130, 0, 0);
    this.player.setTintFill(0xff3333);
    this.time.delayedCall(90, () => { if (this.player?.active) this.player.clearTint(); });
    if (this.stats.hp <= 0 && !this.trySecondWind()) this.finish(true);
    // RC-025 Bramble Mail: a surviving melee attacker takes thorn damage (after the death check so
    // a thorn-kill's applyDamageToEnemy never runs on a finished scene's freed groups).
    if (this.hasRelic('bramble_mail') && !this.finished && attacker?.active) {
      this.applyDamageToEnemy(attacker, BRAMBLE_DAMAGE);
    }
  }

  /** Spawn a lingering enemy ground hazard at (x,y): a hostile-tinted circle that ticks the PLAYER
   *  (never enemies) every ZONE_TICK_MS. Mirrors spawnPatch but for the enemy-patch list. */
  private spawnEnemyPatch(x: number, y: number, radius: number, lingerMs: number, tickDamage: number) {
    const gfx = this.add.circle(x, y, radius, 0xff5522, 0.32).setDepth(6);
    gfx.setStrokeStyle(2, 0xff2200, 0.4);
    this.enemyPatches.push({ x, y, bornMs: this.elapsed, lingerMs, radius, tickDamage, lastPlayerTick: -Infinity, gfx });
  }

  /** Per-frame: enemy ground hazards (flamejet/haunt) fade, expire, and tick the player on a
   *  ZONE_TICK_MS re-hit cadence while he stands in them. Mirror of the player `patches` tick. */
  private updateEnemyPatches() {
    for (let i = this.enemyPatches.length - 1; i >= 0; i--) {
      const p = this.enemyPatches[i];
      const age = this.elapsed - p.bornMs;
      if (age >= p.lingerMs) { p.gfx.destroy(); this.enemyPatches.splice(i, 1); continue; }
      p.gfx.setAlpha(0.30 * (1 - age / p.lingerMs) + 0.08);
      if (withinRadius(p.x, p.y, this.player.x, this.player.y, p.radius)
        && this.elapsed - p.lastPlayerTick >= ZONE_TICK_MS) {
        p.lastPlayerTick = this.elapsed;
        this.damagePlayer(p.tickDamage);
      }
    }
  }

  /** Per-frame profile dispatch. Each profiled, awake, on-camera (slash exempt) enemy counts down
   *  profileMs and runs its telegraphed attack; enrage is evaluated here too (and in the damage
   *  path) so it triggers even for non-firing profiles. */
  private updateEnemyProfiles(dt: number) {
    for (const e of this.enemies.getChildren() as any[]) {
      if (!e.active) continue;
      const profile = e.getData('attackProfile') as string | undefined;
      if (e.getData('asleep')) continue;
      // RC-040: enrage can fire for any enraging def regardless of profile.
      if (e.getData('enrage') && !e.getData('enraged')) this.maybeEnrage(e);
      if (!profile) continue;
      // Off-camera gate (RC-037 parity) for everything except slash, which already requires the
      // player to be in melee range, so a distant slash never fires anyway.
      if (profile !== 'slash' && !this.enemyOnCamera(e)) continue;

      let ms = (e.getData('profileMs') ?? 0) - dt;
      if (ms > 0) { e.setData('profileMs', ms); continue; }
      const rate = e.getData('enrageRateMult') ?? 1;
      const cd = this.runEnemyProfile(e, profile);
      // cd < 0 means the profile declined to act this tick (e.g. player out of slash range, spawner
      // capped) — retry shortly rather than burning the full cooldown.
      ms = cd < 0 ? 250 : cd / rate;
      e.setData('profileMs', ms);
    }
  }

  /** Run one profile's attack. Returns the cooldown ms before the next attempt, or a negative value
   *  to signal "declined — retry soon". Telegraph objects are scene-owned and reaped on shutdown. */
  private runEnemyProfile(e: any, profile: string): number {
    switch (profile) {
      case 'volley': return this.profileVolley(e);
      case 'slash': return this.profileSlash(e);
      case 'beam': return this.profileBeam(e);
      case 'flamejet': return this.profileFlamejet(e);
      case 'mortar': return this.profileMortar(e);
      case 'spawner': return this.profileSpawner(e);
      case 'haunt': return this.profileHaunt(e);
      default: return 1000;
    }
  }

  /** volley: the basic ranged shot at VOLLEY cadence, weaker per shot. Respects the bullet cap. */
  private profileVolley(e: any): number {
    if (this.enemyBullets.countActive(true) >= MAX_ENEMY_BULLETS) return -1;
    const dmg = Math.round(e.getData('contactDamage') * ENEMY_SHOT.ranged.damageMult * VOLLEY_DAMAGE_MULT);
    this.fireEnemyBullet(e.x, e.y, this.player.x, this.player.y, ENEMY_SHOT.ranged.speed, dmg,
      ENEMY_SHOT.ranged.color, ENEMY_SHOT.ranged.radius, ENEMY_SHOT.ranged.lifeMs);
    return VOLLEY_COOLDOWN_MS;
  }

  /** Generic enemy projectile (used by volley). Mirrors fireEnemyShot but with explicit params. */
  private fireEnemyBullet(sx: number, sy: number, tx: number, ty: number,
    speed: number, damage: number, color: number, radius: number, lifeMs: number) {
    const angle = Phaser.Math.Angle.Between(sx, sy, tx, ty);
    const b = this.add.circle(sx, sy, radius, color).setDepth(5) as any;
    b.setStrokeStyle(2, 0x000000, 0.45);
    this.physics.add.existing(b);
    this.enemyBullets.add(b);
    b.setData('damage', damage);
    b.body.setVelocity(Math.cos(angle) * speed * RUN_SCALE, Math.sin(angle) * speed * RUN_SCALE);
    this.time.delayedCall(lifeMs, () => { if (b.active) b.destroy(); });
  }

  /** slash: a 120° arc wind-up telegraph locked to the facing toward the player, then a hit if the
   *  player is still inside the arc. Declines (retry) when the player is out of range. */
  private profileSlash(e: any): number {
    const range = SLASH_RANGE * RUN_SCALE;
    const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
    if (d > range) return -1; // player not in melee reach — wait
    const facing = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
    // Telegraph: a red arc sector locked to the windup-start facing, pulsing for SLASH_WINDUP_MS.
    const g = this.add.graphics().setDepth(7);
    const draw = (alpha: number) => {
      g.clear();
      g.fillStyle(0xff3322, alpha);
      g.slice(e.x, e.y, range, facing - SLASH_ARC_RAD / 2, facing + SLASH_ARC_RAD / 2, false);
      g.fillPath();
    };
    draw(0.22);
    const pulse = this.tweens.addCounter({
      from: 0.18, to: 0.42, duration: 200, yoyo: true, repeat: -1,
      onUpdate: (tw) => { if (g.active) draw(tw.getValue() ?? 0.22); },
    });
    this.time.delayedCall(SLASH_WINDUP_MS, () => {
      pulse.stop();
      if (!e.active || !g.active) { g.destroy(); return; }
      // The hit: solid flash, then damage if the player is inside the LOCKED arc.
      g.clear();
      g.fillStyle(0xff5533, 0.55);
      g.slice(e.x, e.y, range, facing - SLASH_ARC_RAD / 2, facing + SLASH_ARC_RAD / 2, false);
      g.fillPath();
      if (arcContains(e.x, e.y, facing, range, SLASH_ARC_RAD, this.player.x, this.player.y)) {
        this.damagePlayer(e.getData('contactDamage') * 1.2, e); // melee — Bramble Mail retaliates
      }
      this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
    });
    return SLASH_COOLDOWN_MS + SLASH_WINDUP_MS;
  }

  /** beam: a thin aim line locked through the player's aim-start position glows for BEAM_AIM_MS,
   *  then fires a thick beam; a hit along the locked line deals ranged damage × BEAM_DAMAGE_MULT. */
  private profileBeam(e: any): number {
    const dir = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
    const len = Math.hypot(this.scale.width, this.scale.height); // screen diagonal
    const ox = e.x, oy = e.y; // lock the origin too (enemy may drift during the aim)
    const ex = ox + Math.cos(dir) * len, ey = oy + Math.sin(dir) * len;
    const aim = this.add.graphics().setDepth(7);
    aim.lineStyle(2, 0xff4422, 0.7);
    aim.lineBetween(ox, oy, ex, ey);
    aim.strokeLineShape(new Phaser.Geom.Line(ox, oy, ex, ey));
    const pulse = this.tweens.add({ targets: aim, alpha: 0.3, duration: 200, yoyo: true, repeat: -1 });
    this.time.delayedCall(BEAM_AIM_MS, () => {
      pulse.stop();
      aim.destroy();
      if (!e.active) return;
      // Fire: a thick beam for ~120ms along the LOCKED line.
      const beam = this.add.graphics().setDepth(8);
      beam.lineStyle(BEAM_WIDTH * RUN_SCALE, 0xff5533, 0.85);
      beam.strokeLineShape(new Phaser.Geom.Line(ox, oy, ex, ey));
      if (beamHits(ox, oy, dir, len, BEAM_WIDTH * RUN_SCALE, this.player.x, this.player.y)) {
        const dmg = Math.round(e.getData('contactDamage') * ENEMY_SHOT.ranged.damageMult * BEAM_DAMAGE_MULT);
        this.damagePlayer(dmg);
      }
      this.tweens.add({ targets: beam, alpha: 0, duration: 120, onComplete: () => beam.destroy() });
    });
    return BEAM_COOLDOWN_MS + BEAM_AIM_MS;
  }

  /** flamejet: a warm-up tint, then a line of burning enemy patches dropped toward the player. */
  private profileFlamejet(e: any): number {
    const facing = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
    e.setTint(0xffaa33); // warm-up flash
    this.time.delayedCall(400, () => {
      if (!e.active) return;
      e.clearTint();
      for (const pt of flamePatchPoints(e.x, e.y, facing, FLAME_CONE_RANGE * RUN_SCALE)) {
        // RC-009: flat patch damage scales with tier so flamejet stays relevant at end-game.
        this.spawnEnemyPatch(pt.x, pt.y, 26 * RUN_SCALE, 1500, Math.round(10 * enemyDamageMult(this.expedition.tier)));
      }
    });
    return FLAME_COOLDOWN_MS + 400;
  }

  /** mortar: lob an enemy-tinted shell at the player's CURRENT position with a ground target circle
   *  during flight; on land, a blast radius damages the PLAYER only + a ring visual. */
  private profileMortar(e: any): number {
    const tx = this.player.x, ty = this.player.y; // locked landing point
    const blast = MORTAR_BLAST * RUN_SCALE;
    // Capture the blast damage at FIRE time — the shell is committed, so it lands for full damage
    // even if the firing enemy dies mid-flight (reading e.getData at landing would yield 0 then).
    const blastDamage = e.getData('contactDamage') * 1.0;
    // Target telegraph on the ground at the landing point for the flight duration.
    const target = this.add.circle(tx, ty, blast, 0xff3322, 0.18).setDepth(6);
    target.setStrokeStyle(2, 0xff4422, 0.6);
    // The lobbed shell: an enemy-tinted projectile arcing from the enemy to the target.
    const shell = this.add.circle(e.x, e.y, 8 * RUN_SCALE, 0xff6633).setDepth(15) as any;
    shell.setStrokeStyle(2, 0x000000, 0.4);
    const start = { x: e.x, y: e.y };
    const state = { t: 0 };
    this.tweens.add({
      targets: state, t: 1, duration: MORTAR_FLIGHT_MS, ease: 'Linear',
      onUpdate: () => {
        if (!shell.active) return;
        const g = lobGroundPosition(start, { x: tx, y: ty }, state.t);
        shell.setPosition(g.x, g.y - lobArcHeight(state.t) * RUN_SCALE);
        const apex = 1 + 0.5 * (lobArcHeight(state.t) / LOB_PEAK_HEIGHT);
        shell.setRadius(8 * RUN_SCALE * apex);
      },
      onComplete: () => {
        shell.destroy();
        target.destroy();
        // Land: ring + blast → player only.
        const ring = this.add.circle(tx, ty, blast, 0xff5522, 0.4).setDepth(24).setScale(0.15);
        this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 260, ease: 'Power2', onComplete: () => ring.destroy() });
        this.cameras.main.shake(120, 0.005);
        if (withinRadius(tx, ty, this.player.x, this.player.y, blast)) {
          this.damagePlayer(blastDamage);
        }
      },
    });
    return MORTAR_COOLDOWN_MS + MORTAR_FLIGHT_MS;
  }

  /** spawner: summon a minion near the spawner if under the alive cap. Tracks child uids on the
   *  spawner data (pruned against the live enemy group each attempt). */
  private profileSpawner(e: any): number {
    const spawns = e.getData('spawns') as string | undefined;
    if (!spawns || !ENEMIES[spawns]) return SPAWNER_COOLDOWN_MS;
    const liveUids = new Set((this.enemies.getChildren() as any[]).filter((c) => c.active).map((c) => c.getData('uid')));
    let kids = (e.getData('childUids') as string[] | undefined) ?? [];
    kids = kids.filter((uid) => liveUids.has(uid)); // prune dead children
    if (!spawnerMaySummon(kids.length)) { e.setData('childUids', kids); return -1; }
    const ang = Math.random() * Math.PI * 2, r = 60;
    const child = this.spawnEnemyAt(ENEMIES[spawns], e.x + Math.cos(ang) * r, e.y + Math.sin(ang) * r);
    child.setData('asleep', false);
    this.wakeEnemy(child); // awake + aggroed
    kids.push(child.getData('uid'));
    e.setData('childUids', kids);
    // Brief summon tint on the spawner.
    e.setTint(0x66ff99);
    this.time.delayedCall(180, () => { if (e.active) e.clearTint(); });
    return SPAWNER_COOLDOWN_MS;
  }

  /** haunt: drop a small damaging patch at the enemy's position while it is moving (it circles the
   *  player, so the trail forms a damaging ring). Holds the drop while stationary. */
  private profileHaunt(e: any): number {
    const v = e.body?.velocity;
    const moving = v && (Math.abs(v.x) + Math.abs(v.y)) > 1;
    if (!moving) return -1; // parked — no trail to lay
    // RC-009: flat patch damage scales with tier so the haunt trail stays threatening at end-game.
    this.spawnEnemyPatch(e.x, e.y, 20 * RUN_SCALE, HAUNT_LINGER_MS, Math.round(8 * enemyDamageMult(this.expedition.tier)));
    return HAUNT_DROP_MS;
  }

  /** RC-040: trigger enrage once HP drops below the threshold — +ENRAGE_MULT speed, faster cadence
   *  (via enrageRateMult read by the fire/profile ticks), red tint. Idempotent (guarded by data). */
  private maybeEnrage(e: any) {
    if (e.getData('enraged') || !e.getData('enrage')) return;
    if (!enrageActive(e.getData('hp'), e.getData('maxHp'))) return;
    e.setData('enraged', true);
    e.setData('enrageRateMult', ENRAGE_MULT);
    e.setData('speed', (e.getData('speed') as number) * ENRAGE_MULT);
    e.setTint(0xff5544);
  }

  /** Clear a hit-flash tint, but re-apply the enrage red if the mob is enraged (so the hit-flash
   *  doesn't wipe the persistent enrage tint). Safe after destroy (guards on active). */
  private restoreEnemyTint(e: any) {
    if (!e.active) return;
    if (e.getData('enraged')) e.setTint(0xff5544);
    else e.clearTint();
  }
  // ======================= end RC-040 enemy attack profiles =======================

  // ========================= RC-042 The Last Stand finale =========================
  // The finale replaces the dungeon's placed roster with 5 authored invader waves (invasion.WAVES)
  // marching as a space-invaders block, then the mothership. The pure math (formationStep /
  // mothershipPhase) lives in invasion.ts; this section spawns via the existing spawnEnemyAt path
  // (so gems/xp/profiles/kill feel all reuse the standard machinery) and positions members each
  // frame. Members carry data 'finaleControlled' so the chase-movement loop leaves them alone.

  /** The finale's fixed walled arena: viewport × FINALE_ARENA_SCREENS (floored so wave 5's widest
   *  grid always has lateral march room), no barriers/obstacles, player start at the bottom center
   *  — the invasion descends from the top. buildTerrain raises the RC-038 perimeter walls from it. */
  private finaleArenaLayout(): DungeonLayout {
    const width = Math.round(Math.max(this.scale.width * FINALE_ARENA_SCREENS, FINALE_ARENA_MIN_W));
    const height = Math.round(Math.max(this.scale.height * FINALE_ARENA_SCREENS, FINALE_ARENA_MIN_H));
    return {
      width, height,
      start: { x: width / 2, y: height - WALL_THICKNESS - 140 },
      barriers: [], obstacles: [],
    };
  }

  /** HUD second-line prefix during the finale: which stage the player is facing. During an
   *  inter-wave beat the cleared wave's number is stale — show the UPCOMING stage instead
   *  (matching the banner that just announced it). */
  private finaleHudTag(): string {
    if (!this.finale) return '';
    const stage = this.finaleBeatMs > 0 ? this.finaleWave + 1 : this.finaleWave;
    return stage >= 6 ? '🛸 MOTHERSHIP   ' : `🛸 Wave ${Math.max(1, stage)}/5   `;
  }

  /** Screen-fixed finale stage banner (alarm-red, mirrors the boss-aggro banner's pop/fade). */
  private showFinaleBanner(text: string) {
    const { width, height } = this.scale;
    const banner = this.add.text(width / 2, height * 0.22, text, {
      fontSize: '36px', color: '#ff7b72', stroke: '#000', strokeThickness: 5, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(60).setScrollFactor(0).setAlpha(0).setScale(0.5);
    this.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 240, ease: 'Back.easeOut' });
    this.tweens.add({ targets: banner, alpha: 0, delay: 1100, duration: 400, onComplete: () => banner.destroy() });
  }

  /** Per-frame finale dispatch: drain the inter-wave beat (spawning the next stage when it ends),
   *  then drive whichever stage is live — the marching formation or the mothership. */
  private updateFinale(dt: number) {
    if (this.finaleBeatMs > 0) {
      this.finaleBeatMs -= dt;
      if (this.finaleBeatMs <= 0) {
        if (this.finaleWave >= 5) this.spawnMothership();
        else this.spawnFinaleWave(this.finaleWave + 1);
      }
      return;
    }
    if (this.finaleWave >= 6) this.updateMothership(dt);
    else if (this.finaleWave >= 1) this.updateFormation(dt);
  }

  /** Spawn wave `n` (1-based) as a centered grid at the arena top. Members spawn awake (no asleep
   *  flag → profiles fire per RC-040 once on camera) and 'finaleControlled' (positioned below). */
  private spawnFinaleWave(n: number) {
    this.finaleWave = n;
    const wave = WAVES[n - 1];
    this.formationWaveDef = wave;
    const spacing = wave.spacing * RUN_SCALE;
    const halfW = ((wave.cols - 1) * spacing) / 2;
    const originX = this.layout.width / 2;
    this.formation = { x: originX, dir: 1 };
    this.formationY = WALL_THICKNESS + 110;
    this.formationMembers = [];
    wave.rows.forEach((id, r) => {
      for (let c = 0; c < wave.cols; c++) {
        const dx = c * spacing - halfW, dy = r * spacing;
        const e = this.spawnEnemyAt(ENEMIES[id], originX + dx, this.formationY + dy);
        e.setData('finaleControlled', true);
        this.formationMembers.push({ e, dx, dy });
      }
    });
  }

  /** March the live wave: drop dead members from the set (empty → banner beat to the next stage),
   *  step the origin via the pure formationStep (bounds inset so the WHOLE grid stays inside the
   *  walls; an edge reversal drops the block toward the player), and re-seat every member at its
   *  grid offset. body.reset keeps them normal physics bodies — bullets/contact/profiles all work. */
  private updateFormation(dt: number) {
    this.formationMembers = this.formationMembers.filter((m) => m.e.active);
    if (this.formationMembers.length === 0) {
      const next = this.finaleWave + 1;
      this.finaleBeatMs = FINALE_BEAT_MS;
      // No boss-arrival sfx here — spawnMothership plays it when the ship actually appears.
      this.showFinaleBanner(next > 5 ? '🛸 MOTHERSHIP' : `🛸 Wave ${next}/5`);
      return;
    }
    const wave = this.formationWaveDef!;
    const spacing = wave.spacing * RUN_SCALE;
    const halfW = ((wave.cols - 1) * spacing) / 2;
    const margin = WALL_THICKNESS + 24; // matches the RC-038 spawn/sweep containment margin
    const r = formationStep(this.formation!, dt, wave.marchSpeed * RUN_SCALE,
      margin + halfW, this.layout.width - margin - halfW);
    this.formation = r.s;
    if (r.dropped) {
      // Classic invaders pressure the floor but never pancake: cap the descent so the LOWEST row
      // stops at the same margin the per-member clamp uses. Once at the cap, drops are no-ops and
      // the block keeps marching laterally — kamikaze contact resolves the wave, no soft-lock.
      const maxY = this.layout.height - margin - (wave.rows.length - 1) * spacing;
      this.formationY = Math.min(this.formationY + wave.dropPx * RUN_SCALE, maxY);
    }
    const originX = r.s.x;
    for (const m of this.formationMembers) {
      const p = clampToPlayable(originX + m.dx, this.formationY + m.dy,
        this.layout.width, this.layout.height, margin);
      m.e.body.reset(p.x, p.y);
    }
  }

  /** Wave 6: the mothership — isBoss (existing HP bar/jackpot machinery), HP = tier-8 boss base ×
   *  MOTHERSHIP_HP_MULT, rendered 2× like the apex boss, anchored near the arena top. */
  private spawnMothership() {
    this.finaleWave = 6;
    const def = ENEMIES.invader_mothership;
    const e = this.spawnEnemyAt(def, this.layout.width / 2, WALL_THICKNESS + 150);
    const maxHp = def.baseHp * BOSS_HP_MULT * MOTHERSHIP_HP_MULT;
    e.setData('hp', maxHp);
    e.setData('maxHp', maxHp);
    e.setData('isBoss', true);
    // RC-009 parity with the apex boss: contact damage on the steeper boss curve.
    e.setData('contactDamage', Math.round(def.contactDamage * bossDamageMult(this.expedition.tier)));
    e.setDisplaySize(def.displaySize.w * RUN_SCALE * 2, def.displaySize.h * RUN_SCALE * 2);
    this.shrinkBody(e, 0.72);
    e.setData('finaleControlled', true); // drift is driven below, not by the chase loop
    this.mothershipObj = e;
    this.bossEnemy = e;                  // existing boss HP bar update path reads this
    this.msDriftDir = 1;
    this.msAttackMs = 1200;              // short grace before the first volley
    this.msNextAttack = 'mortar';
    this.msDroneMs = MOTHERSHIP_DRONE_PERIOD_MS;
    playSfx('boss-arrival');
    this.createBossHpBar();              // label reads ENEMIES[this.bossId].name = "Mothership"
  }

  /** Drive the mothership: death → victory ceremony; otherwise slow top-band drift, phase attacks
   *  (1: mortar volleys, 2: beam sweeps + drone adds, 3: both alternating, faster, enrage tint —
   *  the RC-040 conventions), all via the existing profile helpers. */
  private updateMothership(dt: number) {
    const ship = this.mothershipObj;
    if (!ship?.active) {
      // Mothership down — victory. The ceremony machinery does exactly what the spec asks for
      // (wipe leftover adds into gems, world-radius gem vacuum, zone-cleared fanfare, then
      // finish(false) — which carries finaleVictory in the finale). The auto remaining===0
      // trigger is suppressed for the finale, so this is the only entry point.
      this.startCeremony();
      return;
    }
    const phase = mothershipPhase(ship.getData('hp') / ship.getData('maxHp'));
    // Phase 3 = enrage, once: RC-040 tint + rate conventions (restoreEnemyTint keeps the red
    // through hit-flashes because 'enraged' is set).
    if (phase === 3 && !ship.getData('enraged')) {
      ship.setData('enraged', true);
      ship.setData('enrageRateMult', ENRAGE_MULT);
      ship.setTint(0xff5544);
    }
    // Slow horizontal drift across the top band, reversing inside the walls.
    const driftMargin = WALL_THICKNESS + 24 + ship.displayWidth / 2;
    if (ship.x <= driftMargin) this.msDriftDir = 1;
    else if (ship.x >= this.layout.width - driftMargin) this.msDriftDir = -1;
    ship.body.setVelocity(this.msDriftDir * MOTHERSHIP_DRIFT_SPEED * RUN_SCALE, 0);
    const rate = ship.getData('enrageRateMult') ?? 1;
    // Phase attacks reuse the RC-040 profile helpers (telegraphs, locked aims, player-only damage).
    // Gated on-camera per RC-037 — the ship holds top-of-arena, so it never snipes from off-screen.
    this.msAttackMs -= dt;
    if (this.msAttackMs <= 0) {
      if (!this.enemyOnCamera(ship)) {
        this.msAttackMs = 250; // off-screen — retry shortly (RC-040 "declined" convention)
      } else {
        let cd: number;
        if (phase === 1) cd = this.profileMortar(ship);
        else if (phase === 2) cd = this.profileBeam(ship);
        else {
          cd = this.msNextAttack === 'mortar' ? this.profileMortar(ship) : this.profileBeam(ship);
          this.msNextAttack = this.msNextAttack === 'mortar' ? 'beam' : 'mortar';
        }
        this.msAttackMs = cd / rate;
      }
    }
    // Phase 2+: periodic invader_drone adds (normal chase mobs), capped concurrent.
    if (phase >= 2) {
      this.msDroneMs -= dt;
      if (this.msDroneMs <= 0) {
        const adds = (this.enemies.getChildren() as any[])
          .filter((c) => c.active && c.getData('finaleAdd')).length;
        if (adds < MOTHERSHIP_MAX_DRONES) {
          const d = this.spawnEnemyAt(ENEMIES.invader_drone,
            ship.x + Phaser.Math.Between(-120, 120), ship.y + 80);
          d.setData('finaleAdd', true);
        }
        this.msDroneMs = MOTHERSHIP_DRONE_PERIOD_MS / rate;
      }
    }
  }
  // ======================= end RC-042 The Last Stand finale =======================

  private hitPlayerProjectile(bullet: any) {
    if (!bullet.active) return;
    this.stats.hp -= bullet.getData('damage') ?? 0;
    bullet.destroy();
    playSfx('player-hit'); // RC-020
    this.cameras.main.flash(90, 130, 0, 0);
    this.player.setTintFill(0xff3333);
    this.time.delayedCall(90, () => { if (this.player?.active) this.player.clearTint(); });
    if (this.stats.hp <= 0 && !this.trySecondWind()) this.finish(true);
  }

  /** A resource id biased toward the biome's lean (but every resource can appear). */
  private biasedResource(): Resource {
    return pickBiasedResource(() => Math.random(), this.biome.resourceBias);
  }

  private hitEnemy(bullet: any, enemy: any) {
    if (!bullet.active || !enemy.active) return;

    // Orbit projectiles persist and re-hit on a cadence instead of being consumed on contact.
    // The cadence is stored ON THE ENEMY, keyed by (weapon, orbiter index), so it survives the
    // per-cooldown ring refresh (which replaces the orbiter objects) and is freed when the enemy
    // dies — otherwise a refresh would reset the cadence and let an orbiter re-hit early.
    if (bullet.getData('behavior') === 'orbit') {
      const key = `orbHit:${bullet.getData('weaponKey')}:${bullet.getData('index')}`;
      const next = enemy.getData(key) ?? -Infinity;
      if (this.elapsed < next) return;
      enemy.setData(key, this.elapsed + ORBIT_HIT_INTERVAL_MS);
      this.applyDamageToEnemy(enemy, bullet.getData('damage'), bullet.getData('ignoresArmor'));
      return;
    }

    // A piercing bullet stays alive; make sure it never hits the SAME enemy twice.
    let hitSet = bullet.getData('hitSet') as Set<any> | undefined;
    if (!hitSet) { hitSet = new Set(); bullet.setData('hitSet', hitSet); }
    if (hitSet.has(enemy)) return;
    hitSet.add(enemy);

    const damage = bullet.getData('damage');

    // Damage lands first (existing flow) ...
    this.applyDamageToEnemy(enemy, damage, bullet.getData('ignoresArmor'));

    // RC-031 juice: micro-knockback — nudge the enemy 4px away from the projectile.
    if (enemy.active) {
      const kb = Phaser.Math.Angle.Between(bullet.x, bullet.y, enemy.x, enemy.y);
      enemy.x += Math.cos(kb) * 4; enemy.y += Math.sin(kb) * 4;
    }

    // RC-031 VFX: the firing verb's impact style + shake class at the hit point.
    const kit = bullet.getData('kit') as VfxKit | undefined;
    if (kit) this.kitImpact(kit, enemy.x, enemy.y);

    // ... then the RC-031 on-hit extension (explode / slow / chain) ...
    const onHit = (bullet.getData('onHit') ?? {}) as OnHit;
    const hitIds = bullet.getData('hitIds') as Set<string> | undefined;
    const enemyUid = enemy.getData('uid') ?? String(enemy.name || enemy.x + ',' + enemy.y);
    hitIds?.add(enemyUid);

    // Reentrant: detonate -> applyDamageToEnemy can death-spawn splitters mid-overlap (same pattern as lob landing).
    if (onHit.explode) {
      this.detonate(enemy.x, enemy.y, bullet.getData('damage') * 0.6, onHit.explode * RUN_SCALE);
    }
    if (onHit.slowPct) {
      enemy.setData('slowPct', onHit.slowPct);
      enemy.setData('slowUntil', this.elapsed + SLOW_MS);
    }
    if (onHit.chain) {
      const hops = bullet.getData('hopsLeft') ?? onHit.chain;
      if (hops > 0) {
        const candidates = (this.enemies.getChildren() as any[])
          .filter((e) => e.active)
          .map((e) => ({ id: e.getData('uid') as string, x: e.x, y: e.y }));
        const next = chainNextTarget(candidates, enemy.x, enemy.y, hitIds ?? new Set(), CHAIN_RANGE * RUN_SCALE);
        if (next) {
          bullet.setData('hopsLeft', hops - 1);
          bullet.setData('damage', bullet.getData('damage') * CHAIN_FALLOFF);
          const ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, next.x, next.y);
          const spd = bullet.getData('speed');
          bullet.body.setVelocity(Math.cos(ang) * spd, Math.sin(ang) * spd);
          return; // chain hop keeps the bullet alive regardless of pierce
        }
      }
    }

    // ... then the existing pierce-decrement / destroy.
    const pierce = bullet.getData('pierce') ?? 0;
    if (pierce > 0) {
      bullet.setData('pierce', pierce - 1);
    } else {
      bullet.destroy();
    }
  }

  /**
   * Apply `damage` to one enemy with the full juice path: hit-flash, floating number, and on
   * death the drops / xp / particles. Shared by bullet hits, orbit contact, and lob detonation so
   * the death feel is identical for every damage source. `ignoresArmor` lets the sniper line punch
   * straight through.
   */
  private applyDamageToEnemy(enemy: any, damage: number, ignoresArmor = false) {
    if (!enemy.active) return;
    this.wakeEnemy(enemy); // RC-034: getting shot wakes a sleeping mob (and announces the boss)

    // Armor absorbs whole hits (one layer per hit) regardless of damage — so tanky mobs always take
    // several shots — unless the source pierces armor (sniper line). A blocked hit deals no HP damage.
    const armor = enemy.getData('armor') ?? 0;
    if (armor > 0 && !ignoresArmor) {
      enemy.setData('armor', armor - 1);
      enemy.setTintFill(0x66ccff);
      this.time.delayedCall(60, () => this.restoreEnemyTint(enemy));
      const blk = this.add.text(enemy.x, enemy.y - 8, '⛊', {
        fontSize: '14px', color: '#9fe0ff', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: blk, y: blk.y - 18, alpha: 0, duration: 380, onComplete: () => blk.destroy() });
      playSfx('enemy-hit'); // RC-020: a hit landed, even if armor absorbed it
      return;
    }

    // --- Juice: hit-flash ---
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(60, () => this.restoreEnemyTint(enemy));

    // --- Juice: floating damage number (RC-031: heavy hits read bigger + gold) ---
    const heavy = damage >= 50;
    const dmgText = this.add.text(enemy.x, enemy.y - 14, String(Math.round(damage)), {
      fontSize: heavy ? '18px' : '13px', color: heavy ? '#ffd75e' : '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(35);
    this.tweens.add({
      targets: dmgText, y: dmgText.y - 22, alpha: 0,
      duration: 520, ease: 'Power1',
      onComplete: () => dmgText.destroy(),
    });

    const hp = enemy.getData('hp') - damage;
    if (hp <= 0) {
      const ex = enemy.x, ey = enemy.y;
      this.kills += 1; // RC-022 B3: a damage-kill increments the HUD counter (ceremony wipe doesn't)
      // RC-025 Blood Rush: every damage-kill (re)starts the fire-rate burst window.
      if (this.hasRelic('blood_rush')) this.bloodRushUntil = this.elapsed + BLOOD_RUSH_DURATION_MS;
      // RC-026: if this was a shrine guardian, retire it from the wave set — the last one pays out.
      this.onShrineWaveDeath(enemy.getData('uid'));
      // RC-026: catching the courier (by damage) bursts its mixed jackpot at the death point. The
      // contact-catch path in hitPlayer pays the same way before its destroy().
      if (enemy.getData('poiCourier')) this.payCourierJackpot(ex, ey);
      // RC-018: stop any charger telegraph tween before the sprite is freed.
      this.stopChargerTell(enemy);
      // RC-018: a splitter bursts into weaker children at its death position.
      const split = enemy.getData('split') as { into: string; count: number } | undefined;
      if (split && ENEMIES[split.into]) {
        for (let s = 0; s < split.count; s++) {
          const jx = ex + Phaser.Math.Between(-14, 14), jy = ey + Phaser.Math.Between(-14, 14);
          this.spawnEnemyAt(ENEMIES[split.into], jx, jy);
        }
      }
      // RC-017: one gem per kill, carrying a tier-scaled value (value, not swarm).
      this.dropGem(ex, ey, enemy.getData('drop'));
      // RC-025 Prospector's Eye: a proc duplicates the kill's gem nearby.
      if (rollBonusGem(() => Math.random(), this.hasRelic('prospectors_eye'))) {
        this.dropGem(ex + Phaser.Math.Between(-18, 18), ey + Phaser.Math.Between(-18, 18), enemy.getData('drop'));
      }
      // RC-025 healing layer A: rare food drop on kill (boosted by Harvest Feast).
      if (rollFoodDrop(() => Math.random(), this.hasRelic('harvest_feast'))) {
        this.dropFood(ex, ey);
      }
      // RC-019: a mini-boss kill drops the guaranteed jackpot — a gem burst + one upgraded gem.
      if (enemy.getData('isBoss')) {
        const tier = gemTierForExpeditionTier(this.expedition.tier);
        const base = rewardValueForTier(this.expedition.tier);
        for (const g of bossJackpotGems(base, tier)) {
          const jx = ex + Phaser.Math.Between(-44, 44), jy = ey + Phaser.Math.Between(-44, 44);
          this.dropGem(jx, jy, this.biasedResource(), { valueOverride: g.value, tierOverride: g.tier });
        }
        // RC-031: 35% chance to also drop a fusion catalyst token at the boss position.
        if (dropsCatalyst(() => Math.random())) {
          let picked = false;
          const tok = this.add.text(ex, ey, '⚗️', { fontSize: '28px' }).setOrigin(0.5).setDepth(30) as any;
          this.physics.add.existing(tok);
          // Stable hitbox — not font-metric-dependent (RC-031 review).
          (tok.body as Phaser.Physics.Arcade.Body).setCircle(20, -20, -20);
          this.catalystTokens.push(tok);
          this.physics.add.overlap(this.player, tok, () => {
            if (picked) return;
            picked = true;
            tok.destroy();
            this.catalystTokens = this.catalystTokens.filter((t) => t !== tok);
            this.catalysts += 1;
            playSfx('gem-pickup', { semitones: 12 });
          });
        }
        this.destroyBossHpBar();
        this.bossEnemy = null;
      }
      const xpGain = enemy.getData('xp');
      enemy.destroy();

      // --- Juice: death particles ---
      const particleCount = 6;
      for (let p = 0; p < particleCount; p++) {
        const angle = (p / particleCount) * Math.PI * 2;
        const radius = Phaser.Math.Between(14, 28);
        const px = ex + Math.cos(angle) * 6;
        const py = ey + Math.sin(angle) * 6;
        const particle = this.add.circle(px, py, Phaser.Math.Between(3, 5), 0xffaa33)
          .setAlpha(0.9).setDepth(25);
        this.tweens.add({
          targets: particle,
          x: ex + Math.cos(angle) * radius,
          y: ey + Math.sin(angle) * radius,
          alpha: 0,
          duration: 350,
          ease: 'Power2',
          onComplete: () => particle.destroy(),
        });
      }

      playSfx('enemy-death'); // RC-020
      this.gainXp(xpGain);
    } else {
      playSfx('enemy-hit'); // RC-020
      enemy.setData('hp', hp);
      // RC-040: a non-fatal hit may cross the enrage threshold — trigger it now (the profile tick
      // also checks, but this makes the tint/speed boost land on the hit that crossed the line).
      if (enemy.getData('enrage') && !enemy.getData('enraged')) this.maybeEnrage(enemy);
    }
  }

  private hitPlayer(enemy: any) {
    // RC-026: touching the courier IS the catch (incl. the stealth-catch of a still-sleeping one).
    // Pay its jackpot then destroy BEFORE the generic non-boss kamikaze destroy below. contactDamage
    // is 0 so this never harms the player; no player-hit feedback — it's a reward, not a hit.
    if (enemy.getData('poiCourier')) {
      const ex = enemy.x, ey = enemy.y;
      this.stopChargerTell(enemy);
      enemy.destroy();
      this.payCourierJackpot(ex, ey);
      return;
    }
    // RC-035: read contactDamage BEFORE any branch so destroy() can't null the DataManager first.
    const contactDamage = (enemy.getData('contactDamage') as number | undefined) ?? 0;
    // The boss is exempt from kamikaze destruction — it deals contact damage and stays alive.
    // Non-boss enemies keep the old one-hit kamikaze behavior.
    const isBoss = enemy.getData('isBoss') as boolean | undefined;
    if (isBoss) {
      // Wake a sleeping boss on contact so the banner + HP bar trigger naturally.
      this.wakeEnemy(enemy);
      // Throttle repeated contact damage to ~800 ms so sustained overlap doesn't instantly drain HP.
      const nextHit = (enemy.getData('bossNextContactMs') as number | undefined) ?? -Infinity;
      if (this.elapsed < nextHit) return;
      enemy.setData('bossNextContactMs', this.elapsed + 800);
      this.stats.hp -= contactDamage;
    } else {
      this.stats.hp -= contactDamage;
      this.stopChargerTell(enemy);
      enemy.destroy();
    }
    playSfx('player-hit'); // RC-020
    // --- Juice: a red screen flash + the hero flashing red so a hit is unmistakable, plus shake ---
    this.cameras.main.flash(110, 130, 0, 0);
    this.cameras.main.shake(120, 0.008);
    this.player.setTintFill(0xff3333);
    this.time.delayedCall(90, () => { if (this.player?.active) this.player.clearTint(); });
    if (this.stats.hp <= 0 && !this.trySecondWind()) this.finish(true);
    // RC-025 Bramble Mail: contact attackers that survive the touch (bosses) take thorn damage.
    if (this.hasRelic('bramble_mail') && !this.finished && enemy?.active) {
      this.applyDamageToEnemy(enemy, BRAMBLE_DAMAGE);
    }
  }

  private dropGem(x: number, y: number, resource: Resource, opts?: { valueOverride?: number; tierOverride?: GemTier }) {
    // RC-038: jackpot bursts at wall-adjacent shrines/couriers scatter loot on a ring that can land
    // in the wall band — clamp so every gem is reachable inside the playable field.
    const cg = clampToPlayable(x, y, this.layout.width, this.layout.height, WALL_THICKNESS + 24);
    x = cg.x; y = cg.y;
    const tier = opts?.tierOverride ?? gemTierForExpeditionTier(this.expedition.tier);
    const value = opts?.valueOverride ?? rewardValueForTier(this.expedition.tier);
    // RC-022 B5: display size scales with the value tier so a jackpot reads bigger at a glance.
    const sizePx = 14 * RUN_SCALE * gemDisplayScale(value, this.expedition.tier);
    const gem = this.add.image(x, y, gemSpriteId(resource, tier)) as any;
    gem.setDisplaySize(sizePx, sizePx);
    this.physics.add.existing(gem);
    this.gems.add(gem);
    gem.setData('resource', resource);
    gem.setData('value', value);
    // RC-022 B5: value-major gems get a soft additive glow behind them, gem-tinted, gently pulsing.
    // Not rare: the boss jackpot AND every per-kill drop at tier 6+ qualify, so dozens can glow
    // concurrently late-game — each is one circle + one tween, cheap. Cheaper than postFX; parented
    // to follow the gem (and torn down with it) so the magnet sweep carries the glow along.
    if (gemValueTier(value, this.expedition.tier) === 'major') {
      const tint = this.gemGlowColor(resource);
      const glow = this.add.circle(x, y, sizePx * 0.85, tint, 0.3)
        .setDepth(gem.depth - 1).setBlendMode(Phaser.BlendModes.ADD);
      gem.setData('glow', glow);
      this.tweens.add({
        targets: glow, scaleX: 1.35, scaleY: 1.35, alpha: 0.5,
        duration: 520, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
      });
    }
    // --- Juice: pulsing scale yoyo so gems read as collectible ---
    this.tweens.add({
      targets: gem,
      scaleX: gem.scaleX * 1.15,
      scaleY: gem.scaleY * 1.15,
      duration: 380,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /** RC-022 B5: a bright, resource-keyed glow color for top-tier gems (matches the gem palette). */
  private gemGlowColor(resource: Resource): number {
    switch (resource) {
      case 'exploration': return 0x66ddff;
      case 'science':     return 0x88ccff;
      case 'industry':    return 0xffcc66;
      case 'culture':     return 0xff88dd;
      default:            return 0xffffff;
    }
  }

  private collectGem(gem: any) {
    const value = gem.getData('value') ?? 1;
    this.collected[gem.getData('resource') as Resource] += value;
    playSfx('gem-pickup', { semitones: gemValueToSemitones(value) }); // RC-020: chime pitched by value
    const glow = gem.getData('glow'); // RC-022 B5: tear down the top-tier glow with its gem
    if (glow?.active) glow.destroy();
    gem.destroy();
  }

  /** RC-025: spawn a food pickup (healing layer A), clamped into the playable field like gems. */
  private dropFood(x: number, y: number) {
    const cg = clampToPlayable(x, y, this.layout.width, this.layout.height, WALL_THICKNESS + 24);
    const food = this.add.image(cg.x, cg.y, 'food_ration') as any;
    food.setDisplaySize(16 * RUN_SCALE, 16 * RUN_SCALE);
    food.setDepth(8);
    this.physics.add.existing(food);
    this.foods.add(food);
  }

  /** RC-025: eat on touch — heals 5 HP (×2 with Harvest Feast), capped at maxHp. */
  private collectFood(food: any) {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + foodHeal(this.hasRelic('harvest_feast')));
    playSfx('gem-pickup', { semitones: 7 }); // distinct upward chime vs. gem pitches
    food.destroy();
  }

  private gainXp(amount: number) {
    const r = addXp(this.stats, Math.round(amount * this.stats.xpMult)); // RC-031 passives: xpMult
    this.stats = r.stats;
    if (r.levelsGained > 0) {
      playSfx('level-up'); // RC-020
      this.pendingDrafts += r.levelsGained;
      // Only trigger openDraft if we're not already inside a draft (paused).
      // If already paused, the queue will be drained by the card pointerdown handler.
      if (!this.paused) this.openDraft();
    }
  }

  private openDraft() {
    if (this.pendingDrafts <= 0) return;
    this.pendingDrafts -= 1;
    this.paused = true;
    this.physics.pause();
    playSfx('draft-open'); // RC-020 (reroll re-renders without re-opening, so no extra sound)
    this.renderDraft();
  }

  /** Rolls a fresh set of options and draws the draft panel. Called on open and on reroll. */
  private renderDraft() {
    const picks = rollDraft(() => Math.random(), this.mods.draftChoices, {
      equipped: this.equipped,
      passives: this.passives,
      kitPool: this.mods.weapons,
      catalysts: this.catalysts,
      relicPool: this.mods.relics ?? [],
      relic: this.relic,
    });
    const { width, height } = this.scale;
    const panel = this.add.container(0, 0).setDepth(20);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    panel.add(bg);
    // RC-022 #13: responsive layout — compute slot positions/sizes from the option count + viewport
    // so high-draftChoices builds never overflow (1-col → 2-col → shrunk pitch as needed).
    const lay = draftLayout(picks.length, width, height);
    const queueSuffix = this.pendingDrafts > 0 ? ` (+${this.pendingDrafts} more)` : '';
    const title = this.add.text(width / 2, lay.titleY, `Level up — choose one${queueSuffix}`,
      { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
    panel.add(title);

    const closeAndAdvance = () => {
      panel.destroy();
      if (this.pendingDrafts > 0) {
        this.openDraft();
      } else {
        this.paused = false;
        this.physics.resume();
      }
    };

    // When the pitch is shrunk for many options, scale the type down a touch so two lines still fit
    // inside the shorter card (the 64px-pitch baseline used 15/12px label/sub).
    const tight = lay.pitch < 56;
    const labelPx = tight ? 13 : 15;
    const subPx = tight ? 11 : 12;
    const labelDy = lay.cardH / 4;

    picks.forEach((opt, i) => {
      const slot = lay.slots[i];
      const cx = slot.x, y = slot.y;
      // RC-031: fusion options read as the premium choice — gold card + gold text.
      const isFusion = opt.kind === 'fuseWeapons' || opt.kind === 'fusePassives';
      const isRelic = opt.kind === 'newRelic';
      const cardColor = isFusion ? 0x8a6d1a : isRelic ? 0x5a2ea6 : 0x238636;
      const labelColor = isFusion ? '#ffd75e' : isRelic ? '#dcc8ff' : '#fff';
      const card = this.add.rectangle(cx, y, slot.w, slot.h, cardColor)
        .setInteractive({ useHandCursor: true });
      // rc-017's two-line card (title + what-it-does) driving rc-028's centralized advance flow,
      // so the Oratory reroll path stays intact.
      const label = this.add.text(cx, y - labelDy, this.draftLabel(opt),
        { fontSize: `${labelPx}px`, color: labelColor, fontStyle: 'bold' }).setOrigin(0.5);
      card.on('pointerdown', () => { playSfx('draft-select'); this.applyDraftOption(opt); closeAndAdvance(); });
      panel.add(card); panel.add(label);
      // RC-031: passive cards show their tradeoff with each comma-segment colored by sign — green
      // gains, red costs — laid out as a centered row. Everything else keeps the single sub line.
      // RC-022 #3: both rows clamp to the card width (scale font down to a 9px floor on overflow).
      if (opt.kind === 'newPassive' || opt.kind === 'levelPassive') {
        for (const t of this.tradeoffSegments(this.draftDescription(opt), cx, y + labelDy, slot.w - 24, subPx)) panel.add(t);
      } else {
        const sub = this.add.text(cx, y + labelDy, this.draftDescription(opt),
          { fontSize: `${subPx}px`, color: isFusion ? '#ffe9a8' : isRelic ? '#e9defc' : '#d2f0d8' }).setOrigin(0.5);
        this.clampTextWidth(sub, slot.w - 24, subPx);
        panel.add(sub);
      }
    });

    // Oratory reroll affordance: re-roll the current options without consuming the level-up.
    if (this.rerollsLeft > 0) {
      const ry = lay.rerollY;
      const rerollBtn = this.add.rectangle(width / 2, ry, 380, 40, 0x6e40c9)
        .setInteractive({ useHandCursor: true });
      const rerollLabel = this.add.text(width / 2, ry, `🔄 Reroll (${this.rerollsLeft} left)`,
        { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
      rerollBtn.on('pointerdown', () => {
        this.rerollsLeft -= 1;
        panel.destroy();
        this.renderDraft(); // stay paused, same pending count, fresh options
      });
      panel.add(rerollBtn); panel.add(rerollLabel);
    }

    // Phaser containers do not propagate scrollFactor to children for input hit-testing — each
    // child must carry scrollFactor 0 itself or the cards render screen-fixed yet hit-test at
    // world coords (unclickable once the camera scrolls). Container.setScrollFactor's
    // updateChildren arg did NOT stamp children in Phaser 3.90 (verified live), so stamp each
    // child explicitly.
    panel.setScrollFactor(0);
    panel.each((child: Phaser.GameObjects.GameObject & { setScrollFactor: (v: number) => void }) =>
      child.setScrollFactor(0));
  }

  private draftLabel(o: DraftOption): string {
    switch (o.kind) {
      case 'fuseWeapons': return o.early
        ? '⚗️ FUSE NOW (catalyst — weaker hybrid)'
        : `⚒️ FUSE: ${defOf(this.equipped[0]).name} + ${defOf(this.equipped[1]).name}`;
      case 'fusePassives': return '⚗️ Fuse passives';
      case 'newWeapon': return o.replaceId
        ? `Swap ${defOf(this.equipped.find((w) => w.id === o.replaceId)!).name} → ${WEAPONS[o.weaponId].name}`
        : `New weapon: ${WEAPONS[o.weaponId].name}`;
      case 'levelWeapon': {
        const w = this.equipped.find((x) => x.id === o.weaponId)!;
        return `Upgrade: ${defOf(w).name} (Lv ${w.level}→${Math.min(w.level + 1, defOf(w).maxLevel)})`;
      }
      case 'newPassive': return `${PASSIVES[o.passiveId].icon} ${PASSIVES[o.passiveId].name}`;
      case 'levelPassive': {
        const p = this.passives.find((x) => x.id === o.passiveId)!;
        return `${passiveDefOf(p).icon} ${passiveDefOf(p).name} (Lv ${p.level}→${p.level + 1})`;
      }
      case 'newRelic': return `${RELICS[o.relicId].icon} RELIC: ${RELICS[o.relicId].name}`;
    }
  }

  /** The second, smaller line on a draft card: what the option actually does. */
  private draftDescription(o: DraftOption): string {
    switch (o.kind) {
      case 'fuseWeapons': return fusionName(
        [...new Set([...resolveShape(defOf(this.equipped[0])).bases, ...resolveShape(defOf(this.equipped[1])).bases])],
      );
      case 'fusePassives': return 'Merge both passives into one — frees a slot';
      case 'newWeapon': if (o.replaceId) {
        const cur = this.equipped.find((w) => w.id === o.replaceId)!;
        return `${weaponStatText(defOf(cur))}  →  ${weaponStatText(WEAPONS[o.weaponId])}`;
      }
        return weaponStatText(WEAPONS[o.weaponId]);
      case 'levelWeapon': return weaponLevelGainText(defOf(this.equipped.find((w) => w.id === o.weaponId)!));
      case 'newPassive': return PASSIVES[o.passiveId].desc;
      case 'levelPassive': return passiveDefOf(this.passives.find((p) => p.id === o.passiveId)!).desc;
      case 'newRelic': return RELICS[o.relicId].desc;
    }
  }

  /** RC-031: render a passive's tradeoff desc ("+10% damage, −5% fire rate") as a centered row of
   *  per-segment texts colored by leading sign — green gains, red costs. Comma-separated; a fused
   *  passive's 3 segments each color independently. Returns the created texts (caller adds them to
   *  the panel so the scrollFactor(0) stamp applies). A "  ·  " separator sits between segments. */
  private tradeoffSegments(desc: string, cx: number, cy: number, maxWidth?: number, basePx = 12): Phaser.GameObjects.Text[] {
    const SEP = '  ·  ';
    const segments = desc.split(', ').map((s) => s.trim());
    // Build each segment (and the separators) as origin-(0,0) texts, measure total width, then
    // place them left-to-right starting at the centered left edge.
    let fontPx = basePx;
    const build = (px: number): Phaser.GameObjects.Text[] => {
      const parts: Phaser.GameObjects.Text[] = [];
      segments.forEach((seg, idx) => {
        const negative = seg.startsWith('−') || seg.startsWith('-');
        const color = negative ? '#ff9f9f' : '#9fe6a0';
        if (idx > 0) {
          parts.push(this.add.text(0, cy, SEP, { fontSize: `${px}px`, color: '#88aa99' }).setOrigin(0, 0.5));
        }
        parts.push(this.add.text(0, cy, seg, { fontSize: `${px}px`, color }).setOrigin(0, 0.5));
      });
      return parts;
    };
    let parts = build(fontPx);
    // RC-022 #3: if the row overruns the card, shrink font proportionally (floor 9px) and rebuild.
    if (maxWidth) {
      let total = parts.reduce((w, t) => w + t.width, 0);
      if (total > maxWidth) {
        fontPx = Math.max(9, Math.floor(fontPx * (maxWidth / total)));
        parts.forEach((t) => t.destroy());
        parts = build(fontPx);
      }
    }
    const total = parts.reduce((w, t) => w + t.width, 0);
    let x = cx - total / 2;
    for (const t of parts) { t.setX(x); x += t.width; }
    return parts;
  }

  /** RC-022 #3: shrink a single-line text's font (down to a 9px floor) until it fits maxWidth.
   *  Mechanical clamp for long swap stat rows ("current → offered") on narrow cards. */
  private clampTextWidth(t: Phaser.GameObjects.Text, maxWidth: number, basePx: number) {
    if (t.width <= maxWidth) return;
    const px = Math.max(9, Math.floor(basePx * (maxWidth / t.width)));
    t.setFontSize(px);
  }

  private applyDraftOption(o: DraftOption) {
    switch (o.kind) {
      case 'fuseWeapons': {
        const [a, b] = this.equipped;
        const hybrid = fuseWeapons(
          { def: defOf(a), level: a.level }, { def: defOf(b), level: b.level },
        );
        if (o.early) this.catalysts = Math.max(0, this.catalysts - 1);
        this.equipped = equipHybrid(hybrid);
        this.weaponCooldowns = {};
        this.celebrateFusion(hybrid.name);
        break;
      }
      case 'fusePassives':
        this.passives = fusePassives(this.passives) ?? this.passives;
        this.refreshStatsFromPassives();
        break;
      case 'newWeapon':
        this.equipped = o.replaceId
          ? swapWeapon(this.equipped, o.replaceId, o.weaponId)
          : addWeapon(this.equipped, o.weaponId);
        break;
      case 'levelWeapon': this.equipped = levelWeapon(this.equipped, o.weaponId); break;
      case 'newPassive':  this.passives = addPassive(this.passives, o.passiveId); this.refreshStatsFromPassives(); break;
      case 'levelPassive': this.passives = levelPassive(this.passives, o.passiveId); this.refreshStatsFromPassives(); break;
      case 'newRelic': this.relic = o.relicId; break;
    }
  }

  /** RC-031 fusion celebration (spec §5): gold camera flash + shake + reused age-up cue, then a
   *  screen-fixed name banner that pops in (Back.easeOut) and fades after a beat. The banner MUST
   *  carry setScrollFactor(0) — the run camera scrolls, so a world-anchored banner would drift. */
  private celebrateFusion(name: string) {
    this.cameras.main.flash(420, 255, 215, 90);
    this.cameras.main.shake(180, 0.008);
    playSfx('age-up'); // reuse the celebration cue until a bespoke 'fuse' recipe lands
    const banner = this.add.text(this.scale.width / 2, this.scale.height * 0.3,
      `⚒️ ${name}`, { fontSize: '40px', color: '#ffd75e', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 },
    ).setOrigin(0.5).setDepth(60).setScrollFactor(0).setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({ targets: banner, alpha: 0, delay: 1500, duration: 600, onComplete: () => banner.destroy() });
  }

  /** Rebuild stats from the run's base whenever passives change (recompute model). */
  private refreshStatsFromPassives() {
    const ratio = this.stats.hp / this.stats.maxHp;
    // Carry the live run progression across the recompute: baseStats is the create()-time snapshot
    // (level 1, xp 0), so a bare recomputeStats() would reset the player's level/xp on every passive
    // pick. Preserve the CURRENT level/xp (same pattern as chargesSpent below).
    const { level, xp } = this.stats;
    this.stats = recomputeStats(this.baseStats, this.passives, ratio);
    this.stats.level = level;
    this.stats.xp = xp;
    // recomputeStats yields the new MAX; consumption is tracked separately so passive picks can't
    // refund already-spent charges (RC-031 infinite-charges bug fix).
    this.stats.activeCharges = Math.max(0, this.stats.activeCharges - this.chargesSpent);
  }

  private finish(died: boolean) {
    if (this.finished) return;
    this.finished = true;
    this.destroyBossHpBar();
    // finish() can be called from inside a physics collision callback (e.g. death via hitPlayer).
    // onComplete stops this scene, which destroys the physics groups — doing that mid-collision-step
    // crashes Phaser as it keeps iterating colliders over freed groups. So defer the hand-off to the
    // top of the next update(), after the physics step has fully unwound.
    this.pendingComplete = {
      collected: applyHaulMult({ ...this.collected }, this.mutFx.rewardMult),
      survivedMs: this.elapsed,
      died,
      tier: this.expedition.tier,
      mutators: [...this.mutatorIds],
      rewardMult: this.mutFx.rewardMult,
      kills: this.kills,
      // RC-042: surviving the finale = the mothership fell (its death is the only finish(false)
      // path here — the auto zone-clear is finale-suppressed). Death/abandon (died) banks normally
      // with no flag, so the Last Stand stays replayable until won.
      ...(this.finale && !died ? { finaleVictory: true } : {}),
    };
  }

  // ---------------------------------------------------------------------------
  // RC-039: ESC pause menu. Reuses the draft overlay's pause mechanics (paused flag +
  // physics.pause/resume); main.ts owns the DOM overlay and drives the buttons via the
  // public methods below.
  // ---------------------------------------------------------------------------

  /** ESC handler: open the pause menu, or close it if it's already open. A no-op while a draft is
   *  open (paused but not via the pause menu), during the victory ceremony, or after the run has
   *  finished — ESC there must not desync the pause state. */
  private togglePauseMenu() {
    if (this.pauseMenuOpen) { this.closePauseMenu(); return; }
    if (this.paused || this.ceremony || this.finished) return; // draft up / wrapping up — leave alone
    this.openPauseMenu();
  }

  private openPauseMenu() {
    if (this.pauseMenuOpen) return; // idempotent — never stack
    this.pauseMenuOpen = true;
    this.paused = true;
    this.physics.pause();
    this.onPauseMenu?.(true);
  }

  /** Close the pause menu and resume play. Public so main.ts's Resume button can call it. Idempotent
   *  and a no-op once the run has finished (the scene is being torn down). */
  closePauseMenu() {
    if (!this.pauseMenuOpen) return;
    this.pauseMenuOpen = false;
    this.onPauseMenu?.(false);
    if (this.finished) return; // run already ending — don't un-pause a dying scene
    this.paused = false;
    this.physics.resume();
  }

  /** Abandon the expedition: bank the partial haul EXACTLY like death (voluntary death, no corpse).
   *  Routes through finish(true) so banking, best-haul tracking, and the end screen all behave; the
   *  deferred pendingComplete drains at the top of the next update() (which runs even while paused). */
  abandonRun() {
    this.pauseMenuOpen = false;
    this.finish(true);
  }

  /** Discard the run with NO banking — used when loading a save from the pause menu (you're rewinding,
   *  so the run never happened). Stops the scene cleanly WITHOUT calling onComplete, so main.ts owns
   *  the subsequent civ-screen transition via its load path. */
  discardRun() {
    this.pauseMenuOpen = false;
    this.finished = true; // block any in-flight finish()/ceremony from also firing onComplete
    this.onPauseMenu?.(false);
    this.scene.stop();
  }
}
