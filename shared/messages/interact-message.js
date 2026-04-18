// Interact message: client tells server which resource it wants to hit.
// nodeDamage is the player's current nodeDamage stat (trusted client value until
// Phase 6 moves progression to server).

export function createInteractMessage({ targetId, nodeDamage = 1, seq = 0 }) {
  return {
    targetId: Number(targetId),
    nodeDamage: Number(nodeDamage),
    seq: Number(seq),
  };
}

export function normalizeInteractMessage(payload = {}) {
  return createInteractMessage({
    targetId: payload.targetId ?? -1,
    // Cap nodeDamage to a sane range so a cheating client can't one-shot everything.
    nodeDamage: Math.min(Math.max(1, Number(payload.nodeDamage || 1)), 10),
    seq: payload.seq ?? 0,
  });
}
