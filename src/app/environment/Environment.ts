import { AmbientLight, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import Stats from "three/addons/libs/stats.module.js";

export class Environment {
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;
  private scene: Scene;
  private stats: Stats;

  constructor() {
    this.renderer = new WebGLRenderer({ antialias: true });
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.stats = new Stats();

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initStats();

    this.setUpResizeBehaviour();
  }

  //初始化渲染器
  private initRenderer() {
    document.body.appendChild(this.renderer.domElement);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  //初始化场景
  private initScene() {}

  //初始化相机
  private initCamera() {
    this.camera.position.set(20, 10, 20);
  }

  //初始化帧率查看器
  private initStats() {
    document.body.appendChild(this.stats.dom);
  }

  //当窗口尺寸发生变化时，如何反应
  private setUpResizeBehaviour() {
    window.addEventListener("resize", (_) => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public getEssentials() {
    const renderer = this.renderer;
    const camera = this.camera;
    const scene = this.scene;
    const stats = this.stats;

    return { renderer, camera, scene, stats };
  }
}
