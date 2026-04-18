import * as THREE from "three";
import { BASE_ACTION_INTERVAL } from "./config/game-config.js";
import { InputController } from "./core/input.js";
import {
  applyUpgradeToState,
  createRunState,
  getAvailableUpgrades,
  getResourceYield,
} from "./core/state.js";
import { UPGRADE_DEFINITIONS } from "./data/game-data.js";
import {
  canAffordRecipe,
  getUnlockedBuildRecipes,
  spendRecipeCost,
} from "./data/build-data.js";
import { PlayerController } from "./entities/player.js";
import { NetworkClient } from "./network/network-client.js";
import { CameraController } from "./systems/camera-controller.js";
import { BuildMenuController } from "./ui/build-menu.js";
import { HUDController } from "./ui/hud.js";
import { lerpAngle } from "./utils/scene-utils.js";
import { WorldManager } from "./world/world.js";

export class GameApp {
  constructor({ canvas, documentRef = document, windowRef = window }) {
    this.canvas = canvas;
    this.documentRef = documentRef;
    this.windowRef = windowRef;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08111d);
    this.scene.fog = new THREE.Fog(0x08111d, 22, 52);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
    this.clock = new THREE.Clock();

    this.state = createRunState();
    this.status = "Loading...";
    this.targetLabel = "Nothing nearby";
    this.currentUpgradeChoices = [];

    this.input = new InputController(this.windowRef);
    this.hud = new HUDController(this.documentRef);
    this.hud.bindUpgradeSelection((upgradeId) => this.handleUpgradeChoice(upgradeId));
    this.buildMenu = new BuildMenuController(this.documentRef);
    this.buildMenu.bindBuildSelection((recipeId) => this.handleBuildRequest(recipeId));
    this.buildMenu.bindClose(() => this.closeBuildMenu());
    this.network = new NetworkClient({
      windowRef: this.windowRef,
      onStatusChange: ({ label }) => this.hud.setNetworkStatus(label),
      onInventoryChanged: (data) => this.handleInventoryChanged(data),
      onResourceStateChange: (snapshots) => this.world.syncResourceStates(snapshots),
    });
    this.hud.setNetworkStatus("Offline");

    this.player = new PlayerController();
    this.scene.add(this.player.group);

