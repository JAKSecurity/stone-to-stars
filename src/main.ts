import './style.css';
import Phaser from 'phaser';
import { CivState, RunModifiers, RunResult, Expedition } from './game/types';
import { newCivState, applyRunResult } from './state/civState';
import { load, save } from './state/saveLoad';
import { research, getAge } from './tech/tech';
import { heroSpriteFor } from './game/heroByAge';
import { build, upgradeBuilding, moveBuilding } from './camp/camp';
import { computeRunModifiers } from './run/modifiers';
import { renderCivScreen } from './ui/civScreen';
import { renderExpeditionScreen } from './ui/expeditionScreen';
import { RunScene } from './scenes/RunScene';
import { registerTextures } from './art/phaserTextures';
// RC-020 audio: additive integration. The audio module stands alone; these are the
// only call-sites outside the hot run/weapon files (the remaining in-run hooks are
// documented in src/audio/README.md for post-merge wiring).
import { playSfx, startAmbient, mountAudioControls, unlockAudioOnFirstGesture } from './audio';

const civEl = document.getElementById('civ')!;
const runEl = document.getElementById('run')!;
const expEl = document.getElementById('expedition')!;

let civ: CivState = load() ?? newCivState();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'run',
  width: 800,
  height: 600,
  backgroundColor: '#10141f',
  physics: { default: 'arcade', arcade: { debug: false } },
});
// Register the run scene WITHOUT auto-starting it. The first scene listed in the
// Phaser config force-starts on boot (with no init data), which crashes RunScene.init;
// adding it manually with autoStart=false keeps it dormant until startRun().
game.scene.add('run', RunScene, false);
// Render all sprite-def textures once the texture manager is ready.
game.events.once(Phaser.Core.Events.READY, () => registerTextures(game));

// RC-020 audio: arm the autoplay unlock (AudioContext is created on the first user
// gesture, per browser policy) and mount the persisted mute toggle.
unlockAudioOnFirstGesture();
mountAudioControls();

function showCiv() {
  runEl.classList.remove('active');
  expEl.classList.remove('active');
  civEl.classList.remove('hidden');
  startAmbient('civ'); // RC-020: calm planning-screen bed (no-op until first gesture)
  renderCivScreen(civEl, civ, {
    onResearch: (id) => { civ = research(civ, id); playSfx('research'); persist(); showCiv(); },
    onBuild: (id, tile) => { civ = build(civ, id, tile); playSfx('build'); persist(); showCiv(); },
    onUpgrade: (tile) => { civ = upgradeBuilding(civ, tile); playSfx('upgrade'); persist(); showCiv(); },
    onMoveBuilding: (from, to) => { civ = moveBuilding(civ, from, to); persist(); showCiv(); },
    onStartRun: () => startRun(),
  });
}

function startRun() {
  // Step 1: choose an expedition.
  civEl.classList.add('hidden');
  expEl.classList.add('active');
  renderExpeditionScreen(expEl, civ, {
    onPick: (expedition: Expedition) => launchExpedition(expedition),
    onBack: () => { expEl.classList.remove('active'); showCiv(); },
  });
}

function launchExpedition(expedition: Expedition) {
  expEl.classList.remove('active');
  runEl.classList.add('active');
  const modifiers: RunModifiers = computeRunModifiers(civ);
  startAmbient('run');     // RC-020: switch to the in-run ambient bed
  playSfx('run-start');
  game.scene.stop('run');
  game.scene.start('run', {
    modifiers,
    expedition,
    heroSprite: heroSpriteFor(getAge(civ)),
    onComplete: (result: RunResult) => onRunComplete(result),
  });
}

function onRunComplete(result: RunResult) {
  playSfx(result.died ? 'run-end-death' : 'run-end-cleared'); // RC-020
  game.scene.stop('run');
  civ = applyRunResult(civ, result);
  persist();
  showCiv();
}

function persist() {
  save(civ);
}

showCiv();
