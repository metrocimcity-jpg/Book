import { initMammalTree } from "./tree.js";

const container = document.getElementById("tree-container");
const tree = await initMammalTree(container);

document.getElementById("btn-reset")?.addEventListener("click", () => {
  tree.resetView();
});
