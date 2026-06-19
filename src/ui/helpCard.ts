// Onboarding — the first-run "How to Play" card and a persistent ? reopen button.
// Self-contained DOM (mirrors the audio-controls fixed-mount pattern); pure storage helpers
// are unit-tested. Copy is the canonical pitch (see docs/superpowers/specs/2026-06-12-onboarding-help-design.md).

import { isTouchDevice } from '../platform/device';

export const HELP_SEEN_KEY = 'rogue-civ-seen-help-v1';

/** True until the player has dismissed the help card once (drives the first-run auto-show). */
export function shouldAutoShowHelp(storage: Storage = localStorage): boolean {
  return storage.getItem(HELP_SEEN_KEY) === null;
}

/** Mark the help card as seen so it stops auto-showing. Idempotent. */
export function markHelpSeen(storage: Storage = localStorage): void {
  storage.setItem(HELP_SEEN_KEY, '1');
}

const ONE_LINER = 'Lead a civilization from the Stone Age to the stars — one desperate survivor run at a time.';

const BLURB =
  'Stone to Stars fuses a survivor-style auto-battler with an empire-building tech tree. Each expedition drops you ' +
  'into the wilds: dodge the swarm while your weapons fire on their own, and haul back the gems ' +
  'you collect. Spend that haul on technology and buildings that carry your people through the ages — all ' +
  'the way to Space — making every future run deadlier in your favor. Death is never the end: whatever your ' +
  'civilization banks, it keeps. Climb high enough and you’ll face The Last Stand.';

const CONTROLS_DESKTOP: [string, string][] = [
  ['Move', 'W A S D'],
  ['Attack', 'automatic — your weapons fire on their own'],
  ['Active item', 'right-click (aims at the cursor; if equipped)'],
  ['Pause', 'Esc'],
  ['Collect', 'walk near gems to vacuum them in'],
  ['Level up', 'choose one card from the draft'],
];

const CONTROLS_TOUCH: [string, string][] = [
  ['Move', 'left thumb — drag anywhere on the left to steer'],
  ['Attack', 'automatic — your weapons fire on their own'],
  ['Active item', 'tap ⚡ (aims at the nearest enemy; if equipped)'],
  ['Pause', 'tap ⏸'],
  ['Collect', 'walk near gems to vacuum them in'],
  ['Level up', 'tap one card from the draft'],
];

const LOOP = 'Run → gather → research & grow your camp → return stronger → climb the ages → win The Last Stand.';

/**
 * Render the help card into `host` (a dedicated overlay div). Flat, single view — everything
 * visible at once. The "Got it" button marks the card seen and calls `onClose`.
 */
export function renderHelpCard(host: HTMLElement, opts: { onClose: () => void }): void {
  host.replaceChildren();
  host.className = 'help-overlay';

  const panel = document.createElement('div');
  panel.className = 'help-panel';

  const h = document.createElement('h2');
  h.textContent = 'How to Play';
  panel.appendChild(h);

  const tagline = document.createElement('p');
  tagline.className = 'help-tagline';
  tagline.textContent = ONE_LINER;
  panel.appendChild(tagline);

  const blurb = document.createElement('p');
  blurb.className = 'help-blurb';
  blurb.textContent = BLURB;
  panel.appendChild(blurb);

  const dl = document.createElement('dl');
  dl.className = 'help-controls';
  for (const [term, desc] of (isTouchDevice() ? CONTROLS_TOUCH : CONTROLS_DESKTOP)) {
    const dt = document.createElement('dt'); dt.textContent = term;
    const dd = document.createElement('dd'); dd.textContent = desc;
    dl.appendChild(dt); dl.appendChild(dd);
  }
  panel.appendChild(dl);

  const loop = document.createElement('p');
  loop.className = 'help-loop';
  loop.textContent = LOOP;
  panel.appendChild(loop);

  const btn = document.createElement('button');
  btn.className = 'pause-btn pause-primary';
  btn.textContent = 'Got it — play';
  btn.onclick = () => { markHelpSeen(); host.replaceChildren(); host.className = ''; opts.onClose(); };
  panel.appendChild(btn);

  host.appendChild(panel);
}

/**
 * Mount the small fixed ? button once (bottom-left, clear of the bottom-right audio panel).
 * Clicking it reopens the help card regardless of the seen flag. Idempotent.
 */
export function mountHelpButton(onOpen: () => void): HTMLElement | null {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) return null;
  const existing = doc.getElementById('help-button');
  if (existing) return existing as HTMLElement;

  const btn = doc.createElement('button');
  btn.id = 'help-button';
  btn.type = 'button';
  btn.textContent = '?';
  btn.title = 'How to play';
  btn.setAttribute('aria-label', 'How to play');
  btn.onclick = () => onOpen();
  doc.body.appendChild(btn);
  return btn;
}
