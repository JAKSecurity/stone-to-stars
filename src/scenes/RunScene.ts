import Phaser from 'phaser';
import { RunModifiers, RunResult, Resource } from '../game/types';
import { RUN_DURATION_MS } from '../game/config';
import { initialRunStats, addXp } from '../run/runStats';
import { rollDraft, applyPerk } from '../run/draft';

const GEM_COLOR: Record<Resource, number> = {
  industry: 0xd9534f, science: 0x58a6ff, culture: 0x3fb950, exploration: 0xe3b341,
};

interface RunInit {
  modifiers: RunModifiers;
  onComplete: (result: RunResult) => void;
}

export class RunScene extends Phaser.Scene {
  private mods!: RunModifiers;
  private onComplete!: (r: RunResult) => void;
  private stats = initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'] });

  private player!: Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body };
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private gems!: Phaser.Physics.Arcade.Group;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

  private collected: Record<Resource, number> = { exploration: 0, science: 0, industry: 0, culture: 0 };
  private elapsed = 0;
  private fireCooldown = 0;
  private spawnCooldown = 0;
  private explorationCooldown = 0;
  private paused = false;
  private hud!: Phaser.GameObjects.Text;

  constructor() { super('run'); }

  init(data: RunInit) {
    this.mods = data.modifiers;
    this.onComplete = data.onComplete;
    this.stats = initialRunStats(this.mods);
    this.collected = { exploration: 0, science: 0, industry: 0, culture: 0 };
    this.elapsed = 0; this.fireCooldown = 0; this.spawnCooldown = 0;
    this.explorationCooldown = 0; this.paused = false;
  }

  create() {
    const { width, height } = this.scale;
    this.player = this.add.circle(width / 2, height / 2, 12, 0x5bd1ff) as any;
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

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

    this.hud = this.add.text(8, 8, '', { fontSize: '14px', color: '#fff' }).setDepth(10);
  }

  update(_t: number, deltaMs: number) {
    if (this.paused) return;
    const dt = deltaMs;
    this.elapsed += dt;

    const speed = 180 * this.stats.moveSpeedMult;
    const b = this.player.body;
    b.setVelocity(0);
    if (this.keys.left.isDown) b.setVelocityX(-speed);
    if (this.keys.right.isDown) b.setVelocityX(speed);
    if (this.keys.up.isDown) b.setVelocityY(-speed);
    if (this.keys.down.isDown) b.setVelocityY(speed);

    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      this.fire();
      this.fireCooldown = 500 / this.stats.fireRateMult;
    }

    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0) {
      this.spawnEnemy();
      const ramp = 1 + this.elapsed / 60000;
      this.spawnCooldown = Math.max(250, 1100 / ramp);
    }

    this.explorationCooldown -= dt;
    if (this.explorationCooldown <= 0) {
      this.collected.exploration += 1;
      this.explorationCooldown = 4000;
    }

    (this.enemies.getChildren() as any[]).forEach((e) => {
      this.physics.moveToObject(e, this.player, 60);
    });

    (this.gems.getChildren() as any[]).forEach((g) => {
      const d = Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y);
      if (d < this.stats.pickupRadius) this.physics.moveToObject(g, this.player, 240);
    });

    this.hud.setText(
      `HP ${Math.ceil(this.stats.hp)}/${this.stats.maxHp}  Lv${this.stats.level}  ` +
      `🧭${this.collected.exploration} 🔬${this.collected.science} 🏭${this.collected.industry} 🎭${this.collected.culture}  ` +
      `⏱ ${Math.max(0, Math.ceil((RUN_DURATION_MS - this.elapsed) / 1000))}s`,
    );

    if (this.elapsed >= RUN_DURATION_MS) this.finish(false);
  }

  private fire() {
    const target = this.nearestEnemy();
    const shots = this.mods.weapons.includes('bronze_spear') ? 2 : 1;
    for (let i = 0; i < shots; i++) {
      const bullet = this.add.circle(this.player.x, this.player.y, 4, 0xffffff) as any;
      this.physics.add.existing(bullet);
      this.bullets.add(bullet);
      bullet.setData('damage', 12 * this.stats.damageMult * (i === 1 ? 1.5 : 1));
      if (target) {
        this.physics.moveToObject(bullet, target, 420);
      } else {
        bullet.body.setVelocity(0, -420);
      }
      this.time.delayedCall(1200, () => bullet.destroy());
    }
  }

  private nearestEnemy(): Phaser.GameObjects.Arc | null {
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
    const isScholar = Phaser.Math.Between(0, 2) === 0;
    const enemy = this.add.circle(x, y, 10, isScholar ? 0x58a6ff : 0xd9534f) as any;
    this.physics.add.existing(enemy);
    this.enemies.add(enemy);
    enemy.setData('hp', 24);
    enemy.setData('drop', isScholar ? 'science' : 'industry');
  }

  private hitEnemy(bullet: any, enemy: any) {
    bullet.destroy();
    const hp = enemy.getData('hp') - bullet.getData('damage');
    if (hp <= 0) {
      this.dropGem(enemy.x, enemy.y, enemy.getData('drop'));
      enemy.destroy();
      this.gainXp(3);
    } else {
      enemy.setData('hp', hp);
    }
  }

  private hitPlayer(enemy: any) {
    this.stats.hp -= 6;
    enemy.destroy();
    if (this.stats.hp <= 0) this.finish(true);
  }

  private dropGem(x: number, y: number, resource: Resource) {
    const gem = this.add.rectangle(x, y, 8, 8, GEM_COLOR[resource]) as any;
    this.physics.add.existing(gem);
    this.gems.add(gem);
    gem.setData('resource', resource);
  }

  private collectGem(gem: any) {
    this.collected[gem.getData('resource') as Resource] += 1;
    gem.destroy();
  }

  private gainXp(amount: number) {
    const before = this.stats.level;
    const r = addXp(this.stats, amount);
    this.stats = r.stats;
    if (r.stats.level > before) this.openDraft();
  }

  private openDraft() {
    this.paused = true;
    this.physics.pause();
    const picks = rollDraft(() => Math.random(), this.mods.draftChoices);
    const { width, height } = this.scale;
    const panel = this.add.container(0, 0).setDepth(20);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    panel.add(bg);
    const title = this.add.text(width / 2, height / 2 - 120, 'Level up — choose a perk',
      { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
    panel.add(title);
    picks.forEach((perk, i) => {
      const y = height / 2 - 50 + i * 56;
      const card = this.add.rectangle(width / 2, y, 360, 48, 0x238636).setInteractive({ useHandCursor: true });
      const label = this.add.text(width / 2, y, `${perk.name} — ${perk.desc}`,
        { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
      card.on('pointerdown', () => {
        this.stats = applyPerk(this.stats, perk);
        panel.destroy();
        this.paused = false;
        this.physics.resume();
      });
      panel.add(card); panel.add(label);
    });
  }

  private finish(died: boolean) {
    if (this.paused && died) { /* allow finish even if a draft was open */ }
    this.onComplete({
      collected: { ...this.collected },
      survivedMs: this.elapsed,
      died,
    });
  }
}
