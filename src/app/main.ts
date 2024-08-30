import {
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Scene,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Environment } from "./environment/Environment";
import { textures } from "./textures/MaterialManager";

const environment = new Environment();
const { renderer, camera, scene, stats } = environment.getEssentials();

//添加一个测试方块

function addBlocks(scene: Scene, size: number) {
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshLambertMaterial({ map: textures.grass });
  const block = new InstancedMesh(geometry, material, size * size);
  const matrix = new Matrix4();
  let count = 0;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      //设置instancedMesh中某个物体所在的位置的方法
      //1. 指定这个物体的坐标
      //2. 创建一个新的矩阵变换(Matrix4), 并且将它的变换设置为"变换到相应坐标";
      //3. 将instancedMesh中某个id设置为这个矩阵变换
      const position = new Vector3(i, 0, j);
      matrix.setPosition(position);
      block.setMatrixAt(count, matrix);
      count++;
    }
  }
  scene.add(block);
  return block;
}

const orbitControls = new OrbitControls(camera, renderer.domElement);

addBlocks(scene, 128);

//渲染循环，整个程序的核心
function renderLoop() {
  environment.render();

  orbitControls.update();

  stats.update();

  requestAnimationFrame(renderLoop);
}

renderLoop();