    this.world = new WorldManager(this.scene);
    this.cameraController = new CameraController(this.camera);

    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);

    this.windowRef.addEventListener("resize", this.handleResize);
    this.handleResize();
    this.resetRun();
  }

  start() {
    void this.connectNetwork();
    this.animate();
  }

  destroy() {
    this.windowRef.removeEventListener("resize", this.handleResize);
    this.input.destroy();
    this.hud.destroy();
    this.buildMenu.destroy();
    void this.network.disconnect();
  }

  handleResize() {
    this.cameraController.resize(this.windowRef.innerWidth, this.windowRef.innerHeight);
    this.renderer.setSize(this.windowRef.innerWidth, this.windowRef.innerHeight);
    this.renderer.setPixelRatio(Math.min(this.windowRef.devicePixelRatio || 1, 2));
  }

  resetRun() {
    const preservePlayerTransform = this.network.isConnected();
    const preservedPosition = preservePlayerTransform ? this.player.position.clone() : null;
    const preservedRotation = this.player.group.rotation.y;

    Object.assign(this.state, createRunState());
    this.currentUpgradeChoices = [];

    this.player.reset();
    this.world.reset();

    if (preservePlayerTransform && preservedPosition) {
      this.player.position.copy(preservedPosition);
      this.player.group.rotation.y = preservedRotation;
    }

    this.cameraController.reset(this.player.position);
    this.hud.hideUpgradeChoices();
    this.buildMenu.close();

    this.setStatus("Gather, hunt, and survive.");
    this.targetLabel = "Nothing nearby";
    this.renderHud();
  }

  animate() {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsedTime = this.clock.elapsedTime;

    if (this.input.wasPressed("KeyR")) {
      this.resetRun();
    }

    if (this.input.wasPressed("Escape") && this.state.mode === "build") {
      this.closeBuildMenu();
    }

    if (this.input.wasPressed("KeyB")) {
      this.toggleBuildMenu();
    }

    this.state.actionCooldown = Math.max(0, this.state.actionCooldown - delta);
    this.state.swingTime = Math.max(0, this.state.swingTime - delta);

    if (this.input.isActionHeld()) {
      this.tryPrimaryAction();
    }

    this.player.update({
      delta,
      elapsedTime,
      input: this.input,
      mode: this.state.mode,
      moveSpeed: this.state.moveSpeed,
      swingTime: this.state.swingTime,
    });

    this.network.sendMoveIntent(
      this.state.mode === "playing"
        ? {
            ...this.input.getMovementAxes(),
            sprint: this.input.isSprinting(),
          }
        : {
            horizontal: 0,
            vertical: 0,
            sprint: false,
          },
      elapsedTime,
    );

    if (this.state.mode !== "build" && this.state.mode !== "levelup") {
      this.world.update({
        delta,
        elapsedTime,
        playerPosition: this.player.position,
        aggroReduction: this.state.aggroReduction,
        canDamagePlayer: this.state.mode === "playing",
        onPlayerDamaged: (attack) => this.handlePlayerDamaged(attack),
      });
    }

    const target = this.world.updateTargeting(this.player.position, this.state.mode === "playing");
    this.targetLabel = target
      ? `${target.label} - Space/E`
      : this.state.mode === "build"
        ? "Build menu open"
      : this.state.mode === "levelup"
        ? "Choose upgrade"
        : "Nothing nearby";

    this.world.syncRemotePlayers(
      this.network.getPlayerSnapshots(),
      this.network.sessionId,
      delta,
      elapsedTime,
    );
    this.reconcileLocalPlayer(this.network.getLocalPlayerSnapshot(), delta);

    this.cameraController.update(delta, this.player.position);
    this.renderHud();
    this.renderer.render(this.scene, this.camera);
    this.input.finishFrame();

    this.windowRef.requestAnimationFrame(this.animate);
  }

  tryPrimaryAction() {
    if (this.state.actionCooldown > 0 || this.state.mode !== "playing") {
      return;
    }

    this.state.actionCooldown = BASE_ACTION_INTERVAL / this.state.attackSpeed;
    this.state.swingTime = 0.2;

    const target = this.world.findNearestTarget(this.player.position);

    if (!target) {
      this.setStatus("Nothing in range.");
      return;
    }

    if (target.kind === "resource") {
      this.handleResourceInteract(target);
      return;
    }

    // Animal hit — still client-local (Phase 4 will move this to server).
    const result = target.entity.hit(this.state.animalDamage);

    if (!result.killed) {
      this.setStatus(`Hit ${target.label}.`);
      return;
    }

    const meatAmount = target.entity.definition.meat + this.state.meatYield;
    this.state.inventory.meat += meatAmount;
    this.gainXp(target.entity.definition.xpOnDefeat);
    this.setStatus(`Defeated ${target.label}: +${meatAmount} meat.`);
  }

  handleResourceInteract(target) {
    if (this.network.isConnected()) {
      // Server-authoritative path: send INTERACT, wait for INVENTORY_CHANGED.
      this.network.sendInteract(target.entity.id, this.state.nodeDamage);
      this.setStatus(`Gathering ${target.entity.label}...`);
      return;
    }

    // Offline / single-player fallback — apply hit and yield locally.
    const result = target.entity.hit(this.state.nodeDamage);
    const yieldAmount = getResourceYield(this.state, target.entity.type);
    const def = target.entity.definition;

    this.state.inventory[def.drop] += yieldAmount;
    this.gainXp(def.xpPerHit);
    this.setStatus(`+${yieldAmount} ${def.drop} from ${target.entity.label}.`);

    if (result.depleted) {
      this.setStatus(`${target.entity.label} depleted.`);
    }
  }

  // Called when server confirms a resource hit and grants a yield.
  handleInventoryChanged(data) {
    const { drop, baseAmount, xp, resourceType } = data;

    if (!drop || !(drop in this.state.inventory)) {
      return;
    }

    // Server grants base 1; client applies its own yield multiplier on top
    // (until Phase 6 moves progression to server).
    const yieldAmount = baseAmount * getResourceYield(this.state, resourceType || "tree");
    this.state.inventory[drop] += yieldAmount;

    if (xp) {
      this.gainXp(xp);
    }

    if (this.state.mode === "playing") {
      this.setStatus(`+${yieldAmount} ${drop}.`);
    }
  }

  handlePlayerDamaged(attack) {
    if (this.state.mode !== "playing") {
      return;
    }

    this.state.health = Math.max(0, this.state.health - attack.damage);

    if (this.state.health <= 0) {
      this.state.mode = "dead";
      this.setStatus("You were defeated. Press R to restart the run.");
      return;
    }

    this.setStatus(`${attack.label} hit you.`);
  }

  gainXp(amount) {
    if (!amount) {
      return;
    }

    this.state.xp += amount;
    let leveledUp = false;

    while (this.state.xp >= this.state.nextLevelXp) {
      this.state.xp -= this.state.nextLevelXp;
      this.state.level += 1;
      this.state.nextLevelXp = Math.round(this.state.nextLevelXp * 1.32 + 10);
      leveledUp = true;
    }

    if (leveledUp) {
      this.presentUpgradeChoices();
    }
  }

  presentUpgradeChoices() {
    const available = getAvailableUpgrades(this.state, UPGRADE_DEFINITIONS);
    if (available.length === 0) {
      return;
    }

    this.closeBuildMenu(true);
    this.state.mode = "levelup";
    this.currentUpgradeChoices = shuffleArray(available).slice(0, 3);
    this.hud.showUpgradeChoices(this.currentUpgradeChoices);
    this.setStatus("Level up! Choose an upgrade.");
  }

  handleUpgradeChoice(upgradeId) {
    if (this.state.mode !== "levelup") {
      return;
    }

    const upgrade =
      this.currentUpgradeChoices.find((item) => item.id === upgradeId) ||
      UPGRADE_DEFINITIONS.find((item) => item.id === upgradeId);

    if (!upgrade) {
      return;
    }

    this.state.upgradeIds.push(upgrade.id);
    applyUpgradeToState(this.state, upgrade);
    this.currentUpgradeChoices = [];
    this.state.mode = "playing";
    this.hud.hideUpgradeChoices();
    this.setStatus(`${upgrade.label} unlocked.`);
  }

  async connectNetwork() {
    try {
      await this.network.connect();
      this.setStatus("Connected to multiplayer room. Gather, hunt, and survive.");
    } catch (error) {
      console.error("Multiplayer bootstrap failed:", error);
      this.hud.setNetworkStatus("Offline");
      this.setStatus("Multiplayer server unavailable. Single-player fallback active.");
    }
  }

  toggleBuildMenu() {
    if (this.state.mode === "dead" || this.state.mode === "levelup") {
      return;
    }

    if (this.state.mode === "build") {
      this.closeBuildMenu();
      return;
    }

    this.openBuildMenu();
  }

  openBuildMenu() {
    if (this.state.mode !== "playing") {
      return;
    }

    this.state.mode = "build";
    this.buildMenu.open(this.getBuildRecipes(), this.state.inventory);
    this.setStatus("Build menu open. Bir recipe sec ve yapini kur.");
  }

  closeBuildMenu(silent = false) {
    if (this.state.mode !== "build") {
      return;
    }

    this.state.mode = "playing";
    this.buildMenu.close();

    if (!silent) {
      this.setStatus("Build menu closed.");
    }
  }

  handleBuildRequest(recipeId) {
    if (this.state.mode !== "build") {
      return;
    }

    const recipe = this.getBuildRecipes().find((item) => item.id === recipeId);
    if (!recipe) {
      this.setStatus("Bu recipe unlock edilmemis.");
      return;
    }

    if (!canAffordRecipe(recipe, this.state.inventory)) {
      this.setStatus(`Yeterli kaynak yok: ${recipe.label}.`);
      this.buildMenu.update(this.getBuildRecipes(), this.state.inventory);
      return;
    }

    const placement = this.world.placeStructure(
      recipe,
      this.player.position,
      this.player.group.rotation.y,
    );

    if (!placement.success) {
      this.setStatus(placement.message);
      return;
    }

    spendRecipeCost(recipe, this.state.inventory);
    this.buildMenu.update(this.getBuildRecipes(), this.state.inventory);
    this.setStatus(`${recipe.label} built.`);
    this.renderHud();
  }

  getBuildRecipes() {
    return getUnlockedBuildRecipes(this.state.unlockedRecipes);
  }

  setStatus(message) {
    this.status = message;
  }

  reconcileLocalPlayer(snapshot, delta) {
    if (!snapshot) {
      return;
    }

    const serverPosition = new THREE.Vector3(snapshot.x, snapshot.y, snapshot.z);
    const distanceSquared = this.player.position.distanceToSquared(serverPosition);

    if (distanceSquared > 25) {
      this.player.position.copy(serverPosition);
    } else if (distanceSquared > 0.0001) {
      this.player.position.lerp(serverPosition, 1 - Math.exp(-11 * delta));
    }

    this.player.group.rotation.y = lerpAngle(
      this.player.group.rotation.y,
      snapshot.rotation,
      1 - Math.exp(-12 * delta),
    );
  }

  renderHud() {
    this.hud.update(this.state);
    this.hud.setStatus(this.status);
    this.hud.setTarget(this.targetLabel);
  }
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
