export const BUILD_DEFINITIONS = [
  {
    id: "campfire",
    unlockName: "Campfire",
    label: "Campfire",
    description: "Kucuk bir ates noktasi. Gece kampi hissi verir.",
    cost: { wood: 6, stone: 4 },
    placementRadius: 1.8,
    placeDistance: 3.2,
  },
  {
    id: "storage-crate",
    unlockName: "Storage Crate",
    label: "Storage Crate",
    description: "Basit bir erzak sandigi.",
    cost: { wood: 10 },
    placementRadius: 1.6,
    placeDistance: 3.1,
  },
  {
    id: "workbench",
    unlockName: "Workbench",
    label: "Workbench",
    description: "Gelismis craftlar icin agir bir tezgah.",
    cost: { wood: 12, stone: 8 },
    placementRadius: 2.1,
    placeDistance: 3.6,
  },
  {
    id: "snare-trap",
    unlockName: "Snare Trap",
    label: "Snare Trap",
    description: "Av yolu icin yerde kurulan basit kapan.",
    cost: { wood: 8, meat: 2 },
    placementRadius: 1.4,
    placeDistance: 2.9,
  },
  {
    id: "smelter",
    unlockName: "Smelter",
    label: "Smelter",
    description: "Maden eritmek icin agir tas ocak.",
    cost: { wood: 6, stone: 14, gold: 4 },
    placementRadius: 2.4,
    placeDistance: 4,
  },
];

export function getUnlockedBuildRecipes(unlockedRecipes) {
  return BUILD_DEFINITIONS.filter((recipe) => unlockedRecipes.includes(recipe.unlockName));
}

export function canAffordRecipe(recipe, inventory) {
  return Object.entries(recipe.cost).every(([resource, amount]) => (inventory[resource] || 0) >= amount);
}

export function spendRecipeCost(recipe, inventory) {
  for (const [resource, amount] of Object.entries(recipe.cost)) {
    inventory[resource] -= amount;
  }
}
