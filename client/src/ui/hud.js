export class HUDController {
  constructor(documentRef = document) {
    this.dom = {
      healthLabel: documentRef.querySelector("[data-health-label]"),
      healthFill: documentRef.querySelector("[data-health-fill]"),
      level: documentRef.querySelector("[data-level]"),
      xpLabel: documentRef.querySelector("[data-xp-label]"),
      xpFill: documentRef.querySelector("[data-xp-fill]"),
      status: documentRef.querySelector("[data-status]"),
      networkStatus: documentRef.querySelector("[data-network-status]"),
      target: documentRef.querySelector("[data-target]"),
      attackSpeed: documentRef.querySelector("[data-attack-speed]"),
      path: documentRef.querySelector("[data-path]"),
      tools: documentRef.querySelector("[data-tools]"),
      recipes: documentRef.querySelector("[data-recipes]"),
      inventory: {
        wood: documentRef.querySelector("[data-inv-wood]"),
        stone: documentRef.querySelector("[data-inv-stone]"),
        gold: documentRef.querySelector("[data-inv-gold]"),
        meat: documentRef.querySelector("[data-inv-meat]"),
      },
      overlay: documentRef.querySelector("[data-upgrade-overlay]"),
      upgradeOptions: documentRef.querySelector("[data-upgrade-options]"),
    };

    this.onUpgradeSelected = null;
    this.handleUpgradeClick = this.handleUpgradeClick.bind(this);
    this.dom.upgradeOptions.addEventListener("click", this.handleUpgradeClick);
  }

  destroy() {
    this.dom.upgradeOptions.removeEventListener("click", this.handleUpgradeClick);
  }

  bindUpgradeSelection(handler) {
    this.onUpgradeSelected = handler;
  }

  update(state) {
    this.dom.healthLabel.textContent = `${Math.round(state.health)} / ${Math.round(state.maxHealth)}`;
    this.dom.healthFill.style.width = `${(state.health / state.maxHealth) * 100}%`;
    this.dom.level.textContent = String(state.level);
    this.dom.xpLabel.textContent = `${Math.round(state.xp)} / ${Math.round(state.nextLevelXp)} XP`;
    this.dom.xpFill.style.width = `${(state.xp / state.nextLevelXp) * 100}%`;
    this.dom.attackSpeed.textContent = `${state.attackSpeed.toFixed(2)}x`;

    this.dom.inventory.wood.textContent = String(state.inventory.wood);
    this.dom.inventory.stone.textContent = String(state.inventory.stone);
    this.dom.inventory.gold.textContent = String(state.inventory.gold);
    this.dom.inventory.meat.textContent = String(state.inventory.meat);

    this.dom.path.textContent = state.path || "Unchosen";
    this.dom.tools.textContent = state.unlockedTools.join(", ");
    this.dom.recipes.textContent = state.unlockedRecipes.length
      ? state.unlockedRecipes.join(", ")
      : "None";
  }

  setStatus(message) {
    this.dom.status.textContent = message;
  }

  setNetworkStatus(message) {
    this.dom.networkStatus.textContent = message;
  }

  setTarget(message) {
    this.dom.target.textContent = message;
  }

  showUpgradeChoices(choices) {
    this.dom.upgradeOptions.innerHTML = choices
      .map((upgrade) => {
        const unlocks = [...(upgrade.toolUnlocks || []), ...(upgrade.recipeUnlocks || [])];
        return `
          <button class="upgrade-option" type="button" data-upgrade-id="${upgrade.id}">
            <span class="tag">${upgrade.kind === "universal" ? "Universal" : upgrade.branch}</span>
            <strong>${upgrade.label}</strong>
            <p>${upgrade.description}</p>
            <small>${unlocks.length > 0 ? `Unlocks: ${unlocks.join(", ")}` : "Stat upgrade only."}</small>
          </button>
        `;
      })
      .join("");

    this.dom.overlay.classList.remove("hidden");
  }

  hideUpgradeChoices() {
    this.dom.overlay.classList.add("hidden");
    this.dom.upgradeOptions.innerHTML = "";
  }

  handleUpgradeClick(event) {
    const button = event.target.closest("[data-upgrade-id]");
    if (!button || !this.onUpgradeSelected) {
      return;
    }

    this.onUpgradeSelected(button.dataset.upgradeId);
  }
}
