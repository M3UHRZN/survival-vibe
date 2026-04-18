import { PLAYER_BASE_MOVE_SPEED } from "../config/game-config.js";

export function createRunState() {
  return {
    mode: "playing",
    level: 1,
    xp: 0,
    nextLevelXp: 40,
    health: 100,
    maxHealth: 100,
    moveSpeed: PLAYER_BASE_MOVE_SPEED,
    attackSpeed: 1,
    nodeDamage: 1,
    animalDamage: 1,
    globalYield: 0,
    woodYield: 0,
    stoneYield: 0,
    goldYield: 0,
    meatYield: 0,
    aggroReduction: 0,
    inventory: {
      wood: 0,
      stone: 0,
      gold: 0,
      meat: 0,
    },
    upgradeIds: [],
    path: null,
    unlockedTools: ["Starter Axe"],
    unlockedRecipes: [],
    actionCooldown: 0,
    swingTime: 0,
  };
}

export function getResourceYield(state, type) {
  const base = 1 + state.globalYield;

  if (type === "tree") {
    return base + state.woodYield;
  }

  if (type === "rock") {
    return base + state.stoneYield;
  }

  return base + state.goldYield;
}

export function getAvailableUpgrades(state, allUpgrades) {
  return allUpgrades.filter((upgrade) => {
    if (state.upgradeIds.includes(upgrade.id)) {
      return false;
    }

    if (upgrade.requires && !upgrade.requires.every((id) => state.upgradeIds.includes(id))) {
      return false;
    }

    if (upgrade.kind === "universal") {
      return true;
    }

    if (!state.path) {
      return !upgrade.requires || upgrade.requires.length === 0;
    }

    return upgrade.branch === state.path;
  });
}

export function applyUpgradeToState(state, upgrade) {
  if (upgrade.kind === "path" && !state.path) {
    state.path = upgrade.branch;
  }

  if (upgrade.stats) {
    state.moveSpeed += upgrade.stats.moveSpeed || 0;
    state.attackSpeed += upgrade.stats.attackSpeed || 0;
    state.nodeDamage += upgrade.stats.nodeDamage || 0;
    state.animalDamage += upgrade.stats.animalDamage || 0;
    state.globalYield += upgrade.stats.globalYield || 0;
    state.woodYield += upgrade.stats.woodYield || 0;
    state.stoneYield += upgrade.stats.stoneYield || 0;
    state.goldYield += upgrade.stats.goldYield || 0;
    state.meatYield += upgrade.stats.meatYield || 0;
    state.aggroReduction += upgrade.stats.aggroReduction || 0;

    if (upgrade.stats.maxHealth) {
      state.maxHealth += upgrade.stats.maxHealth;
      state.health += upgrade.stats.maxHealth;
    }

    if (upgrade.stats.heal) {
      state.health = Math.min(state.maxHealth, state.health + upgrade.stats.heal);
    }
  }

  for (const tool of upgrade.toolUnlocks || []) {
    if (!state.unlockedTools.includes(tool)) {
      state.unlockedTools.push(tool);
    }
  }

  for (const recipe of upgrade.recipeUnlocks || []) {
    if (!state.unlockedRecipes.includes(recipe)) {
      state.unlockedRecipes.push(recipe);
    }
  }
}
