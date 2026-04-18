import * as THREE from "three";
import { CAMERA_DEAD_ZONE, CAMERA_OFFSET, ISO_FRUSTUM } from "../config/game-config.js";

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.frustum = ISO_FRUSTUM;
    this.deadZone = CAMERA_DEAD_ZONE;
    this.offset = new THREE.Vector3(...CAMERA_OFFSET);
    this.focus = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.scratch = new THREE.Vector3();
  }

  resize(width, height) {
    const aspect = width / height;
    this.camera.left = (-this.frustum * aspect) / 2;
    this.camera.right = (this.frustum * aspect) / 2;
    this.camera.top = this.frustum / 2;
    this.camera.bottom = -this.frustum / 2;
    this.camera.updateProjectionMatrix();
  }

  reset(focusPosition) {
    this.focus.copy(focusPosition);
    this.camera.position.copy(focusPosition).add(this.offset);
    this.camera.lookAt(this.focus.x, 0.8, this.focus.z);
  }

  update(delta, focusPosition) {
    if (Math.abs(focusPosition.x - this.focus.x) > this.deadZone) {
      this.focus.x = focusPosition.x - Math.sign(focusPosition.x - this.focus.x) * this.deadZone;
    }

    if (Math.abs(focusPosition.z - this.focus.z) > this.deadZone) {
      this.focus.z = focusPosition.z - Math.sign(focusPosition.z - this.focus.z) * this.deadZone;
    }

    this.target.copy(this.focus);
    this.scratch.copy(this.target).add(this.offset);
    this.camera.position.lerp(this.scratch, 1 - Math.exp(-8 * delta));
    this.camera.lookAt(this.target.x, 0.8, this.target.z);
  }
}
