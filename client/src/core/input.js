const GAMEPLAY_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
  "Space",
  "KeyE",
  "KeyB",
  "Escape",
  "KeyR",
]);

export class InputController {
  constructor(target = window) {
    this.target = target;
    this.keys = new Set();
    this.pressedThisFrame = new Set();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    this.target.addEventListener("keydown", this.handleKeyDown);
    this.target.addEventListener("keyup", this.handleKeyUp);
  }

  destroy() {
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
  }

  finishFrame() {
    this.pressedThisFrame.clear();
  }

  wasPressed(code) {
    return this.pressedThisFrame.has(code);
  }

  isPressed(code) {
    return this.keys.has(code);
  }

  isActionHeld() {
    return this.isPressed("Space") || this.isPressed("KeyE");
  }

  isSprinting() {
    return this.isPressed("ShiftLeft") || this.isPressed("ShiftRight");
  }

  getMovementAxes() {
    return {
      horizontal:
        (this.isPressed("KeyD") || this.isPressed("ArrowRight") ? 1 : 0) -
        (this.isPressed("KeyA") || this.isPressed("ArrowLeft") ? 1 : 0),
      vertical:
        (this.isPressed("KeyW") || this.isPressed("ArrowUp") ? 1 : 0) -
        (this.isPressed("KeyS") || this.isPressed("ArrowDown") ? 1 : 0),
    };
  }

  handleKeyDown(event) {
    if (GAMEPLAY_KEYS.has(event.code)) {
      event.preventDefault();
    }

    if (!this.keys.has(event.code)) {
      this.pressedThisFrame.add(event.code);
    }

    this.keys.add(event.code);
  }

  handleKeyUp(event) {
    if (GAMEPLAY_KEYS.has(event.code)) {
      event.preventDefault();
    }

    this.keys.delete(event.code);
  }
}
