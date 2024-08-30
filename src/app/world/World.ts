import {
  Scene,
  Color,
  AmbientLight,
  DirectionalLight,
  DirectionalLightHelper,
  Matrix4,
  Vector3,
} from "three";
import { Block } from "../block/Block";

export type BlockName = "grass" | "dirt" | "plank" | "log" | "stone" | "glass";

export class World {
  private scene: Scene;
  private blocks: Block[];

  constructor(scene: Scene) {
    this.scene = scene;
    this.blocks = [];
    this.initWorld();

    this.registerBlock("grass");
    this.registerBlock("dirt");
    this.registerBlock("log");
    this.registerBlock("plank");
    this.registerBlock("stone");
    this.registerBlock("glass");
  }

  //注册机制
  private registerBlock(name: BlockName) {
    const block = new Block(name);
    this.blocks.push(block);
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

    lightHelper.visible = false;
    this.scene.add(lightHelper);

    this.scene.add(sunLight);
  }

  //添加一片测试方块
  public generateBlocks(size: number, name: BlockName, layer: number) {
    const block = this.blocks.find((item) => item.getName() === name);
    if (block) {
      const mesh = block.getMesh();
      const matrix = new Matrix4();
      let count = 0;
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          //设置instancedMesh中某个物体所在的位置的方法
          //1. 指定这个物体的坐标
          //2. 创建一个新的矩阵变换(Matrix4), 并且将它的变换设置为"变换到相应坐标";
          //3. 将instancedMesh中某个id设置为这个矩阵变换
          const position = new Vector3(i, layer, j);
          matrix.setPosition(position);
          mesh.setMatrixAt(count, matrix);
          count++;
        }
      }
      this.scene.add(mesh); //暂时还是使用World来放置方块的3D对象
    }
  }
}
