export function createMoveMessage(payload = {}) {
  return normalizeMoveMessage(payload);
}

export function normalizeMoveMessage(payload = {}) {
  const horizontal = clampAxis(payload.horizontal);
  const vertical = clampAxis(payload.vertical);
  const magnitude = Math.hypot(horizontal, vertical);
  const scale = magnitude > 1 ? 1 / magnitude : 1;

  return {
    horizontal: roundAxis(horizontal * scale),
    vertical: roundAxis(vertical * scale),
    sprint: payload.sprint === true,
    seq: sanitizeSequence(payload.seq),
  };
}

function clampAxis(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-1, Math.min(1, value));
}

function roundAxis(value) {
  return Math.round(value * 1000) / 1000;
}

function sanitizeSequence(value) {
  if (!Number.isInteger(value) || value < 0) {
    return 0;
  }

  return value;
}
