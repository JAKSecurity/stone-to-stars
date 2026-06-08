import Phaser from 'phaser';
import { RunModifiers, RunResult, Resource, Expedition, BiomeDef } from '../game/types';
import { RUN_DURATION_MS } from '../game/config';
import { initialRunStats, addXp } from '../run/runStats';
import { applyPerk } from '../run/draft';
import {
  EquippedWeapon, initialWeapons, addWeapon, levelWeapon, applyEvolve,
  weaponShot, WeaponShot, rollRunDraft, DraftOption,
} from '../run/weapons';
import { WEAPONS } from '../run/weaponData';
import { BIOMES } from '../run/biomeData';
import { ENEMIES } from '../run/enemyData';
import { pickEnemy } from '../run/expedition';
import {
  orbitAngle, orbitPosition, lobFlightMs, lobProgress, lobGroundPosition, lobArcHeight, withinRadius,
  ORBIT_RADIUS, ORBIT_HIT_INTERVAL_MS, LOB_BLAST_RADIUS, LOB_PEAK_HEIGHT,
} from '../run/projectileMotion';

interface RunInit {
  modifiers: RunModifiers;
  expedition: Expedition;
  onComplete: (result: RunResult) => void;
  heroSprite?: string;
}

export class RunScene extends Phaser.Scene {
  private mods!: RunModifiers;
  private onComplete!: (r: RunResult) => void;
  private stats = initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'] });
  private expedition!: Expedition;
  private biome!: BiomeDef;

  private player!: Phaser.GameObjects.Image & { body: Phaser.Physics.Arcade.Body };
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private gems!: Phaser.Physics.Arcade.Group;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

