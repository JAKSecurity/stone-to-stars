import './style.css';
import Phaser from 'phaser';
import { CivState, RunModifiers, RunResult, Expedition } from './game/types';
import { newCivState, applyRunResult } from './state/civState';
import { load, save } from './state/saveLoad';
import { research, getAge } from './tech/tech';
import { heroSpriteFor } from './game/heroByAge';
import { build, upgradeBuilding, moveBuilding } from './camp/camp';
import { buyTradition } from './civics/traditions';
import { computeRunModifiers } from './run/modifiers';
import { renderCivScreen } from './ui/civScreen';
import { renderExpeditionScreen } from './ui/expeditionScreen';
import { renderRunEndScreen } from './ui/runEndScreen';
import { RunScene } from './scenes/RunScene';
import { registerTextures } from './art/phaserTextures';

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

function showCiv() {
  runEl.classList.remove('active');
  expEl.classList.remove('active');
  runEndEl.classList.remove('active');
  civEl.classList.remove('hidden');
  renderCivScreen(civEl, civ, {
    onResearch: (id) => { civ = research(civ, id); persist(); showCiv(); },
    onBuild: (id, tile) => { civ = build(civ, id, tile); persist(); showCiv(); },
    onUpgrade: (tile) => { civ = upgradeBuilding(civ, tile); persist(); showCiv(); },
    onMoveBuilding: (from, to) => { civ = moveBuilding(civ, from, to); persist(); showCiv(); },
    onBuyTradition: (id) => { civ = buyTradition(civ, id); persist(); showCiv(); },
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
  game.scale.resize(window.innerWidth, window.innerHeight); // fill the window now that #run is visible
  const modifiers: RunModifiers = computeRunModifiers(civ);
  game.scene.stop('run');
  game.scene.start('run', {
    modifiers,
    expedition,
    heroSprite: heroSpriteFor(getAge(civ)),
    onComplete: (result: RunResult) => onRunComplete(result),
  });
}

function onRunComplete(result: RunResult) {
  game.scene.stop('run');
  runEl.classList.remove('active');
  // Show the end-of-run summary; banking happens when the player chooses to return to base.
  runEndEl.classList.add('active');
  renderRunEndScreen(runEndEl, result, () => {
    runEndEl.classList.remove('active');
    civ = applyRunResult(civ, result);
    persist();
    showCiv();
  });
}

function persist() {
  save(civ);
}

showCiv();
