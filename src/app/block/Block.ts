import { BoxGeometry, InstancedMesh } from "three";
import { BlockName } from "../world/World";
import { getMaterialByName } from "../textures/MaterialManager";
import { WORLD_HEIGHT, WORLD_SIZE } from "../constants";

export class Block {
  private instancedMesh: InstancedMesh;
  private name: BlockName;
  constructor(name: BlockName) {
    const geometry = new BoxGeometry(1, 1, 1);
    const material = getMaterialByName(name);
    this.instancedMesh = new InstancedMesh(
      geometry,
      material,
      WORLD_SIZE * WORLD_SIZE
    );

    this.name = name;
  }

  public getName() {
    return this.name; //获取到这种方块的名字
  }

  public getMesh() {
    return this.instancedMesh; //获取到这种方块的instancedMesh
  }
}
