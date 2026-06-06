import './style.css';
import Phaser from 'phaser';
import { CivState, RunModifiers, RunResult } from './game/types';
import { newCivState, applyRunResult } from './state/civState';
import { load, save } from './state/saveLoad';
import { research } from './tech/tech';
import { build, upgradeBuilding } from './camp/camp';
import { computeRunModifiers } from './run/modifiers';
import { renderCivScreen } from './ui/civScreen';
import { RunScene } from './scenes/RunScene';

const civEl = document.getElementById('civ')!;
const runEl = document.getElementById('run')!;

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

function showCiv() {
  runEl.classList.remove('active');
  civEl.classList.remove('hidden');
  renderCivScreen(civEl, civ, {
    onResearch: (id) => { civ = research(civ, id); persist(); showCiv(); },
    onBuild: (id, tile) => { civ = build(civ, id, tile); persist(); showCiv(); },
    onUpgrade: (tile) => { civ = upgradeBuilding(civ, tile); persist(); showCiv(); },
    onStartRun: () => startRun(),
  });
}

function startRun() {
  civEl.classList.add('hidden');
  runEl.classList.add('active');
  const modifiers: RunModifiers = computeRunModifiers(civ);
  game.scene.stop('run');
  game.scene.start('run', {
    modifiers,
    onComplete: (result: RunResult) => onRunComplete(result),
  });
}

function onRunComplete(result: RunResult) {
  game.scene.stop('run');
  civ = applyRunResult(civ, result);
  persist();
  showCiv();
}

function persist() {
  save(civ);
}

showCiv();
