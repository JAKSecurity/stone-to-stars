import Phaser from 'phaser';
import { RunModifiers, RunResult, Resource, RESOURCES, Expedition, BiomeDef } from '../game/types';
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
import { gemTierForExpeditionTier, gemSpriteId } from '../run/gemTier';
import { gemValueForTier } from '../game/economy';
import { spawnTableAt } from '../run/spawnEscalation';

// Sprites + movement render at 2x and the play field fills the window (the field is the canvas size).
const RUN_SCALE = 2;

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
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

  private collected: Record<Resource, number> = { exploration: 0, science: 0, industry: 0, culture: 0 };
  private elapsed = 0;
  private equipped: EquippedWeapon[] = initialWeapons();
  private ownedPerks: string[] = [];
  private weaponCooldowns: Record<string, number> = {};
  private spawnCooldown = 0;
  private explorationCooldown = 0;
  private relicCooldown = 0;
  private resourceCooldown = 0;
  private paused = false;
  private finished = false;
  private pendingDrafts = 0;
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
    this.explorationCooldown = 0; this.relicCooldown = 0; this.resourceCooldown = 0;
    this.paused = false; this.finished = false; this.pendingDrafts = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor(this.biome.tint);
    this.drawBackground(width, height);

    const player = this.add.image(width / 2, height / 2, this.heroSprite);
    player.setDisplaySize(34 * RUN_SCALE, 42 * RUN_SCALE);
    this.physics.add.existing(player);
    this.player = player as any;
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    // Leave the body at its default (the scaled sprite size). An explicit setSize here is read in
    // the texture's source pixels then scaled down, which shrank the hitbox and broke contact damage.

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
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
    this.physics.add.overlap(this.player, this.gems, (_p, g) => this.collectGem(g as any));
    // Obstacles block movement for both the player and the chasing enemies (they bunch up on them).
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);

    this.hud = this.add.text(12, 12, '',
      { fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setDepth(10);
  }

  /** Biome-tinted ground with a faint grid + scattered specks so motion reads against the field. */
  private drawBackground(width: number, height: number) {
    const grid = this.add.graphics().setDepth(-10);
    grid.lineStyle(1, 0xffffff, 0.05);
    const step = 96;
    for (let x = 0; x <= width; x += step) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += step) grid.lineBetween(0, y, width, y);
    const specks = Math.min(600, Math.round((width * height) / 9000));
    for (let i = 0; i < specks; i++) {
      const shade = Phaser.Math.Between(0, 1) ? 0xffffff : 0x000000;
      this.add.circle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 2), shade, 0.06).setDepth(-9);
    }
  }

  /** Scatter static boulders (collidable terrain), keeping the player's spawn area clear. */
  private scatterObstacles(width: number, height: number) {
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
      const rock = this.add.ellipse(x, y, r * 2, r * 1.6, 0x000000, 0.4).setDepth(-1);
      rock.setStrokeStyle(2, 0xffffff, 0.08);
      this.physics.add.existing(rock, true);
      this.obstacles.add(rock);
    }
  }

  update(_t: number, deltaMs: number) {
    // Guard the scene-restart race: a queued update() can fire after the previous
    // scene was stopped but before create() rebuilds the player. (Not reachable in
    // normal play — a run is always stopped before the next starts — but cheap insurance.)
    if (this.paused || !this.player?.body) return;
    const dt = deltaMs;
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
        this.fireWeapon(shot);
        this.weaponCooldowns[w.id] = shot.cooldownMs / this.stats.fireRateMult;
      }
    }

    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0) {
      this.spawnEnemy();
      // Start gentle and ramp up — sparse at first, busier over the run. Base is ~25% slower again
      // for the early game (the 150ms floor keeps late-game density unchanged).
      const ramp = 1 + this.elapsed / 30000;
      this.spawnCooldown = Math.max(150, 1625 / ramp);
    }

    this.explorationCooldown -= dt;
    if (this.explorationCooldown <= 0) {
      this.collected.exploration += gemValueForTier(this.expedition.tier);
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
      this.physics.moveToObject(e, this.player, e.getData('speed'));
    });

    // Gems are vacuumed in only within pickupRadius — outside it they stay put, so collection is
    // positional and the radius (widened by the Magnet perk) actually matters. Move near a gem to grab it.
    (this.gems.getChildren() as any[]).forEach((g) => {
      const d = Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y);
      if (d < this.stats.pickupRadius * RUN_SCALE) {
        this.physics.moveToObject(g, this.player, 340 * RUN_SCALE);
      } else {
        g.body.setVelocity(0, 0);
      }
    });

    this.hud.setText(
      `HP ${Math.ceil(this.stats.hp)}/${this.stats.maxHp}  Lv${this.stats.level}  ` +
      `🧭${this.collected.exploration} 🔬${this.collected.science} 🏭${this.collected.industry} 🎭${this.collected.culture}  ` +
      `⏱ ${Math.max(0, Math.ceil((RUN_DURATION_MS - this.elapsed) / 1000))}s`,
    );

    if (this.elapsed >= RUN_DURATION_MS) this.finish(false);
  }

  private fireWeapon(shot: WeaponShot) {
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
      bullet.body.setVelocity(Math.cos(angle) * shot.speed * RUN_SCALE, Math.sin(angle) * shot.speed * RUN_SCALE);
      this.time.delayedCall(1200, () => bullet.destroy());
    }
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
    const progress = this.elapsed / RUN_DURATION_MS;
    const table = spawnTableAt(this.biome, progress, BIOMES, ENEMIES);
    const def = ENEMIES[pickEnemy(table, () => Math.random())];
    // RC-017: fixed per-age enemy stats — the difficulty step lives in each age's enemy set, not a
    // continuous per-tier multiplier.
    const enemy = this.add.image(x, y, def.sprite) as any;
    enemy.setDisplaySize(def.displaySize.w * RUN_SCALE, def.displaySize.h * RUN_SCALE);
    this.physics.add.existing(enemy);
    this.enemies.add(enemy);
    enemy.setData('hp', def.baseHp);
    enemy.setData('drop', def.drop);
    enemy.setData('xp', def.xp);
    enemy.setData('speed', def.speed * RUN_SCALE);
    enemy.setData('contactDamage', def.contactDamage);
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

    // --- Juice: hit-flash ---
    if (enemy.active) {
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(60, () => { if (enemy.active) enemy.clearTint(); });
    }

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
      // RC-017: one gem per kill, carrying a tier-scaled value (value, not swarm).
      this.dropGem(ex, ey, enemy.getData('drop'));
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
    // --- Juice: a red screen flash + the hero flashing red so a hit is unmistakable, plus shake ---
    this.cameras.main.flash(110, 130, 0, 0);
    this.cameras.main.shake(120, 0.008);
    this.player.setTintFill(0xff3333);
    this.time.delayedCall(90, () => { if (this.player?.active) this.player.clearTint(); });
    if (this.stats.hp <= 0) this.finish(true);
  }

  private dropGem(x: number, y: number, resource: Resource) {
    const tier = gemTierForExpeditionTier(this.expedition.tier);
    const gem = this.add.image(x, y, gemSpriteId(resource, tier)) as any;
    gem.setDisplaySize(14 * RUN_SCALE, 14 * RUN_SCALE);
    this.physics.add.existing(gem);
    this.gems.add(gem);
    gem.setData('resource', resource);
    gem.setData('value', gemValueForTier(this.expedition.tier));
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
    this.collected[gem.getData('resource') as Resource] += gem.getData('value') ?? 1;
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
      tier: this.expedition.tier,
    });
  }
}
