// Interact message: client tells server which entity it wants to hit.
// targetKind   — "resource" or "animal"
// nodeDamage   — player's nodeDamage stat (used for resources)
// animalDamage — player's animalDamage stat (used for animals)
// Both damage values are trusted client inputs until Phase 6 moves progression to server.

export function createInteractMessage({ targetId, targetKind = "resource", nodeDamage = 1, animalDamage = 1, seq = 0 }) {
  return {
    targetId: Number(targetId),
    targetKind: String(targetKind),
    nodeDamage: Number(nodeDamage),
    animalDamage: Number(animalDamage),
    seq: Number(seq),
  };
}

export function normalizeInteractMessage(payload = {}) {
  const targetKind = payload.targetKind === "animal" ? "animal" : "resource";
  return createInteractMessage({
    targetId: payload.targetId ?? -1,
    targetKind,
    // Cap damage values to a sane range so a cheating client can't one-shot everything.
    nodeDamage: Math.min(Math.max(1, Number(payload.nodeDamage || 1)), 10),
    animalDamage: Math.min(Math.max(1, Number(payload.animalDamage || 1)), 10),
    seq: payload.seq ?? 0,
  });
}
