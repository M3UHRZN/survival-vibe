export function stampShadows(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

export function clampXZ(position, limit, padding = 1) {
  const max = limit - padding;
  position.x = Math.max(-max, Math.min(max, position.x));
  position.z = Math.max(-max, Math.min(max, position.z));
}

export function lerpAngle(current, target, alpha) {
  const delta = ((((target - current) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return current + delta * alpha;
}
