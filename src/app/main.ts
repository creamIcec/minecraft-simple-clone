import { Environment } from "./environment/Environment";
import { Physics } from "./environment/Physics";
import { Player } from "./player/Player";
import { World } from "./world/World";

const environment = new Environment();
const { renderer, camera, scene, stats } = environment.getEssentials();

const physics = new Physics(scene);
const world = new World(scene);
const player = new Player(camera, world, renderer.domElement);

let lastTickTime = performance.now();

//渲染循环，整个程序的核心
function renderLoop() {
  const currentTickTime = performance.now();
  const deltaTick = (currentTickTime - lastTickTime) / 1000;
  lastTickTime = currentTickTime;

  physics.update(deltaTick, player, world);
  environment.render();
  stats.update();

  requestAnimationFrame(renderLoop);
}

renderLoop();
