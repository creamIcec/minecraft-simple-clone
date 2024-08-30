import {
  BoxGeometry,
  Mesh,
  MeshNormalMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

const scene = new Scene();
const camera = new PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
const renderer = new WebGLRenderer({ antialias: true });

document.body.appendChild(renderer.domElement);

renderer.setSize(window.innerWidth, window.innerHeight);

//添加一个测试方块

const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshNormalMaterial();

const orbitControls = new OrbitControls(camera, renderer.domElement);

const mesh = new Mesh(geometry, material);

scene.add(mesh);

camera.position.z = 5;

//渲染循环，整个程序的核心
function renderLoop() {
  renderer.render(scene, camera);

  orbitControls.update();

  requestAnimationFrame(renderLoop);
}

renderLoop();
