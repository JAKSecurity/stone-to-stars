import Phaser from 'phaser';
import { RunModifiers, RunResult, Resource, RESOURCES, Expedition, BiomeDef, EnemyDef } from '../game/types';
import { runDurationForTier } from '../game/config';
import { initialRunStats, addXp } from '../run/runStats';
import { applyPerk } from '../run/draft';
import {
  EquippedWeapon, initialWeapons, addWeapon, levelWeapon, applyEvolve,
  weaponShot, WeaponShot, rollRunDraft, DraftOption,
  weaponStatText, weaponLevelGainText, weaponClass,
} from '../run/weapons';
import { WEAPONS } from '../run/weaponData';
import { BIOMES } from '../run/biomeData';
import { ENEMIES } from '../run/enemyData';
import { pickEnemy, apexEnemyId } from '../run/expedition';
import { GemTier, gemTierForExpeditionTier, gemSpriteId } from '../run/gemTier';
import { rewardValueForTier } from '../game/economy';
import { spawnTableAt } from '../run/spawnEscalation';
import {
  shouldSpawnBoss, bossFreeTable, bossJackpotGems,
  BOSS_HP_MULT, BOSS_TELEGRAPH_MS,
} from '../run/bossEvent';
import { playSfx } from '../audio';
import {
  orbitAngle, orbitPosition, lobFlightMs, lobProgress, lobGroundPosition, lobArcHeight, withinRadius,
  ORBIT_RADIUS, ORBIT_HIT_INTERVAL_MS, LOB_BLAST_RADIUS, LOB_PEAK_HEIGHT,
} from '../run/projectileMotion';
import {
  ChargerState, ChargerPhase, initChargerState, chargerStep, CHARGER_CONFIG,
  circlerVelocity, CIRCLER_RADIUS, standoffVelocity, STANDOFF_MIN, STANDOFF_MAX,
} from '../run/enemyBehavior';

// Sprites + movement render at 2x and the play field fills the window (the field is the canvas size).
const RUN_SCALE = 2;

// RC-020: pitch the gem-pickup chime up by the gem's value (kept musical, ~one-octave span).
const gemValueToSemitones = (v: number) => Math.min(12, Math.floor(Math.log2(Math.max(1, v)) * 2));

// End-of-run "Zone Cleared" ceremony: clear non-boss enemies, magnet every gem in, then summarize.
const CEREMONY_MS = 3000;

// Hard cap on enemy projectiles alive at once — guarantees there are never more than this many to
// dodge, even at end-game mob density. Combined with low per-enemy fire cadence below.
const MAX_ENEMY_BULLETS = 10;

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
}

export class RunScene extends Phaser.Scene {
  private mods!: RunModifiers;
  private onComplete!: (r: RunResult) => void;
  private stats = initialRunStats({
    maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'],
    pickupRadius: 60, moveSpeedMult: 1, fireRateMult: 1,
    draftRerolls: 0, startWeaponLevel: 1,
  });
  private expedition!: Expedition;
  private biome!: BiomeDef;

  private player!: Phaser.GameObjects.Image & { body: Phaser.Physics.Arcade.Body };
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private gems!: Phaser.Physics.Arcade.Group;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

