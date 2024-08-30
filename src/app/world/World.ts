import {
  Scene,
  Color,
  AmbientLight,
  DirectionalLight,
  DirectionalLightHelper,
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Vector3,
} from "three";
import { textures } from "../textures/MaterialManager";

export class World {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;

    this.initWorld();
  }

  //初始化我们的世界
  private initWorld() {
    //更改天空颜色
    this.scene.background = new Color(0x75bfef); //#75bfef

    //添加光照
    const environmentLight = new AmbientLight(0xeeeeee, 0.7);
    this.scene.add(environmentLight);

    //添加阳光
    const sunLight = new DirectionalLight();
    sunLight.position.set(5, 50, 40);

    const lightHelper = new DirectionalLightHelper(
      sunLight,
      8,
      new Color("red")
    );
    this.scene.add(lightHelper);

    this.scene.add(sunLight);
  }

  //添加一片测试方块
  public addBlocks(size: number) {
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
    this.scene.add(block);
    return block;
  }
}
