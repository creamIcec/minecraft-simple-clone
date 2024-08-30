import {
  Scene,
  Color,
  AmbientLight,
  DirectionalLight,
  DirectionalLightHelper,
  Matrix4,
  Vector3,
  InstancedBufferAttribute,
  Intersection,
  Object3D,
  InstancedMesh,
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
  instanceId: number | null; //目前这个位置的方块有没有分配instanceId? 如果为null, 说明目前这个方块存在于这个世界上，但是被完全遮挡，不需要显示，如果为一个数字，说明正常显示
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
      return { name: "air", instanceId: null };
    }
    return this.blockStates[x][y][z];
  }

  //设置某个位置的方块
  public setBlockStateAt(
    x: number,
    y: number,
    z: number,
    blockState: BlockName
  ) {
    if (!this.isInBounds(x, y, z)) {
      return;
    }
    this.blockStates[x][y][z].name = blockState;
  }

  public setInstanceIdAt(
    x: number,
    y: number,
    z: number,
    instanceId: number | null
  ) {
    const blockState = this.getBlockStateAt(x, y, z);
    if (blockState && blockState.name !== "air") {
      this.blockStates[x][y][z].instanceId = instanceId;
    }
  }

  public getInstanceIdAt(x: number, y: number, z: number) {
    const blockState = this.getBlockStateAt(x, y, z);
    if (blockState) {
      return blockState.instanceId;
    }
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
            instanceId: null,
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
            this.setBlockStateAt(x, y, z, "grass");
          } else if (y === height - 1) {
            this.setBlockStateAt(x, y, z, "dirt");
          } else if (y < height) {
            this.setBlockStateAt(x, y, z, "stone");
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
          //1. 判断是否是空气
          if (block && block.getName() !== "air") {
            //2. 判断这个方块是否可见
            if (!this.isBlockStateInvisibleAt(x, y, z)) {
              const mesh = block.getMesh();
              let index = mesh.count;
              matrix.setPosition(new Vector3(x, y, z));
              mesh.setMatrixAt(index, matrix);
              //更新数据
              this.setInstanceIdAt(x, y, z, index);
              mesh.count++;
            }
          }
        }
      }
    }
  }

  public getAllBlockMeshes() {
    return this.blocks.map((block) => block.getMesh());
  }

  //破坏方块的逻辑处理
  public removeBlockState(block: Intersection<Object3D>) {
    //1. 获取要移除的方块的位置
    if (block.object instanceof InstancedMesh) {
      if (block.distance > 5) {
        return;
      }

      const instanceId = block.instanceId!;
      const breakMatrix = new Matrix4();
      block.object.getMatrixAt(instanceId, breakMatrix);

      const breakPosition = new Vector3().setFromMatrixPosition(breakMatrix);
      //2. 删除要移除的地方的matrix: 通过将最后一个Matrix移动过来覆盖，再将count-1来实现
      const lastMatrix = new Matrix4();
      block.object.getMatrixAt(block.object.count - 1, lastMatrix);
      const lastPosition = new Vector3().setFromMatrixPosition(lastMatrix);

      //3. 更新数据
      const x = breakPosition.x,
        y = breakPosition.y,
        z = breakPosition.z;
      this.setBlockStateAt(x, y, z, "air");
      this.setInstanceIdAt(x, y, z, null);

      this.setInstanceIdAt(
        lastPosition.x,
        lastPosition.y,
        lastPosition.z,
        instanceId
      );

      block.object.setMatrixAt(instanceId, lastMatrix);
      block.object.count--;
      block.object.computeBoundingSphere();
      block.object.instanceMatrix.needsUpdate = true;

      //4. tryShowBlock
      this.tryShowBlock(x - 1, y, z);
      this.tryShowBlock(x + 1, y, z);
      this.tryShowBlock(x, y - 1, z);
      this.tryShowBlock(x, y + 1, z);
      this.tryShowBlock(x, y, z - 1);
      this.tryShowBlock(x, y, z + 1);
    }
  }

  //放置方块的逻辑处理
  public placeBlockState(
    block: Intersection<Object3D>,
    newBlockStateType: BlockName
  ) {
    //1. 参数检查, 交互结果是否是instancedMesh?
    if (block.object instanceof InstancedMesh) {
      if (block.distance > 5) {
        return;
      }
      const placeMatrix = new Matrix4();
      //2. 获取到目标位置的坐标
      block.object.getMatrixAt(block.instanceId!, placeMatrix);
      const face = block.face!.normal;
      const placePosition = new Vector3()
        .setFromMatrixPosition(placeMatrix)
        .add(face); //计算出要放置的位置

      //3. 获取到要摆放的方块的Mesh
      const placeBlock = this.blocks.find(
        (block) => block.getName() === newBlockStateType
      );

      if (placeBlock) {
        //4. 准备好要摆放的坐标给matrix
        placeMatrix.setPosition(placePosition);

        //5. 更新要摆放的Mesh
        const placeMesh = placeBlock.getMesh();
        const index = placeMesh.count;
        placeMesh.setMatrixAt(index, placeMatrix);

        placeMesh.count++;

        //6. 更新数据: 设置放置的地方的blockName和instanceId
        const x = placePosition.x,
          y = placePosition.y,
          z = placePosition.z;
        this.setBlockStateAt(x, y, z, newBlockStateType);
        this.setInstanceIdAt(x, y, z, index);

        //7. 隐藏周边的方块
        //7.1 判断可能隐藏的位置方块是否可见
        //7.2 如果是, 则执行隐藏
        this.tryHideBlock(x - 1, y, z);
        this.tryHideBlock(x + 1, y, z);
        this.tryHideBlock(x, y - 1, z);
        this.tryHideBlock(x, y + 1, z);
        this.tryHideBlock(x, y, z - 1);
        this.tryHideBlock(x, y, z + 1);

        placeMesh.computeBoundingSphere();
        placeMesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  //用于判断一个方块是否被完全遮盖, 处于不可见的状态
  public isBlockStateInvisibleAt(x: number, y: number, z: number) {
    const up = this.getBlockStateAt(x, y + 1, z).name != "air";
    const down = this.getBlockStateAt(x, y - 1, z).name != "air";
    const left = this.getBlockStateAt(x - 1, y, z).name != "air";
    const right = this.getBlockStateAt(x + 1, y, z).name != "air";
    const front = this.getBlockStateAt(x, y, z - 1).name != "air";
    const back = this.getBlockStateAt(x, y, z + 1).name != "air";

    return up && down && left && right && front && back;
  }

  //参数检查, 只不过因为检查流程比较复杂，所以单独写一个函数
  private tryHideBlock(x: number, y: number, z: number) {
    const blockState = this.getBlockStateAt(x, y, z);
    if (blockState.name !== "air" && this.isBlockStateInvisibleAt(x, y, z)) {
      this.hideBlock(x, y, z);
    }
  }

  private hideBlock(x: number, y: number, z: number) {
    //1. 获取到目标方块
    const blockState = this.getBlockStateAt(x, y, z);
    const name = blockState.name;
    const block = this.blocks.find((block) => block.getName() === name);
    //2. 判断是否是空气
    if (block && name !== "air") {
      //3. 将instanceMesh最后一个实例移动到要隐藏的instanceId处, 再将count-1, 实现隐藏
      const instancedMesh = block.getMesh();
      const lastMatrix = new Matrix4();
      const targetInstanceId = blockState.instanceId;
      if (!targetInstanceId) {
        return;
      }
      instancedMesh.getMatrixAt(instancedMesh.count - 1, lastMatrix);
      const lastPosition = new Vector3();
      lastPosition.applyMatrix4(lastMatrix);
      instancedMesh.setMatrixAt(targetInstanceId, lastMatrix);
      //4. 更新数据
      this.setInstanceIdAt(
        lastPosition.x,
        lastPosition.y,
        lastPosition.z,
        targetInstanceId
      );

      instancedMesh.count--;

      //告诉系统该方块的碰撞箱(用于raycaster)需要更新
      instancedMesh.computeBoundingSphere();
      instancedMesh.instanceMatrix.needsUpdate = true;

      this.setInstanceIdAt(x, y, z, null);
    }
  }

  private tryShowBlock(x: number, y: number, z: number) {
    const blockState = this.getBlockStateAt(x, y, z);
    if (
      blockState.name !== "air" &&
      !this.isBlockStateInvisibleAt(x, y, z) &&
      this.getInstanceIdAt(x, y, z) === null
    ) {
      this.showBlock(x, y, z);
    }
  }

  private showBlock(x: number, y: number, z: number) {
    //1. 获取到目标方块
    const blockState = this.getBlockStateAt(x, y, z);
    const name = blockState.name;
    const block = this.blocks.find((block) => block.getName() === name);
    //2. 判断是否是空气
    if (block && name !== "air") {
      const instancedMesh = block.getMesh();
      const index = instancedMesh.count;
      instancedMesh.count++;

      const matrix = new Matrix4();
      matrix.setPosition(new Vector3(x, y, z));
      this.setInstanceIdAt(x, y, z, index);
      instancedMesh.setMatrixAt(index, matrix);

      instancedMesh.computeBoundingSphere();
      instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