  private collected: Record<Resource, number> = { exploration: 0, science: 0, industry: 0, culture: 0 };
  private elapsed = 0;
  private equipped: EquippedWeapon[] = initialWeapons();
  private ownedPerks: string[] = [];
  private weaponCooldowns: Record<string, number> = {};
  private spawnCooldown = 0;
  private explorationCooldown = 0;
  private relicCooldown = 0;
  private paused = false;
  private finished = false;
  private pendingDrafts = 0;
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
    this.heroSprite = data.heroSprite ?? 'hero';
    this.stats = initialRunStats(this.mods);
    this.collected = { exploration: 0, science: 0, industry: 0, culture: 0 };
    this.elapsed = 0; this.spawnCooldown = 0;
    this.equipped = initialWeapons();
    this.ownedPerks = [];
    this.weaponCooldowns = {};
    this.explorationCooldown = 0; this.relicCooldown = 0;
    this.paused = false; this.finished = false; this.pendingDrafts = 0;
    this.lobs = [];
  }

  create() {
    const { width, height } = this.scale;
    const player = this.add.image(width / 2, height / 2, this.heroSprite);
    player.setDisplaySize(34, 42); // scale 120x150 art down to play size
    this.physics.add.existing(player);
    this.player = player as any;
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    // Leave the body at its default (the scaled sprite size, ~34x42). An explicit
    // setSize(w,h) here is interpreted in the texture's *source* pixels and then scaled
    // by the display scale (~0.28), which shrank the hitbox to ~8x10 and made the player
    // nearly immune to contact damage.

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.gems = this.physics.add.group();

    this.keys = {
      up: this.input.keyboard!.addKey('W'),
      down: this.input.keyboard!.addKey('S'),
      left: this.input.keyboard!.addKey('A'),
      right: this.input.keyboard!.addKey('D'),
    };

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.hitEnemy(b as any, e as any));
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.hitPlayer(e as any));
    this.physics.add.overlap(this.player, this.gems, (_p, g) => this.collectGem(g as any));

    this.cameras.main.setBackgroundColor(this.biome.tint);
    this.hud = this.add.text(8, 8, '', { fontSize: '14px', color: '#fff' }).setDepth(10);
  }

  update(_t: number, deltaMs: number) {
    // Guard the scene-restart race: a queued update() can fire after the previous
    // scene was stopped but before create() rebuilds the player. (Not reachable in
    // normal play — a run is always stopped before the next starts — but cheap insurance.)
    if (this.paused || !this.player?.body) return;
    const dt = deltaMs;
    this.elapsed += dt;

    const speed = 180 * this.stats.moveSpeedMult;
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
      const ramp = 1 + this.elapsed / 60000;
      this.spawnCooldown = Math.max(250, 1100 / (ramp * this.expedition.scaling.spawnRateMult));
    }

    this.explorationCooldown -= dt;
    if (this.explorationCooldown <= 0) {
      this.collected.exploration += 1;
      this.explorationCooldown = 4000 / (this.biome.resourceBias.exploration ?? 1);
    }

    // Culture relics appear periodically as walk-over pickups (design: villages/relics give culture).
    this.relicCooldown -= dt;
    if (this.relicCooldown <= 0) {
      const { width, height } = this.scale;
      this.dropGem(Phaser.Math.Between(40, width - 40), Phaser.Math.Between(40, height - 40), 'culture');
      this.relicCooldown = 5000 / (this.biome.resourceBias.culture ?? 1);
    }

    (this.enemies.getChildren() as any[]).forEach((e) => {
      this.physics.moveToObject(e, this.player, e.getData('speed'));
    });

    // Gems always drift toward the player so a run reliably delivers its resources;
    // they accelerate once inside pickupRadius (the Magnet perk widens that fast zone).
    (this.gems.getChildren() as any[]).forEach((g) => {
      const d = Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y);
      this.physics.moveToObject(g, this.player, d < this.stats.pickupRadius ? 340 : 150);
    });

    // --- Orbit projectiles: ride a ring around the player (RC-015) ---
    (this.bullets.getChildren() as any[]).forEach((b) => {
      if (b.getData('behavior') !== 'orbit') return;
      const angle = orbitAngle(b.getData('index'), b.getData('count'), this.elapsed);
      const pos = orbitPosition(this.player.x, this.player.y, ORBIT_RADIUS, angle);
      b.body.reset(pos.x, pos.y);
    });

    // --- Lob projectiles: arc to a target and detonate on landing (RC-015) ---
    for (let i = this.lobs.length - 1; i >= 0; i--) {
      const lob = this.lobs[i];
      lob.elapsed += dt;
      const t = lobProgress(lob.elapsed, lob.flightMs);
      const ground = lobGroundPosition(lob.start, lob.target, t);
      lob.img.setPosition(ground.x, ground.y - lobArcHeight(t));
      const apex = 1 + 0.5 * (lobArcHeight(t) / LOB_PEAK_HEIGHT);
      lob.img.setDisplaySize(14 * apex, 14 * apex);
      if (t >= 1) {
        this.detonate(lob.target.x, lob.target.y, lob.damage);
        lob.img.destroy();
        this.lobs.splice(i, 1);
      }
    }

    this.hud.setText(
      `HP ${Math.ceil(this.stats.hp)}/${this.stats.maxHp}  Lv${this.stats.level}  ` +
      `🧭${this.collected.exploration} 🔬${this.collected.science} 🏭${this.collected.industry} 🎭${this.collected.culture}  ` +
      `⏱ ${Math.max(0, Math.ceil((RUN_DURATION_MS - this.elapsed) / 1000))}s`,
    );

    if (this.elapsed >= RUN_DURATION_MS) this.finish(false);
  }

  private fireWeapon(shot: WeaponShot, weaponId: string) {
    if (shot.behavior === 'orbit') { this.summonOrbit(shot, weaponId); return; }
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
      bullet.setDisplaySize(12, 12);
      this.physics.add.existing(bullet);
      this.bullets.add(bullet);
      bullet.setData('damage', shot.damage);
      bullet.setData('pierce', shot.pierce);
      bullet.body.setVelocity(Math.cos(angle) * shot.speed, Math.sin(angle) * shot.speed);
      this.time.delayedCall(1200, () => bullet.destroy());
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
      orb.setDisplaySize(14, 14);
      this.physics.add.existing(orb);
      this.bullets.add(orb);
      orb.body.setVelocity(0, 0);
      orb.setData('behavior', 'orbit');
      orb.setData('damage', shot.damage);
      orb.setData('index', i);
      orb.setData('count', shot.count);
      orb.setData('weaponKey', weaponId);
      orb.setData('hitTimes', new Map());
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
      img.setDisplaySize(14, 14);
      this.lobs.push({
        img,
        start: { x: this.player.x, y: this.player.y },
        target: { x: tx, y: ty },
        elapsed: 0,
        flightMs: lobFlightMs(dist, shot.speed),
        damage: shot.damage,
      });
    }
  }

  /** Resolve a lob at its landing point: shock-ring + shake, then AoE damage to enemies in range. */
  private detonate(x: number, y: number, damage: number) {
    const ring = this.add.circle(x, y, LOB_BLAST_RADIUS, 0xffaa33, 0.4).setDepth(24).setScale(0.15);
    this.tweens.add({
      targets: ring, scale: 1, alpha: 0,
      duration: 260, ease: 'Power2', onComplete: () => ring.destroy(),
    });
    this.cameras.main.shake(120, 0.006);
    (this.enemies.getChildren() as any[]).forEach((e) => {
      if (e.active && withinRadius(x, y, e.x, e.y, LOB_BLAST_RADIUS)) {
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

    const def = ENEMIES[pickEnemy(this.biome.spawnTable, () => Math.random())];
    const sc = this.expedition.scaling;
    const enemy = this.add.image(x, y, def.sprite) as any;
    enemy.setDisplaySize(def.displaySize.w, def.displaySize.h);
    this.physics.add.existing(enemy);
    this.enemies.add(enemy);
    enemy.setData('hp', def.baseHp * sc.hpMult);
    enemy.setData('drop', def.drop);
    enemy.setData('xp', def.xp);
    enemy.setData('speed', def.speed * sc.speedMult);
    enemy.setData('contactDamage', def.contactDamage);
  }

  private hitEnemy(bullet: any, enemy: any) {
    if (!bullet.active || !enemy.active) return;

    // Orbit projectiles persist and re-hit on a cadence instead of being consumed on contact.
    if (bullet.getData('behavior') === 'orbit') {
      const hitTimes = bullet.getData('hitTimes') as Map<any, number>;
      const next = hitTimes.get(enemy) ?? -Infinity;
      if (this.elapsed < next) return;
      hitTimes.set(enemy, this.elapsed + ORBIT_HIT_INTERVAL_MS);
      this.applyDamageToEnemy(enemy, bullet.getData('damage'));
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

    this.applyDamageToEnemy(enemy, damage);
  }

  /**
   * Apply `damage` to one enemy with the full juice path: hit-flash, floating number, and on
   * death the drops / xp / particles / big-death shake. Shared by bullet hits, orbit contact,
   * and lob detonation so the death feel is identical for every damage source.
   */
  private applyDamageToEnemy(enemy: any, damage: number) {
    if (!enemy.active) return;

    // --- Juice: hit-flash ---
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(60, () => { if (enemy.active) enemy.clearTint(); });

    // --- Juice: floating damage number ---
    const dmgText = this.add.text(enemy.x, enemy.y - 8, String(Math.round(damage)), {
      fontSize: '13px', color: '#ffee44', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: dmgText, y: dmgText.y - 22, alpha: 0,
      duration: 450, ease: 'Power1',
      onComplete: () => dmgText.destroy(),
    });

    const hp = enemy.getData('hp') - damage;
    if (hp <= 0) {
      const ex = enemy.x, ey = enemy.y;
      const drops = Math.max(1, Math.round(this.expedition.scaling.dropMult));
      for (let d = 0; d < drops; d++) {
        const jitter = drops > 1 ? Phaser.Math.Between(-10, 10) : 0;
        this.dropGem(ex + jitter, ey + jitter, enemy.getData('drop'));
      }
      const xpGain = enemy.getData('xp');
      const isBig = (enemy.displayWidth ?? 0) >= 40;
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

      // --- Juice: screen shake on big enemy death ---
      if (isBig) this.cameras.main.shake(140, 0.012);

      this.gainXp(xpGain);
    } else {
      enemy.setData('hp', hp);
    }
  }

  private hitPlayer(enemy: any) {
    this.stats.hp -= enemy.getData('contactDamage');
    enemy.destroy();
    // --- Juice: screen shake on player taking contact damage ---
    this.cameras.main.shake(120, 0.008);
    if (this.stats.hp <= 0) this.finish(true);
  }

  private dropGem(x: number, y: number, resource: Resource) {
    const gem = this.add.image(x, y, 'gem_' + resource) as any;
    gem.setDisplaySize(14, 14);
    this.physics.add.existing(gem);
    this.gems.add(gem);
    gem.setData('resource', resource);
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
    this.collected[gem.getData('resource') as Resource] += 1;
    gem.destroy();
  }

  private gainXp(amount: number) {
    const r = addXp(this.stats, amount);
    this.stats = r.stats;
    if (r.levelsGained > 0) {
      this.pendingDrafts += r.levelsGained;
      // Only trigger openDraft if we're not already inside a draft (paused).
      // If already paused, the queue will be drained by the card pointerdown handler.
      if (!this.paused) this.openDraft();
    }
  }

  private openDraft() {
    // Consume one pending draft from the queue.
    if (this.pendingDrafts <= 0) return;
    this.pendingDrafts -= 1;

    this.paused = true;
    this.physics.pause();
    const picks = rollRunDraft(() => Math.random(), this.mods.draftChoices, {
      equipped: this.equipped,
      ownedPerks: this.ownedPerks,
      pool: this.mods.weapons,
    });
    const { width, height } = this.scale;
    const panel = this.add.container(0, 0).setDepth(20);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    panel.add(bg);
    // Show queue depth so the player knows more are coming.
    const queueSuffix = this.pendingDrafts > 0 ? ` (+${this.pendingDrafts} more)` : '';
    const title = this.add.text(width / 2, height / 2 - 120, `Level up — choose one${queueSuffix}`,
      { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
    panel.add(title);
    picks.forEach((opt, i) => {
      const y = height / 2 - 50 + i * 56;
      const card = this.add.rectangle(width / 2, y, 380, 48, 0x238636)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(width / 2, y, this.draftLabel(opt),
        { fontSize: '15px', color: '#fff' }).setOrigin(0.5);
      card.on('pointerdown', () => {
        this.applyDraftOption(opt);
        panel.destroy();
        if (this.pendingDrafts > 0) {
          // More levels queued — open the next draft immediately (stay paused).
          this.openDraft();
        } else {
          // Queue empty — resume the run.
          this.paused = false;
          this.physics.resume();
        }
      });
      panel.add(card); panel.add(label);
    });
  }

  private draftLabel(o: DraftOption): string {
    switch (o.kind) {
      case 'perk': return `${o.perk.name} — ${o.perk.desc}`;
      case 'newWeapon': return `New weapon: ${WEAPONS[o.weaponId].name}`;
      case 'levelWeapon': return `Upgrade: ${WEAPONS[o.weaponId].name}`;
      case 'evolve': return `Evolve: ${WEAPONS[o.fromId].name} → ${WEAPONS[o.toId].name}`;
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
    this.onComplete({
      collected: { ...this.collected },
      survivedMs: this.elapsed,
      died,
    });
  }
}