  private collected: Record<Resource, number> = { exploration: 0, science: 0, industry: 0, culture: 0 };
  private elapsed = 0;
  private runDurationMs = runDurationForTier(0);
  private equipped: EquippedWeapon[] = initialWeapons();
  private ownedPerks: string[] = [];
  private weaponCooldowns: Record<string, number> = {};
  private spawnCooldown = 0;
  private bossId = '';
  private bossSpawned = false;
  private bossEnemy: any = null;
  private trickleBiome!: BiomeDef;          // biome.spawnTable minus the boss (the random-spawn pool)
  private bossHp?: { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text };
  private explorationCooldown = 0;
  private relicCooldown = 0;
  private resourceCooldown = 0;
  private paused = false;
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
  }> = [];
  private hud!: Phaser.GameObjects.Text;
  private heroSprite = 'hero';

  constructor() { super('run'); }

  init(data: RunInit) {
    this.mods = data.modifiers;
    this.onComplete = data.onComplete;
    this.expedition = data.expedition;
    this.biome = BIOMES[data.expedition.biomeId];
    this.runDurationMs = runDurationForTier(data.expedition.tier);
    this.heroSprite = data.heroSprite ?? 'hero';
    this.stats = initialRunStats(this.mods);
    this.collected = { exploration: 0, science: 0, industry: 0, culture: 0 };
    this.elapsed = 0; this.spawnCooldown = 0;
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
    this.ownedPerks = [];
    this.weaponCooldowns = {};
    this.explorationCooldown = 0; this.relicCooldown = 0; this.resourceCooldown = 0;
    this.paused = false; this.finished = false; this.pendingComplete = null; this.pendingDrafts = 0;
    this.ceremony = false; this.ceremonyMs = 0;
    this.lobs = [];
  }

  create() {
    const { width, height } = this.scale;
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor(this.biome.visual?.ground ?? this.biome.tint);
    this.drawBackground(width, height);

    const player = this.add.image(width / 2, height / 2, this.heroSprite);
    player.setDisplaySize(34 * RUN_SCALE, 42 * RUN_SCALE);
    this.physics.add.existing(player);
    this.player = player as any;
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    // The sprite frame has transparent padding, so the default body is wider than the visible hero and
    // you'd snag on obstacle corners with room to spare. Shrink the body to ~64% of the display,
    // centered, so collisions match what you see. (shrinkBody sizes proportionally, not in raw px.)
    this.shrinkBody(this.player, 0.64);

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.gems = this.physics.add.group();
    this.obstacles = this.physics.add.staticGroup();
    this.scatterObstacles(width, height);

    this.keys = {
      up: this.input.keyboard!.addKey('W'),
      down: this.input.keyboard!.addKey('S'),
      left: this.input.keyboard!.addKey('A'),
      right: this.input.keyboard!.addKey('D'),
    };

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.hitEnemy(b as any, e as any));
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.hitPlayer(e as any));
    this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => this.hitPlayerProjectile(b as any));
    this.physics.add.overlap(this.player, this.gems, (_p, g) => this.collectGem(g as any));
    // Obstacles block movement for both the player and the chasing enemies (they bunch up on them).
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);

    this.hud = this.add.text(12, 12, '',
      { fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setDepth(10);

    // RC-019: the biome's toughest enemy becomes an announced mini-boss — pull it from the random
    // spawn pool (the card threat-rating still reads it from the untouched biome.spawnTable).
    this.bossId = apexEnemyId(this.biome.spawnTable);
    this.bossSpawned = false;
    this.bossEnemy = null;
    this.bossHp = undefined;
    this.trickleBiome = { ...this.biome, spawnTable: bossFreeTable(this.biome.spawnTable, this.bossId) };
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

    const specks = Math.min(600, Math.round((width * height) / 9000));
    for (let i = 0; i < specks; i++) {
      this.add.circle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 2), speckColor, v ? 0.4 : 0.06).setDepth(-9);
    }
  }

  /** Scatter static collidable terrain — biome-themed sprites (RC-021) — keeping the spawn area clear.
   *  Visual only: the collision body is the same inset circle regardless of the prop's look. */
  private scatterObstacles(width: number, height: number) {
    const set = this.biome.visual?.obstacles ?? [];
    const count = Math.round((width * height) / 90000) + 4;
    const cx = width / 2, cy = height / 2;
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, tries = 0;
      do {
        x = Phaser.Math.Between(70, width - 70);
        y = Phaser.Math.Between(70, height - 70);
        tries++;
      } while (Phaser.Math.Distance.Between(x, y, cx, cy) < 200 && tries < 25);
      const r = Phaser.Math.Between(26, 46);

      let obj: Phaser.GameObjects.GameObject & { body: Phaser.Physics.Arcade.Body };
      if (set.length) {
        const id = set[Phaser.Math.Between(0, set.length - 1)];
        const img = this.add.image(x, y, id).setDepth(-1);
        img.setDisplaySize(r * 2, r * 2); // match the old ellipse footprint
        obj = img as any;
      } else {
        const rock = this.add.ellipse(x, y, r * 2, r * 1.6, 0x000000, 0.4).setDepth(-1);
        rock.setStrokeStyle(2, 0xffffff, 0.08);
        obj = rock as any;
      }
      this.physics.add.existing(obj, true);
      // UNCHANGED collision behavior — an inset circle inside the footprint (rc-017's snag fix).
      // Sprites are square (r*2 × r*2), so the body is centred symmetrically.
      const cr = r * 0.8;
      (obj.body as unknown as Phaser.Physics.Arcade.StaticBody).setCircle(cr, r - cr, r - cr);
      this.obstacles.add(obj);
    }
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
    if (this.paused || !this.player?.body) return;
    const dt = deltaMs;
    // Once the timer expires we hand off to the Zone-Cleared ceremony, which runs its own trimmed
    // loop (no spawns, no faucets) — just sweep gems in — until it finishes the run.
    if (this.ceremony) { this.updateCeremony(dt); return; }
    this.elapsed += dt;

    const speed = 180 * RUN_SCALE * this.stats.moveSpeedMult;
    const b = this.player.body;
    b.setVelocity(0);
    if (this.keys.left.isDown) b.setVelocityX(-speed);
    if (this.keys.right.isDown) b.setVelocityX(speed);
    if (this.keys.up.isDown) b.setVelocityY(-speed);
    if (this.keys.down.isDown) b.setVelocityY(speed);

    for (const w of this.equipped) {
      this.weaponCooldowns[w.id] = (this.weaponCooldowns[w.id] ?? 0) - dt;
      if (this.weaponCooldowns[w.id] <= 0) {
        const shot = weaponShot(WEAPONS[w.id], w.level, this.stats.damageMult);
        this.fireWeapon(shot, w.id);
        this.weaponCooldowns[w.id] = shot.cooldownMs / this.stats.fireRateMult;
      }
    }

    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0) {
      this.spawnEnemy();
      // Start gentle and ramp up — sparse at first, busier over the run. Base widened to 2000ms
      // for a calmer early game (the 150ms floor keeps late-game density unchanged).
      const ramp = 1 + this.elapsed / 30000;
      this.spawnCooldown = Math.max(150, 2000 / ramp);
    }

    // RC-019: announce the mini-boss once the run is ~70% through.
    if (shouldSpawnBoss(this.elapsed, this.runDurationMs, this.bossSpawned)) {
      this.bossSpawned = true;
      this.announceBoss();
    }
    if (this.bossHp) {
      if (this.bossEnemy?.active) this.updateBossHpBar();
      else this.destroyBossHpBar();
    }

    this.explorationCooldown -= dt;
    if (this.explorationCooldown <= 0) {
      this.collected.exploration += rewardValueForTier(this.expedition.tier);
      this.explorationCooldown = 4000 / (this.biome.resourceBias.exploration ?? 1);
    }

    // Culture relics appear periodically as walk-over pickups (design: villages/relics give culture).
    this.relicCooldown -= dt;
    if (this.relicCooldown <= 0) {
      const { width, height } = this.scale;
      this.dropGem(Phaser.Math.Between(40, width - 40), Phaser.Math.Between(40, height - 40), 'culture');
      this.relicCooldown = 5000 / (this.biome.resourceBias.culture ?? 1);
    }

    // Scattered resource deposits — income you gather by exploring the field, not just from kills.
    this.resourceCooldown -= dt;
    if (this.resourceCooldown <= 0) {
      const { width, height } = this.scale;
      this.dropGem(Phaser.Math.Between(40, width - 40), Phaser.Math.Between(40, height - 40), this.biasedResource());
      this.resourceCooldown = 2600;
    }

    (this.enemies.getChildren() as any[]).forEach((e) => {
      this.updateEnemyMovement(e, dt);
    });
    this.updateEnemyFire(dt);

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
        this.detonate(lob.target.x, lob.target.y, lob.damage);
        lob.img.destroy();
        this.lobs.splice(i, 1);
      }
    }

    this.hud.setText(
      `HP ${Math.ceil(this.stats.hp)}/${this.stats.maxHp}  Lv${this.stats.level}  ` +
      `🧭${this.collected.exploration} 🔬${this.collected.science} 🏭${this.collected.industry} 🎭${this.collected.culture}  ` +
      `⏱ ${Math.max(0, Math.ceil((this.runDurationMs - this.elapsed) / 1000))}s`,
    );

    if (this.elapsed >= this.runDurationMs) this.startCeremony();
  }

  /**
   * Gems are vacuumed in only within pickupRadius — outside it they stay put, so collection is
   * positional and the radius (widened by the Magnet perk) actually matters. The Zone-Cleared
   * ceremony reuses this with a screen-sized radius to sweep everything in.
   */
  private vacuumGems() {
    (this.gems.getChildren() as any[]).forEach((g) => {
      const d = Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y);
      if (d < this.stats.pickupRadius * RUN_SCALE) {
        this.physics.moveToObject(g, this.player, 340 * RUN_SCALE);
      } else {
        g.body.setVelocity(0, 0);
      }
    });
  }

  /**
   * Timer's up: flash a "Zone Cleared" banner, wipe every non-boss enemy (each drops its gem as a
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
    // Freeze the hero and magnet radius out past the screen so every gem flies in.
    this.player.body.setVelocity(0, 0);
    this.stats.pickupRadius = Math.max(this.scale.width, this.scale.height);

    this.showZoneClearedBanner();
  }

  private updateCeremony(dt: number) {
    this.player.body.setVelocity(0, 0);
    this.vacuumGems();
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
    }).setOrigin(0.5).setDepth(40).setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: txt, scale: 1, alpha: 1, duration: 360, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: txt, alpha: 0, delay: CEREMONY_MS - 700, duration: 650,
      onComplete: () => txt.destroy(),
    });
  }

  private fireWeapon(shot: WeaponShot, weaponId: string) {
    if (shot.behavior === 'orbit') { this.summonOrbit(shot, weaponId); return; } // persistent ring — no per-refresh shot sound
    playSfx('shoot'); // RC-020 (recipe self-throttles); lob + straight/cone fire a projectile
    if (shot.behavior === 'lob') { this.fireLob(shot); return; }
    const target = this.nearestEnemy() as any;
    const baseAngle = target
      ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y)
      : -Math.PI / 2;
    for (let i = 0; i < shot.count; i++) {
      // fan the volley around the aim angle when there is more than one projectile
      const offset = shot.count > 1
        ? (i - (shot.count - 1) / 2) * (shot.spread / (shot.count - 1))
        : 0;
      const angle = baseAngle + offset;
      const bullet = this.add.image(this.player.x, this.player.y, shot.sprite) as any;
      bullet.setDisplaySize(12 * RUN_SCALE, 12 * RUN_SCALE);
      this.physics.add.existing(bullet);
      this.bullets.add(bullet);
      bullet.setData('damage', shot.damage);
      bullet.setData('pierce', shot.pierce);
      bullet.setData('ignoresArmor', shot.ignoresArmor);
      bullet.body.setVelocity(Math.cos(angle) * shot.speed * RUN_SCALE, Math.sin(angle) * shot.speed * RUN_SCALE);
      // Range = speed × life; earlier weapons get a shorter life so their shots don't cross the field.
      this.time.delayedCall(shot.lifeMs, () => bullet.destroy());
    }
  }

  /** Orbit: keep `count` projectiles riding a ring around the player. Re-summoning (each cooldown)
   *  replaces this weapon's ring so it refreshes to the current level without stacking. Orbiter
   *  angle comes from the global run clock, so a replaced ring resumes at the same phase — seamless. */
  private summonOrbit(shot: WeaponShot, weaponId: string) {
    (this.bullets.getChildren() as any[])
      .filter((b) => b.getData('behavior') === 'orbit' && b.getData('weaponKey') === weaponId)
      .forEach((b) => b.destroy());

    for (let i = 0; i < shot.count; i++) {
      const orb = this.add.image(this.player.x, this.player.y, shot.sprite) as any;
      orb.setDisplaySize(PROJ_SIZE, PROJ_SIZE);
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
  private fireLob(shot: WeaponShot) {
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
      this.lobs.push({
        img,
        start: { x: this.player.x, y: this.player.y },
        target: { x: tx, y: ty },
        elapsed: 0,
        flightMs: lobFlightMs(dist, shot.speed * RUN_SCALE),
        damage: shot.damage,
      });
    }
  }

  /** Resolve a lob at its landing point: shock-ring + shake, then AoE damage to enemies in range. */
  private detonate(x: number, y: number, damage: number) {
    const ring = this.add.circle(x, y, LOB_BLAST, 0xffaa33, 0.4).setDepth(24).setScale(0.15);
    this.tweens.add({
      targets: ring, scale: 1, alpha: 0,
      duration: 260, ease: 'Power2', onComplete: () => ring.destroy(),
    });
    this.cameras.main.shake(120, 0.006);
    (this.enemies.getChildren() as any[]).forEach((e) => {
      if (e.active && withinRadius(x, y, e.x, e.y, LOB_BLAST)) {
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

  private spawnEnemy() {
    const { width, height } = this.scale;
    const edge = Phaser.Math.Between(0, 3);
    const x = edge === 0 ? 0 : edge === 1 ? width : Phaser.Math.Between(0, width);
    const y = edge === 2 ? 0 : edge === 3 ? height : Phaser.Math.Between(0, height);

    // RC-017: spawn mix escalates over the run — toward this age's tough enemies + next-age seeds.
    const progress = this.elapsed / this.runDurationMs;
    const table = spawnTableAt(this.trickleBiome, progress, BIOMES, ENEMIES);
    const def = ENEMIES[pickEnemy(table, () => Math.random())];
    this.spawnEnemyAt(def, x, y);
  }

  /** Create one enemy of `def` at (x,y) with all run-state data. Shared by edge spawns and
   *  RC-018 splitter death-spawns. */
  private spawnEnemyAt(def: EnemyDef, x: number, y: number) {
    const enemy = this.add.image(x, y, def.sprite) as any;
    enemy.setDisplaySize(def.displaySize.w * RUN_SCALE, def.displaySize.h * RUN_SCALE);
    this.physics.add.existing(enemy);
    this.enemies.add(enemy);
    enemy.setData('hp', def.baseHp);
    enemy.setData('drop', def.drop);
    enemy.setData('xp', def.xp);
    enemy.setData('speed', def.speed * RUN_SCALE);
    enemy.setData('contactDamage', def.contactDamage);
    enemy.setData('armor', def.armor ?? 0);
    enemy.setData('attack', def.attack);
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

  /** RC-019: warning banner + edge indicator, then the boss arrives after a short telegraph. */
  private announceBoss() {
    const { width, height } = this.scale;
    const edge = Phaser.Math.Between(0, 3);
    const x = edge === 0 ? 0 : edge === 1 ? width : Phaser.Math.Between(0, width);
    const y = edge === 2 ? 0 : edge === 3 ? height : Phaser.Math.Between(0, height);

    playSfx('boss-arrival'); // RC-020 (first wiring of this cue)

    const name = ENEMIES[this.bossId]?.name ?? 'Boss';
    const banner = this.add.text(width / 2, height * 0.22, `⚔ ${name} approaches`, {
      fontSize: '34px', color: '#ffdd55', stroke: '#000', strokeThickness: 5, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(60).setScrollFactor(0);
    this.tweens.add({ targets: banner, alpha: 0, y: banner.y - 20, delay: 1600, duration: 700, onComplete: () => banner.destroy() });

    // Pulsing warning marker at the entry point, cleared when the boss appears.
    const warn = this.add.circle(x, y, 22, 0xff3322, 0.6).setDepth(59);
    this.tweens.add({ targets: warn, scale: 1.8, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });

    this.time.delayedCall(BOSS_TELEGRAPH_MS, () => {
      warn.destroy();
      if (this.finished || this.ceremony) return; // run ended during the telegraph — don't spawn
      this.spawnBoss(x, y);
    });
  }

  /** RC-019: spawn the boss at (x,y) with 5× HP and the isBoss flag, and raise its HP bar. */
  private spawnBoss(x: number, y: number) {
    const def = ENEMIES[this.bossId];
    const e = this.spawnEnemyAt(def, x, y);
    const maxHp = def.baseHp * BOSS_HP_MULT;
    e.setData('hp', maxHp);
    e.setData('maxHp', maxHp);
    e.setData('isBoss', true);
    this.bossEnemy = e;
    this.createBossHpBar();
  }

  private createBossHpBar() {
    const { width } = this.scale;
    const w = Math.min(520, width * 0.6), h = 16, x = (width - w) / 2, y = 18;
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
    const behavior = (e.getData('behavior') ?? 'chase') as string;
    const speed = e.getData('speed') as number;
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
      let fireMs = (e.getData('fireMs') ?? 0) - dt;
      if (fireMs <= 0) {
        const prof = ENEMY_SHOT[atk];
        const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
        const inRange = atk === 'ranged' ? true : d < (prof as typeof ENEMY_SHOT.melee).range;
        if (inRange && this.enemyBullets.countActive(true) < MAX_ENEMY_BULLETS) {
          this.fireEnemyShot(e, atk);
          fireMs = prof.cooldownMs + Phaser.Math.Between(-300, 700);
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

  private hitPlayerProjectile(bullet: any) {
    if (!bullet.active) return;
    this.stats.hp -= bullet.getData('damage') ?? 0;
    bullet.destroy();
    playSfx('player-hit'); // RC-020
    this.cameras.main.flash(90, 130, 0, 0);
    this.player.setTintFill(0xff3333);
    this.time.delayedCall(90, () => { if (this.player?.active) this.player.clearTint(); });
    if (this.stats.hp <= 0) this.finish(true);
  }

  /** A resource id biased toward the biome's lean (but every resource can appear). */
  private biasedResource(): Resource {
    const weights = RESOURCES.map((r) => 0.5 + (this.biome.resourceBias[r] ?? 0));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < RESOURCES.length; i++) {
      roll -= weights[i];
      if (roll < 0) return RESOURCES[i];
    }
    return RESOURCES[RESOURCES.length - 1];
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
    const pierce = bullet.getData('pierce') ?? 0;
    if (pierce > 0) {
      bullet.setData('pierce', pierce - 1);
    } else {
      bullet.destroy();
    }

    this.applyDamageToEnemy(enemy, damage, bullet.getData('ignoresArmor'));
  }

  /**
   * Apply `damage` to one enemy with the full juice path: hit-flash, floating number, and on
   * death the drops / xp / particles. Shared by bullet hits, orbit contact, and lob detonation so
   * the death feel is identical for every damage source. `ignoresArmor` lets the sniper line punch
   * straight through.
   */
  private applyDamageToEnemy(enemy: any, damage: number, ignoresArmor = false) {
    if (!enemy.active) return;

    // Armor absorbs whole hits (one layer per hit) regardless of damage — so tanky mobs always take
    // several shots — unless the source pierces armor (sniper line). A blocked hit deals no HP damage.
    const armor = enemy.getData('armor') ?? 0;
    if (armor > 0 && !ignoresArmor) {
      enemy.setData('armor', armor - 1);
      enemy.setTintFill(0x66ccff);
      this.time.delayedCall(60, () => { if (enemy.active) enemy.clearTint(); });
      const blk = this.add.text(enemy.x, enemy.y - 8, '⛊', {
        fontSize: '14px', color: '#9fe0ff', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: blk, y: blk.y - 18, alpha: 0, duration: 380, onComplete: () => blk.destroy() });
      playSfx('enemy-hit'); // RC-020: a hit landed, even if armor absorbed it
      return;
    }

    // --- Juice: hit-flash ---
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(60, () => { if (enemy.active) enemy.clearTint(); });

    // --- Juice: floating damage number ---
    const dmgText = this.add.text(enemy.x, enemy.y - 8, String(Math.round(damage)), {
      fontSize: '20px', color: '#ffee44', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: dmgText, y: dmgText.y - 22, alpha: 0,
      duration: 450, ease: 'Power1',
      onComplete: () => dmgText.destroy(),
    });

    const hp = enemy.getData('hp') - damage;
    if (hp <= 0) {
      const ex = enemy.x, ey = enemy.y;
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
      // RC-019: a mini-boss kill drops the guaranteed jackpot — a gem burst + one upgraded gem.
      if (enemy.getData('isBoss')) {
        const tier = gemTierForExpeditionTier(this.expedition.tier);
        const base = rewardValueForTier(this.expedition.tier);
        for (const g of bossJackpotGems(base, tier)) {
          const jx = ex + Phaser.Math.Between(-44, 44), jy = ey + Phaser.Math.Between(-44, 44);
          this.dropGem(jx, jy, this.biasedResource(), { valueOverride: g.value, tierOverride: g.tier });
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
    }
  }

  private hitPlayer(enemy: any) {
    this.stats.hp -= enemy.getData('contactDamage');
    this.stopChargerTell(enemy);
    enemy.destroy();
    playSfx('player-hit'); // RC-020
    // --- Juice: a red screen flash + the hero flashing red so a hit is unmistakable, plus shake ---
    this.cameras.main.flash(110, 130, 0, 0);
    this.cameras.main.shake(120, 0.008);
    this.player.setTintFill(0xff3333);
    this.time.delayedCall(90, () => { if (this.player?.active) this.player.clearTint(); });
    if (this.stats.hp <= 0) this.finish(true);
  }

  private dropGem(x: number, y: number, resource: Resource, opts?: { valueOverride?: number; tierOverride?: GemTier }) {
    const tier = opts?.tierOverride ?? gemTierForExpeditionTier(this.expedition.tier);
    const gem = this.add.image(x, y, gemSpriteId(resource, tier)) as any;
    gem.setDisplaySize(14 * RUN_SCALE, 14 * RUN_SCALE);
    this.physics.add.existing(gem);
    this.gems.add(gem);
    gem.setData('resource', resource);
    gem.setData('value', opts?.valueOverride ?? rewardValueForTier(this.expedition.tier));
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

  private collectGem(gem: any) {
    const value = gem.getData('value') ?? 1;
    this.collected[gem.getData('resource') as Resource] += value;
    playSfx('gem-pickup', { semitones: gemValueToSemitones(value) }); // RC-020: chime pitched by value
    gem.destroy();
  }

  private gainXp(amount: number) {
    const r = addXp(this.stats, amount);
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
    const picks = rollRunDraft(() => Math.random(), this.mods.draftChoices, {
      equipped: this.equipped,
      ownedPerks: this.ownedPerks,
      pool: this.mods.weapons,
    });
    const { width, height } = this.scale;
    const panel = this.add.container(0, 0).setDepth(20);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    panel.add(bg);
    const queueSuffix = this.pendingDrafts > 0 ? ` (+${this.pendingDrafts} more)` : '';
    const title = this.add.text(width / 2, height / 2 - 120, `Level up — choose one${queueSuffix}`,
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

    picks.forEach((opt, i) => {
      const y = height / 2 - 50 + i * 64;
      const card = this.add.rectangle(width / 2, y, 460, 54, 0x238636)
        .setInteractive({ useHandCursor: true });
      // rc-017's two-line card (title + what-it-does) driving rc-028's centralized advance flow,
      // so the Oratory reroll path stays intact.
      const label = this.add.text(width / 2, y - 9, this.draftLabel(opt),
        { fontSize: '15px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      const sub = this.add.text(width / 2, y + 11, this.draftDescription(opt),
        { fontSize: '12px', color: '#d2f0d8' }).setOrigin(0.5);
      card.on('pointerdown', () => { playSfx('draft-select'); this.applyDraftOption(opt); closeAndAdvance(); });
      panel.add(card); panel.add(label); panel.add(sub);
    });

    // Oratory reroll affordance: re-roll the current options without consuming the level-up.
    if (this.rerollsLeft > 0) {
      const ry = height / 2 - 50 + picks.length * 64 + 8;
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
  }

  private draftLabel(o: DraftOption): string {
    switch (o.kind) {
      case 'perk': return o.perk.name;
      case 'newWeapon': {
        const cls = weaponClass(o.weaponId);
        const cur = this.equipped.find((w) => weaponClass(w.id) === cls);
        const verb = cur ? `Swap ${cls}` : `New ${cls}`;
        return `${verb}: ${WEAPONS[o.weaponId].name}`;
      }
      case 'levelWeapon': {
        const cur = this.equipped.find((w) => w.id === o.weaponId)?.level ?? 1;
        const next = Math.min(cur + 1, WEAPONS[o.weaponId].maxLevel);
        return `Upgrade: ${WEAPONS[o.weaponId].name} (Lv ${cur}→${next})`;
      }
      case 'evolve': return `Evolve: ${WEAPONS[o.fromId].name} → ${WEAPONS[o.toId].name}`;
    }
  }

  /** The second, smaller line on a draft card: what the option actually does. */
  private draftDescription(o: DraftOption): string {
    switch (o.kind) {
      case 'perk': return o.perk.desc;
      case 'newWeapon': return weaponStatText(WEAPONS[o.weaponId]);
      case 'levelWeapon': return weaponLevelGainText(WEAPONS[o.weaponId]);
      case 'evolve': return weaponStatText(WEAPONS[o.toId]);
    }
  }

  private applyDraftOption(o: DraftOption) {
    switch (o.kind) {
      case 'perk':
        this.stats = applyPerk(this.stats, o.perk);
        this.ownedPerks.push(o.perk.id);
        break;
      case 'newWeapon':
        this.equipped = addWeapon(this.equipped, o.weaponId);
        break;
      case 'levelWeapon':
        this.equipped = levelWeapon(this.equipped, o.weaponId);
        break;
      case 'evolve':
        this.equipped = applyEvolve(this.equipped, o.fromId, o.toId);
        break;
    }
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
      collected: { ...this.collected },
      survivedMs: this.elapsed,
      died,
      tier: this.expedition.tier,
    };
  }
}
