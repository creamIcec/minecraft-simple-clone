import { Environment } from "./environment/Environment";
import { Player } from "./player/Player";
import { World } from "./world/World";

const environment = new Environment();
const { renderer, camera, scene, stats } = environment.getEssentials();

const world = new World(scene);
const player = new Player(camera, renderer.domElement);
//生成方块
world.generateBlocks(16, "stone", 0);
world.generateBlocks(16, "dirt", 1);
world.generateBlocks(16, "grass", 2);
world.generateBlocks(16, "log", 3);
world.generateBlocks(16, "plank", 4);
world.generateBlocks(16, "glass", 5);

//渲染循环，整个程序的核心
function renderLoop() {
  environment.render();

  player.update();

  stats.update();

  requestAnimationFrame(renderLoop);
}

renderLoop();
