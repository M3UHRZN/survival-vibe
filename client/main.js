import { GameApp } from "./src/game.js";

const canvas = document.querySelector("#game");
const game = new GameApp({ canvas, documentRef: document, windowRef: window });

game.start();
