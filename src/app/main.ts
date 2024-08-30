import { WORLD_SIZE } from "./constants";
import { Environment } from "./environment/Environment";
import { Player } from "./player/Player";
import { World } from "./world/World";

const environment = new Environment();
const { renderer, camera, scene, stats } = environment.getEssentials();

const world = new World(scene);
const player = new Player(camera, renderer.domElement);

//渲染循环，整个程序的核心
function renderLoop() {
  environment.render();

  player.update();

  stats.update();

  requestAnimationFrame(renderLoop);
}

renderLoop();
