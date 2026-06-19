import Phaser from 'phaser';
import { joystickVector, Vec2 } from './touchMath';

export interface TouchControlsCallbacks {
  onActive: () => void;
  onPause: () => void;
}

/** On-screen touch controls pinned to the camera: a floating joystick in the left ~45%
 *  of the screen and two right-thumb buttons (⚡ active, ⏸ pause). Movement is read each
 *  frame via moveVector(). Created only on touch devices (see isTouchDevice). */
export class TouchControls {
  private readonly maxRadius = 60;
  private joyPointerId: number | null = null;
  private origin: Vec2 = { x: 0, y: 0 };
  private vec = { x: 0, y: 0, magnitude: 0 };

  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private activeBtn: Phaser.GameObjects.Container;
  private pauseBtn: Phaser.GameObjects.Container;

  constructor(private scene: Phaser.Scene, private cbs: TouchControlsCallbacks) {
    const D = 1000; // above all in-run HUD (HUD uses depth 10)

    this.base = scene.add.circle(0, 0, this.maxRadius, 0x6cf, 0.10)
      .setStrokeStyle(2, 0x66ccff, 0.5).setScrollFactor(0).setDepth(D).setVisible(false);
    this.thumb = scene.add.circle(0, 0, 22, 0x66ccff, 0.9)
      .setScrollFactor(0).setDepth(D).setVisible(false);

    this.activeBtn = this.makeButton('⚡', () => this.cbs.onActive(), 0x3fb950, D);
    this.pauseBtn = this.makeButton('⏸', () => this.cbs.onPause(), 0x5a6472, D);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.scale.on('resize', this.layout, this);
    this.layout();
  }

  private makeButton(label: string, cb: () => void, ring: number, depth: number): Phaser.GameObjects.Container {
    const r = 34;
    const circle = this.scene.add.circle(0, 0, r, 0x21262d, 0.85).setStrokeStyle(2, ring, 0.8);
    const text = this.scene.add.text(0, 0, label, { fontSize: '26px', color: '#ffffff' }).setOrigin(0.5);
    const c = this.scene.add.container(0, 0, [circle, text]).setScrollFactor(0).setDepth(depth);
    c.setSize(r * 2, r * 2);
    c.setInteractive(new Phaser.Geom.Circle(0, 0, r), Phaser.Geom.Circle.Contains);
    c.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      cb();
    });
    return c;
  }

  /** Lay out the right-thumb buttons (the joystick zone is implicit: left 45%). */
  private layout(): void {
    const w = this.scene.scale.width, h = this.scene.scale.height;
    this.activeBtn.setPosition(w - 56, h - 56);
    this.pauseBtn.setPosition(w - 132, h - 52);
  }

  private inJoystickZone(p: Phaser.Input.Pointer): boolean {
    return p.x <= this.scene.scale.width * 0.45;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.joyPointerId !== null || !this.inJoystickZone(p)) return;
    this.joyPointerId = p.id;
    this.origin = { x: p.x, y: p.y };
    this.base.setPosition(p.x, p.y).setVisible(true);
    this.thumb.setPosition(p.x, p.y).setVisible(true);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.joyPointerId) return;
    this.vec = joystickVector(this.origin, { x: p.x, y: p.y }, this.maxRadius);
    this.thumb.setPosition(
      this.origin.x + this.vec.x * this.vec.magnitude * this.maxRadius,
      this.origin.y + this.vec.y * this.vec.magnitude * this.maxRadius,
    );
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.joyPointerId) return;
    this.joyPointerId = null;
    this.vec = { x: 0, y: 0, magnitude: 0 };
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }

  /** Movement vector for RunScene.update — components in [-1, 1] (analog). */
  moveVector(): Vec2 {
    return { x: this.vec.x * this.vec.magnitude, y: this.vec.y * this.vec.magnitude };
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.scale.off('resize', this.layout, this);
    this.base.destroy(); this.thumb.destroy();
    this.activeBtn.destroy(); this.pauseBtn.destroy();
  }
}
