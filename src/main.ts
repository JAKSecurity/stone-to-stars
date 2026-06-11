import './style.css';
import Phaser from 'phaser';
import { CivState, RunModifiers, RunResult, Expedition, AgeId } from './game/types';
import { newCivState, applyRunResult } from './state/civState';
import { load, save } from './state/saveLoad';
import { research, getAge } from './tech/tech';
import { TECHS } from './tech/techData';
import { heroSpriteFor } from './game/heroByAge';
import { build, upgradeBuilding, moveBuilding } from './camp/camp';
import { buyTradition } from './civics/traditions';
import { computeRunModifiers } from './run/modifiers';
import { renderCivScreen } from './ui/civScreen';
import { renderExpeditionScreen } from './ui/expeditionScreen';
import { renderRunEndScreen } from './ui/runEndScreen';
import { RunScene } from './scenes/RunScene';
import { registerTextures } from './art/phaserTextures';
// RC-020 audio: additive integration. The audio module stands alone; these are the
// only call-sites outside the hot run/weapon files (the remaining in-run hooks are
// documented in src/audio/README.md for post-merge wiring).
import { playSfx, startAmbient, mountAudioControls, unlockAudioOnFirstGesture } from './audio';

const civEl = document.getElementById('civ')!;
const runEl = document.getElementById('run')!;
const expEl = document.getElementById('expedition')!;
const runEndEl = document.getElementById('runend')!;

let civ: CivState = load() ?? newCivState();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'run',
  // Boot at the window size (a fixed, valid resolution). RESIZE mode would track the parent #run,
  // which is display:none at boot → a 0x0 framebuffer ("Incomplete Attachment"). We resize manually
  // on launch + window resize instead.
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#10141f',
  physics: { default: 'arcade', arcade: { debug: false } },
});

// Keep the canvas filling the window whenever a run is on screen.
window.addEventListener('resize', () => {
  if (runEl.classList.contains('active')) game.scale.resize(window.innerWidth, window.innerHeight);
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

function showCiv(celebrate?: { from: AgeId; to: AgeId }) {
  runEl.classList.remove('active');
  expEl.classList.remove('active');
  runEndEl.classList.remove('active');
  civEl.classList.remove('hidden');
  startAmbient('civ', getAge(civ)); // RC-020: era music for the current age (no-op until first gesture)
  renderCivScreen(civEl, civ, {
    onResearch: (id) => {
      const fromAge = getAge(civ);
      civ = research(civ, id);
      persist();
      const toAge = getAge(civ);
      if (toAge !== fromAge) {
        playSfx('age-up'); // RC-020 fanfare for the RC-024 age-up moment
        showCiv({ from: fromAge, to: toAge });
      } else {
        playSfx('research'); // RC-020
        showCiv();
        showToast(`Researched ${TECHS[id]?.name ?? id}`);
      }
    },
    onBuild: (id, tile) => { civ = build(civ, id, tile); playSfx('build'); persist(); showCiv(); },
    onUpgrade: (tile) => { civ = upgradeBuilding(civ, tile); playSfx('upgrade'); persist(); showCiv(); },
    onMoveBuilding: (from, to) => { civ = moveBuilding(civ, from, to); persist(); showCiv(); },
    onBuyTradition: (id) => { civ = buyTradition(civ, id); persist(); showCiv(); },
    onStartRun: () => startRun(),
    // RC-036 — a slot load / file import (or a slot save's re-render) hands back the civ to adopt.
    onCivReplaced: (next) => { civ = next; persist(); showCiv(); },
  }, celebrate);
}

/** Lightweight auto-fading toast for non-gating research completions. */
function showToast(msg: string) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 1800);
}

function startRun() {
  // Step 1: choose an expedition.
  civEl.classList.add('hidden');
  expEl.classList.add('active');
  renderExpeditionScreen(expEl, civ, {
    onPick: (expedition: Expedition, mutators: string[]) => launchExpedition(expedition, mutators),
    onKitChange: (kit, startWeapon) => { civ = { ...civ, kit, startWeapon }; persist(); startRun(); }, // re-render with new kit
    onSelectActive: (id) => { civ = { ...civ, activeItem: id }; persist(); startRun(); }, // re-render with new active
    onBack: () => { expEl.classList.remove('active'); showCiv(); },
  });
}

let lastBiomeId: string | undefined; // for per-biome best tracking (RC-027)

function launchExpedition(expedition: Expedition, mutators: string[] = []) {
  lastBiomeId = expedition.biomeId;
  expEl.classList.remove('active');
  runEl.classList.add('active');
  game.scale.resize(window.innerWidth, window.innerHeight); // fill the window now that #run is visible
  const modifiers: RunModifiers = computeRunModifiers(civ);
  startAmbient('run', expedition.biomeId); // RC-020: mood music for the expedition's biome
  playSfx('run-start');
  game.scene.stop('run');
  game.scene.start('run', {
    modifiers,
    expedition,
    mutators,
    heroSprite: heroSpriteFor(getAge(civ)),
    onComplete: (result: RunResult) => onRunComplete(result),
  });
}

function onRunComplete(result: RunResult) {
  playSfx(result.died ? 'run-end-death' : 'run-end-cleared'); // RC-020
  game.scene.stop('run');
  runEl.classList.remove('active');
  // Show the end-of-run summary; banking happens when the player chooses to return to base.
  runEndEl.classList.add('active');
  renderRunEndScreen(runEndEl, result, () => {
    runEndEl.classList.remove('active');
    civ = applyRunResult(civ, result, lastBiomeId);
    persist();
    showCiv();
  });
}

function persist() {
  save(civ);
}

showCiv();
