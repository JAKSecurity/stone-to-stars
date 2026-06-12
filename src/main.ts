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
import { renderCivScreen, slotCard } from './ui/civScreen';
import { renderExpeditionScreen } from './ui/expeditionScreen';
import { renderRunEndScreen } from './ui/runEndScreen';
import { RunScene } from './scenes/RunScene';
import { SLOTS } from './state/saveSlots';
import { registerTextures } from './art/phaserTextures';
// RC-020 audio: additive integration. The audio module stands alone; these are the
// only call-sites outside the hot run/weapon files (the remaining in-run hooks are
// documented in src/audio/README.md for post-merge wiring).
import { playSfx, startAmbient, mountAudioControls, unlockAudioOnFirstGesture, bindVolumeSlider } from './audio';

const civEl = document.getElementById('civ')!;
const runEl = document.getElementById('run')!;
const expEl = document.getElementById('expedition')!;
const runEndEl = document.getElementById('runend')!;
const pauseEl = document.getElementById('pausemenu')!;

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
    // RC-039: the scene drives the pause overlay's visibility (ESC opens/closes; abandon/finish hide).
    onPauseMenu: (open: boolean) => { if (open) renderPauseMenu(); else hidePauseMenu(); },
  });
}

/** RC-039: the run scene casts back to so its public pause methods (Resume / Abandon / discard). */
function runScene(): RunScene {
  return game.scene.getScene('run') as RunScene;
}

function hidePauseMenu() {
  pauseEl.classList.remove('active');
  pauseEl.replaceChildren();
}

/**
 * RC-039: the ESC pause overlay over the live run. Flat, always-visible controls (jeff-ui-design):
 * Resume, a save-slots row (reusing the civ screen's slotCard), volume, and Abandon. Save mid-run
 * saves the pre-run civ (runs never persist — harmless + predictable). Load DISCARDS the run with no
 * banking (you're rewinding) then adopts the slot. Abandon banks the haul like death.
 */
function renderPauseMenu() {
  pauseEl.replaceChildren();
  pauseEl.classList.add('active');

  const panel = document.createElement('div');
  panel.className = 'pause-panel';

  const h = document.createElement('h2');
  h.textContent = 'Paused';
  panel.appendChild(h);

  // Resume — closes via the scene so its pause state + physics resume in lockstep with the overlay.
  const resume = document.createElement('button');
  resume.className = 'pause-btn pause-primary';
  resume.textContent = '▶ Resume expedition';
  resume.onclick = () => runScene().closePauseMenu();
  panel.appendChild(resume);

  // Save slots row — reuse the civ screen's slotCard. Save persists the (pre-run) civ; Load discards
  // the live run without banking, then adopts the slot and shows the city screen.
  const slotsWrap = document.createElement('div');
  slotsWrap.className = 'panel saveslots';
  slotsWrap.innerHTML = '<h2>Save / Load</h2>';
  const grid = document.createElement('div');
  grid.className = 'slotgrid';
  const onSlotReplaced = (next: CivState, slotChanged: boolean) => {
    if (!slotChanged) {
      // Save: civ unchanged, only the slot card needs to reflect the new save — re-render in place.
      civ = next; persist(); renderPauseMenu();
      return;
    }
    // Load: discard the live run (no banking) and adopt the slot, landing on the city screen.
    hidePauseMenu();
    runScene().discardRun();
    civ = next; persist(); showCiv();
  };
  for (const slot of SLOTS) {
    // slotCard's onCivReplaced fires for BOTH save (same civ object) and load (a different one).
    // Distinguish by identity: a load hands back a civ !== the current one.
    grid.appendChild(slotCard(slot, civ, (next) => onSlotReplaced(next, next !== civ)));
  }
  slotsWrap.appendChild(grid);
  panel.appendChild(slotsWrap);

  // Volume — bound to the same engine value as the bottom-right widget (shared getter/setter).
  const volWrap = document.createElement('div');
  volWrap.className = 'pause-vol';
  const volLabel = document.createElement('label');
  volLabel.textContent = '🔊 Volume';
  volLabel.htmlFor = 'pause-volume';
  const slider = document.createElement('input');
  slider.id = 'pause-volume';
  slider.type = 'range';
  slider.min = '0'; slider.max = '100'; slider.step = '1';
  bindVolumeSlider(slider);
  volWrap.appendChild(volLabel);
  volWrap.appendChild(slider);
  panel.appendChild(volWrap);

  // Abandon — confirm, then bank the partial haul exactly like death and return to the city.
  const abandon = document.createElement('button');
  abandon.className = 'pause-btn pause-danger';
  abandon.textContent = '🏳 Abandon expedition → return to city';
  abandon.onclick = () => {
    if (!window.confirm('Abandon the expedition? Your collected haul is banked, like a death.')) return;
    hidePauseMenu();
    runScene().abandonRun(); // routes through finish(true) → onComplete → end screen + banking
  };
  panel.appendChild(abandon);

  pauseEl.appendChild(panel);
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
