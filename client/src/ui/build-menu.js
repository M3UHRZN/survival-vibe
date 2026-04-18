import { canAffordRecipe } from "../data/build-data.js";

export class BuildMenuController {
  constructor(documentRef = document) {
    this.dom = {
      panel: documentRef.querySelector("[data-build-menu]"),
      options: documentRef.querySelector("[data-build-options]"),
      empty: documentRef.querySelector("[data-build-empty]"),
      close: documentRef.querySelector("[data-build-close]"),
    };

    this.onBuildSelected = null;
    this.onClose = null;

    this.handleClick = this.handleClick.bind(this);
    this.handleCloseClick = this.handleCloseClick.bind(this);

    this.dom.options.addEventListener("click", this.handleClick);
    this.dom.close.addEventListener("click", this.handleCloseClick);
  }

  destroy() {
    this.dom.options.removeEventListener("click", this.handleClick);
    this.dom.close.removeEventListener("click", this.handleCloseClick);
  }

  bindBuildSelection(handler) {
    this.onBuildSelected = handler;
  }

  bindClose(handler) {
    this.onClose = handler;
  }

  isOpen() {
    return !this.dom.panel.classList.contains("hidden");
  }

  open(recipes, inventory) {
    this.render(recipes, inventory);
    this.dom.panel.classList.remove("hidden");
  }

  update(recipes, inventory) {
    if (!this.isOpen()) {
      return;
    }

    this.render(recipes, inventory);
  }

  close() {
    this.dom.panel.classList.add("hidden");
  }

  render(recipes, inventory) {
    this.dom.empty.hidden = recipes.length > 0;
    this.dom.options.innerHTML = recipes
      .map((recipe) => renderRecipeCard(recipe, inventory))
      .join("");
  }

  handleClick(event) {
    const button = event.target.closest("[data-build-id]");
    if (!button || !this.onBuildSelected) {
      return;
    }

    this.onBuildSelected(button.dataset.buildId);
  }

  handleCloseClick() {
    if (this.onClose) {
      this.onClose();
    }
  }
}

function renderRecipeCard(recipe, inventory) {
  const affordable = canAffordRecipe(recipe, inventory);
  const costs = Object.entries(recipe.cost)
    .map(([resource, amount]) => {
      const available = inventory[resource] || 0;
      const enough = available >= amount;
      return `<span class="cost-pill${enough ? "" : " cost-pill-poor"}">${resource}: ${available}/${amount}</span>`;
    })
    .join("");

  return `
    <article class="build-card">
      <div class="build-card-top">
        <div>
          <span class="tag">Build</span>
          <strong>${recipe.label}</strong>
        </div>
        <button
          class="build-button"
          type="button"
          data-build-id="${recipe.id}"
          ${affordable ? "" : "disabled"}
        >
          Place
        </button>
      </div>
      <p>${recipe.description}</p>
      <div class="cost-row">${costs}</div>
    </article>
  `;
}
