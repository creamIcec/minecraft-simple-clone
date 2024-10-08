import { Euler, PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import { World } from "../world/World";
import { HotBar } from "../ui/TextureSelector";
import { BlockName } from "../block/blocks";
import { WORLD_HEIGHT, WORLD_SIZE } from "../constants";

type KeyCodes =
  | "KeyW"
  | "KeyA"
  | "KeyS"
  | "KeyD"
  | "Space"
  | "ShiftLeft"
  | "Digit1"
  | "Digit2"
  | "Digit3"
  | "Digit4"
  | "Digit5"
  | "Digit6";

type AcceptedKeyActions =
  | "moveForward"
  | "moveLeft"
  | "moveBackward"
  | "moveRight"
  | "jump"
  | "sneak"
  | BlockName;

//作为按键映射表的type
export type KeyActionMapType = {
  [key in KeyCodes]: AcceptedKeyActions;
};

export type KeyActions = {
  [key in AcceptedKeyActions]: boolean;
};

const KEY_ACTION_MAP: KeyActionMapType = {
  KeyW: "moveForward", //控制玩家前进
  KeyA: "moveLeft", //控制玩家左移
  KeyS: "moveBackward", //控制玩家后退
  KeyD: "moveRight", //控制玩家右移
  Space: "jump", //控制玩家跳跃(飞行上升)
  ShiftLeft: "sneak", //控制玩家下蹲(飞行下降)

  //方块选择
  Digit1: "dirt",
  Digit2: "log",
  Digit3: "grass",
  Digit4: "glass",
  Digit5: "plank",
  Digit6: "stone",
};

type MouseCodes = 0 | 1 | 2;
type AcceptedMouseActions = "break" | "middleClick" | "put";

//作为按键映射表的type
export type MouseActionMapType = {
  [key in MouseCodes]: AcceptedMouseActions;
};

const MOUSE_ACTION_MAP: MouseActionMapType = {
  0: "break",
  1: "middleClick",
  2: "put",
};

//通过这个函数来处理键位绑定
function getActionByKey(key: KeyCodes) {
  return KEY_ACTION_MAP[key];
}

function getActionByMouse(button: MouseCodes) {
  return MOUSE_ACTION_MAP[button];
}

export class Player {
  private fpvControls: PointerLockControls;
  private keyActions: KeyActions;
  private camera: PerspectiveCamera;
  private raycaster: Raycaster;
  private world: World;
  private placeInterval: number; //放置方块间隔定时器的id
  private breakInterval: number; //破坏方块间隔定时器的id
  private isOnGround: boolean;
  private velocity: Vector3 = new Vector3();
  private position: Vector3;
  private static worldVelocity: Vector3 = new Vector3();
  private entityRadius: number = 0.25;
  private entityHeight: number = 1.5;

  private textureSelector: HotBar;

  private static SPEED = 3;
  private static JUMP_FORCE = 10;

  constructor(camera: PerspectiveCamera, world: World, canvas: HTMLElement) {
    this.fpvControls = new PointerLockControls(camera, canvas); //添加第一人称视角控制
    this.camera = camera;
    this.world = world;
    this.textureSelector = new HotBar();

    this.raycaster = new Raycaster();
    this.placeInterval = -1;
    this.breakInterval = -1;

    this.keyActions = {
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      jump: false,
      sneak: false,
      grass: false,
      glass: false,
      plank: false,
      dirt: false,
      log: false,
      air: false,
      stone: false,
    }; //状态记录表

    this.position = new Vector3(0, 0, 0);
    this.isOnGround = false;

    this.initFpvControl();
    this.initPositionControl();
    this.initBlockControl();

    this.spawn();
  }

  private spawn() {
    this.camera.position.set(WORLD_SIZE / 2, WORLD_HEIGHT - 1, WORLD_SIZE / 2);
    this.camera.rotation.set(0, 0, 0);

    this.position = this.camera.position;
  }

  private resetGame() {
    this.spawn();
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.code === "KeyR") {
      this.resetGame();
    }

    if (e.code === "Escape") {
      this.fpvControls.unlock();
    }
    //...通过某个函数获取到这个按键对应的动作, 这个函数将帮助我们来找到动作是什么
    const action = getActionByKey(e.code as KeyCodes);

    if (action) {
      //如果玩家触发了某个动作
      this.keyActions[action] = true;

      this.updateBlockSelection();
    }
    console.log(action);
  } //用于处理玩家按下某个键的函数

  private handleKeyup(e: KeyboardEvent) {
    const action = getActionByKey(e.code as KeyCodes);
    if (action) {
      //如果玩家结束了某个动作
      this.keyActions[action] = false;
    }
  } //用于处理玩家抬起某个键的函数

  private updateBlockSelection() {
    const { dirt, grass, glass, log, plank, stone } = this.keyActions;
    const blocks = { dirt, grass, glass, log, plank, stone };
    const selectedTextures = Object.entries(blocks).find(([_, v]) => v);
    if (selectedTextures) {
      this.textureSelector.setActivatedTexture(
        selectedTextures[0] as BlockName
      );
    }
  }

  //发出破坏方块的信号
  private breakBlockState() {
    //1. 获取到现在世界上注册的所有Block(不是BlockState)
    const meshes = this.world.getAllBlockMeshes();
    //2. 使用raycaster(光线投掷器)进行计算目前准心指向哪个方块
    //raycaster作为一个工具，在每次使用之前需要更新它, 就是移动到当前玩家的位置和朝向
    this.raycaster.setFromCamera(new Vector2(0, 0), this.camera);
    const targetBlocks = this.raycaster.intersectObjects(meshes);
    //3. 向world发出破坏那个方块的信号
    if (targetBlocks && targetBlocks[0]) {
      //调用world提供的破坏方块的方法
      this.world.removeBlockState(targetBlocks[0]);
    }
  }

  //发出放置方块的信号
  private putBlockState() {
    //1. 获取到现在世界上注册的所有Block(不是BlockState)
    const meshes = this.world.getAllBlockMeshes();
    //2. 使用raycaster(光线投掷器)进行计算目前准心指向哪个方块
    //raycaster作为一个工具，在每次使用之前需要更新它, 就是移动到当前玩家的位置和朝向
    this.raycaster.setFromCamera(new Vector2(0, 0), this.camera);
    const targetBlocks = this.raycaster.intersectObjects(meshes);
    //3. 向world发出破坏那个方块的信号
    if (targetBlocks && targetBlocks[0]) {
      //调用world提供的放置方块的方法
      this.world.placeBlockState(
        targetBlocks[0],
        this.textureSelector.getActivatedTexture()
      );
    }
  }

  private handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const action = getActionByMouse(e.button as MouseCodes);
    console.log(action);
    switch (action) {
      case "break":
        this.breakBlockState();
        this.breakInterval = setInterval(() => {
          this.breakBlockState();
        }, 200);
        break;
      case "put":
        this.putBlockState();
        this.placeInterval = setInterval(() => {
          this.putBlockState();
        }, 200);
        break;
      case "middleClick":
      default:
        break;
    }
  }

  private handleMouseUp(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const action = getActionByMouse(e.button as MouseCodes);
    console.log(action);
    switch (action) {
      case "break":
        clearInterval(this.breakInterval);
        break;
      case "put":
        clearInterval(this.placeInterval);
        break;
      case "middleClick":
      default:
        break;
    }
  }

  //click: 鼠标单击
  //keydown: 按下按键
  //keyup: 抬起按键
  private initFpvControl() {
    document.addEventListener("click", () => {
      if (!this.fpvControls.isLocked) {
        this.fpvControls.lock();
      }
    });
  }

  private initPositionControl() {
    //处理键盘事件
    document.addEventListener("keydown", (e) => {
      this.handleKeydown(e);
    });

    document.addEventListener("keyup", (e) => {
      this.handleKeyup(e);
    });
  }

  private initBlockControl() {
    //处理鼠标事件
    document.addEventListener("mousedown", (e) => {
      this.handleMouseDown(e);
    });

    document.addEventListener("mouseup", (e) => {
      this.handleMouseUp(e);
    });
  }

  //调用函数时进行玩家的更新
  public update(deltaTick: number) {
    const { moveForward, moveBackward, moveLeft, moveRight, jump } =
      this.keyActions;

    //整个控制逻辑大致如下:
    //1. 获取到当前的控制状态
    //2. 创建相应的速度分量
    //3. 根据状态和速度参数来设置分量的参数
    //4. 合并分量为总速度
    //5. 将这个速度发送给对应的threejs提供的控制相机的方法进行相机的移动
    //表示玩家前进后退方向的速度分量
    const towardVector = new Vector3(
      0,
      0,
      moveBackward ? 1 : 0 - (moveForward ? 1 : 0)
    );
    //表示玩家左右移动方向上的速度分量
    const sideVector = new Vector3(
      moveLeft ? 1 : 0 - (moveRight ? 1 : 0),
      0,
      0
    );

    //表示水平方向上的速度总量
    const horizontalVector = new Vector3();

    horizontalVector
      .subVectors(towardVector, sideVector) //向量组合
      .normalize() //标准化(大小设置为1, 方向不变)
      .multiplyScalar(Player.SPEED); //乘以我们定义的一个速度大小

    //表示竖直方向上的速度总量
    const verticalVector = new Vector3();

    if (jump && this.isOnGround) {
      verticalVector.y += Player.JUMP_FORCE;
    }

    const velocityAdjustment = horizontalVector.add(verticalVector);

    this.velocity.x = velocityAdjustment.x * deltaTick;
    this.velocity.y += verticalVector.y;
    this.velocity.z = velocityAdjustment.z * deltaTick;

    //将相机的位置设置为位置变量的值, 相当于相机跟随玩家的视角
    this.position.y += this.velocity.y * deltaTick;
    this.fpvControls.moveForward(-this.velocity.z);
    this.fpvControls.moveRight(this.velocity.x);
    this.camera.position.setY(this.position.y);
  }

  public setVelocity(velocity: Vector3) {
    this.velocity = velocity;
  }

  public setIsOnGround(onGround: boolean) {
    this.isOnGround = onGround;
  }

  public getVelocity() {
    return this.velocity;
  }

  public getPosition() {
    return this.position;
  }

  public setPosition(position: Vector3) {
    this.position = position;
  }

  public getRadius() {
    return this.entityRadius;
  }

  public getHeight() {
    return this.entityHeight;
  }

  public getWorldVelocity() {
    Player.worldVelocity.copy(this.velocity);
    Player.worldVelocity.applyEuler(new Euler(0, this.camera.rotation.y, 0));
    return Player.worldVelocity;
  }

  public applyWorldDeltaVelocity(deltaVelocity: Vector3) {
    deltaVelocity.applyEuler(new Euler(0, -this.camera.rotation.y, 0));
    this.velocity.add(deltaVelocity);
  }
}
