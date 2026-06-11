export const KIT_SIZE = 4;

/** Normalize a kit: unlocked-only, deduped, clamped to KIT_SIZE, padded from `unlocked`;
 *  startWeapon coerced into the kit. Pure — UI and modifiers both call this. */
export function validateKit(
  kit: string[] | undefined, unlocked: string[], startWeapon?: string,
): { kit: string[]; startWeapon: string } {
  const seen = new Set<string>();
  const valid = (kit ?? []).filter((id) => unlocked.includes(id) && !seen.has(id) && (seen.add(id), true));
  const out = valid.slice(0, KIT_SIZE);
  for (const id of unlocked) {
    if (out.length >= KIT_SIZE) break;
    if (!out.includes(id)) out.push(id);
  }
  const start = startWeapon && out.includes(startWeapon) ? startWeapon : out[0] ?? 'club';
  return { kit: out, startWeapon: start };
}
