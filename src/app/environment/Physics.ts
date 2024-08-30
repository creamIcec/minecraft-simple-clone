import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Scene,
  SphereGeometry,
  Vector3,
} from "three";
import { BlockPos, Pos, World } from "../world/World";
import { Player } from "../player/Player";

export type Collision = {
  block: BlockPos;
  contactPoint: Pos;
  normal: Vector3;
  overlap: number;
};

const collisionMaterial = new MeshBasicMaterial({
  color: 0xff0000,
  transparent: true,
  opacity: 0.2,
});
const collisionGeometry = new BoxGeometry(1.001, 1.001, 1.001);

const contactMaterial = new MeshBasicMaterial({
  wireframe: true,
  color: 0x00ff00,
});
const contactGeometry = new SphereGeometry(0.05, 6, 6);

export class Physics {
  public constructor(scene: Scene) {
    this.helpers = new Group();
    this.helpers.visible = false;
    scene.add(this.helpers);
  }
  private helpers: Group;
  private minUpdatePeriod: number = 1 / 250;
  private ticker: number = 0;
  private gravity: number = 32;

  public update(deltaTick: number, player: Player, world: World) {
    this.ticker += deltaTick;
    while (this.ticker >= this.minUpdatePeriod) {
      const velocity = player.getVelocity();
      velocity.y -= this.gravity * this.minUpdatePeriod;

      player.setVelocity(velocity);
      player.update(this.minUpdatePeriod);

      this.detectCollisions(player, world);
      this.ticker -= this.minUpdatePeriod;
    }
  }

  private detectCollisions(player: Player, world: World) {
    player.setIsOnGround(false);
    const potentials = this.runCollisionCheckRough(player, world);
    const collisions = this.runCollisionCheckAccurate(potentials, player);

    if (collisions.length > 0) {
      this.resolveCollision(collisions, player);
    }
  }

  //第一步: 粗略检查碰撞
  public runCollisionCheckRough(player: Player, world: World) {
    this.helpers.clear();

    const position = player.getPosition();
    const radius = player.getRadius();
    const height = player.getHeight();
    const extents = {
      x: {
        min: Math.floor(position.x - radius),
        max: Math.ceil(position.x + radius),
      },
      y: {
        min: Math.floor(position.y - height),
        max: Math.ceil(position.y),
      },
      z: {
        min: Math.floor(position.z - radius),
        max: Math.ceil(position.z + radius),
      },
    };

    const result = [];

    for (let x = extents.x.min; x <= extents.x.max; x++) {
      for (let y = extents.y.min; y <= extents.y.max; y++) {
        for (let z = extents.z.min; z <= extents.z.max; z++) {
          const block = world.getBlockStateAt(x, y, z);
          if (block && block.name != "air") {
            result.push({ x, y, z } as BlockPos);
            this.addCollisionHelper({ x, y, z });
          }
        }
      }
    }

    return result;
  }

  addCollisionHelper(block: BlockPos) {
    const blockMesh = new Mesh(collisionGeometry, collisionMaterial);
    blockMesh.position.copy(block);
    this.helpers.add(blockMesh);
  }

  addContactPointerHelper(p: BlockPos) {
    const contactMesh = new Mesh(contactGeometry, contactMaterial);
    contactMesh.position.copy(p);
    this.helpers.add(contactMesh);
  }

  private isPointInsideBoundingCylinder(point: BlockPos, player: Player) {
    const position = player.getPosition();
    const height = player.getHeight();
    const radius = player.getRadius();
    const dx = point.x - position.x;
    const dy = point.y - (position.y - height / 2);
    const dz = point.z - position.z;
    const distance = dx * dx + dz * dz;

    return Math.abs(dy) < height / 2 && distance < radius * radius;
  }

  //第二步: 进一步确定碰撞位置
  public runCollisionCheckAccurate(roughResult: BlockPos[], player: Player) {
    const result: Collision[] = [];

    const position = player.getPosition();
    const height = player.getHeight();
    const radius = player.getRadius();
    for (const block of roughResult) {
      //遍历每一个粗略检测结果
      const contactPoint = {
        x: Math.max(block.x - 0.5, Math.min(position.x, block.x + 0.5)),
        y: Math.max(
          block.y - 0.5,
          Math.min(position.y - player.getHeight() / 2, block.y + 0.5)
        ),
        z: Math.max(block.z - 0.5, Math.min(position.z, block.z + 0.5)),
      } as BlockPos; //获取玩家实体碰撞箱中心向方块作垂线，垂线在方块上的交点(可能在碰撞箱内，也可能不在)

      //获取该交点和玩家碰撞箱中心的距离
      const dx = contactPoint.x - position.x;
      const dy = contactPoint.y - (position.y - height / 2);
      const dz = contactPoint.z - position.z;

      //(关键)通过距离判断交点是否在玩家碰撞箱内
      if (this.isPointInsideBoundingCylinder(contactPoint, player)) {
        //TODO 看懂这个if内的代码
        const overlapY = height / 2 - Math.abs(dy);
        const overlapXZ = radius - Math.sqrt(dx * dx + dz * dz);
        let normal: Vector3, overlap: number;
        if (overlapY < overlapXZ) {
          //说明玩家在地面上(脚下和方块有接触)
          normal = new Vector3(0, -Math.sign(dy), 0);
          overlap = overlapY;
          player.setIsOnGround(true);
        } else {
          normal = new Vector3(-dx, 0, -dz).normalize();
          overlap = overlapXZ;
        }

        result.push({
          block,
          contactPoint,
          normal,
          overlap,
        });

        this.addContactPointerHelper(contactPoint);
      }
    }

    return result;
  }

  private resolveCollision(collisions: Collision[], player: Player) {
    //按照碰撞箱和方块的重合程度排序, 重合度小的优先检测(更远的方块);

    collisions.sort((a, b) => {
      return a.overlap < b.overlap ? -1 : 1;
    });

    for (const collision of collisions) {
      //非核心, 用于防抖。抖动的原因是每次解析碰撞之后玩家的位置将发生微小变化，如果此时用老一套参数继续检测，则会出现误差。为了减小这种误差，我们重新判断哪些点还在碰撞箱内
      if (!this.isPointInsideBoundingCylinder(collision.contactPoint, player))
        continue;

      //复制碰撞法向量，用于决定玩家位置微调方向
      let deltaPosition = collision.normal.clone();
      //法向量乘以重合程度
      deltaPosition.multiplyScalar(collision.overlap);
      //设置玩家调整后的位置
      player.setPosition(player.getPosition().add(deltaPosition));

      const magnitude = player.getWorldVelocity().dot(collision.normal);
      const velocityAdjustment = collision.normal
        .clone()
        .multiplyScalar(magnitude);

      player.applyWorldDeltaVelocity(velocityAdjustment.negate());
    }
  }
}
