import * as THREE from "three";
import { buildPlayerMesh } from "./player.js";
import { lerpAngle } from "../utils/scene-utils.js";

export class RemotePlayerEntity {
  constructor(snapshot) {
    this.sessionId = snapshot.sessionId;
    this.displayName = snapshot.displayName;
    this.group = new THREE.Group();
    this.group.name = `RemotePlayer:${snapshot.displayName}`;

    this.targetPosition = new THREE.Vector3(snapshot.x, snapshot.y, snapshot.z);
    this.previousPosition = new THREE.Vector3(snapshot.x, snapshot.y, snapshot.z);
    this.motion = new THREE.Vector3();
    this.targetRotation = snapshot.rotation;

    const { body, toolPivot } = buildPlayerMesh(this.group, {
      bodyColor: 0xffc170,
      bodyEmissive: 0x61361e,
      backpackColor: 0x5c4736,
    });

    this.body = body;
    this.toolPivot = toolPivot;
    this.group.position.copy(this.targetPosition);
    this.group.rotation.y = this.targetRotation;
    this.toolPivot.rotation.z = -0.35;
  }

  sync(snapshot) {
    this.displayName = snapshot.displayName;
    this.targetPosition.set(snapshot.x, snapshot.y, snapshot.z);
    this.targetRotation = snapshot.rotation;
    this.group.name = `RemotePlayer:${snapshot.displayName}`;
  }

  update(delta, elapsedTime) {
    this.previousPosition.copy(this.group.position);
    this.group.position.lerp(this.targetPosition, 1 - Math.exp(-12 * delta));

    this.motion
      .copy(this.group.position)
      .sub(this.previousPosition)
      .divideScalar(Math.max(delta, 0.0001));

    this.group.rotation.y = lerpAngle(
      this.group.rotation.y,
      this.targetRotation,
      1 - Math.exp(-14 * delta),
    );

    this.body.rotation.z =
      Math.sin(elapsedTime * 9 + this.group.position.x * 0.2) *
      0.04 *
      Math.min(1, this.motion.length() * 0.18);
  }
}
