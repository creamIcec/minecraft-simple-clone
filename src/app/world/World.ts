import {
  Scene,
  Color,
  AmbientLight,
  DirectionalLight,
  DirectionalLightHelper,
  Matrix4,
  Vector3,
  InstancedBufferAttribute,
} from "three";
import { Block } from "../block/Block";
import { WORLD_SIZE, WORLD_HEIGHT } from "../constants";
import { SimplexNoise } from "three/examples/jsm/Addons.js";
import { RNG } from "../utils/rng";

export type BlockName =
  | "grass"
  | "dirt"
  | "plank"
  | "log"
  | "stone"
  | "glass"
  | "air";

export interface BlockState {
  name: BlockName;
}

export type BlockStates = BlockState[][][];

export class World {
  private scene: Scene;
  private blocks: Block[];
  private blockStates: BlockStates;

  private generationParameters = {
    seed: 1, //种子
    terrain: {
      scale: 30,
      magnitude: 0.5,
      offset: 0.3,
    },
  };

  constructor(scene: Scene) {
    this.scene = scene;
    this.blocks = [];
    this.blockStates = [];

    //初始化世界的基本元素(天空盒，光照等)
    this.initWorld();

    //注册方块
    this.registerBlock("grass");
    this.registerBlock("dirt");
    this.registerBlock("log");
    this.registerBlock("plank");
    this.registerBlock("glass");
    this.registerBlock("stone");

    this.resetDefaultMesh();

    //初始化地形数据
    this.initTerrainData();

    //生成地形数据
    this.generateTerrainData();

    //放置方块
    this.generateMeshes();
  }

  //注册机制
  private registerBlock(name: BlockName) {
    const block = new Block(name);
    this.blocks.push(block);

    //添加一种新的Mesh
    this.scene.add(block.getMesh());
  }

  //清除默认实例
  private resetDefaultMesh() {
    //遍历所有注册过的方块
    for (let i = 0; i < this.blocks.length; i++) {
      this.blocks[i].getMesh().instanceMatrix = new InstancedBufferAttribute(
        new Float32Array(WORLD_SIZE * WORLD_SIZE * WORLD_HEIGHT * 16),
        16
      );
    }
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

  //检查某个坐标是否在边界内
  private isInBounds(x: number, y: number, z: number) {
    if (x < 0 || x >= WORLD_SIZE) {
      return false;
    }

    if (y < 0 || y >= WORLD_HEIGHT) {
      return false;
    }

    if (z < 0 || z >= WORLD_SIZE) {
      return false;
    }

    return true;
  }

  //获取某个位置的方块
  public getBlockStateAt(x: number, y: number, z: number): BlockState {
    //参数检查
    if (!this.isInBounds(x, y, z)) {
      return { name: "air" };
    }
    return this.blockStates[x][y][z];
  }

  //设置某个位置的方块
  public setBlockStateAt(
    x: number,
    y: number,
    z: number,
    blockState: BlockState
  ) {
    if (!this.isInBounds(x, y, z)) {
      return;
    }
    this.blockStates[x][y][z] = blockState;
  }

  //1. 将所有的BlockState初始化成空气
  private initTerrainData() {
    for (let x = 0; x < WORLD_SIZE; x++) {
      const plane = [];
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        const row: BlockState[] = [];
        for (let z = 0; z < WORLD_SIZE; z++) {
          row.push({
            name: "air",
          });
        }
        plane.push(row);
      }
      this.blockStates.push(plane);
    }
  }

  //2. 生成地形数据
  private generateTerrainData() {
    const rng = new RNG(this.generationParameters.seed);
    const simplex = new SimplexNoise(rng);
    for (let x = 0; x < WORLD_SIZE; x++) {
      for (let z = 0; z < WORLD_SIZE; z++) {
        const value = simplex.noise(
          x / this.generationParameters.terrain.scale,
          z / this.generationParameters.terrain.scale
        );

        const scaledNoise =
          this.generationParameters.terrain.magnitude * value +
          this.generationParameters.terrain.offset;

        let height = Math.floor(WORLD_HEIGHT * scaledNoise);
        height = Math.max(0, Math.min(height, WORLD_HEIGHT));

        for (let y = 0; y < WORLD_HEIGHT; y++) {
          if (y === height) {
            this.setBlockStateAt(x, y, z, { name: "grass" });
          } else if (y === height - 1) {
            this.setBlockStateAt(x, y, z, { name: "dirt" });
          } else if (y < height) {
            this.setBlockStateAt(x, y, z, { name: "stone" });
          }
        }
      }
    }
  }

  //3. 生成地形(放置方块)
  private generateMeshes() {
    const matrix = new Matrix4();
    for (let x = 0; x < WORLD_SIZE; x++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
          const blockState = this.getBlockStateAt(x, y, z); //这个位置是什么方块呢?
          const block = this.blocks.find(
            (item) => item.getName() === blockState.name
          ); //是否在注册表中? 如果是，拿到相应的Block
          //参数检查
          if (block && block.getName() !== "air") {
            const mesh = block.getMesh();
            let index = mesh.count;
            matrix.setPosition(new Vector3(x, y, z));
            mesh.setMatrixAt(index, matrix);
            mesh.count++;
          }
        }
      }
    }
  }

  //添加一片测试方块
  //问题: count真的代表了实际的放置数量吗?
  //问题2: 我们如何知道在哪个位置放置了方块?
  public generateBlocks() {}
}
