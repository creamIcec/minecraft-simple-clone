import { PerspectiveCamera, Vector3 } from "three";
import { PointerLockControls } from "three/examples/jsm/Addons.js";

type KeyCodes = "KeyW" | "KeyA" | "KeyS" | "KeyD" | "Space" | "ShiftLeft";
type AcceptedKeyActions =
  | "moveForward"
  | "moveLeft"
  | "moveBackward"
  | "moveRight"
  | "jump"
  | "sneak";

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
};

//通过这个函数来处理键位绑定
function getActionByKey(key: KeyCodes) {
  return KEY_ACTION_MAP[key];
}

export class Player {
  private fpvControls: PointerLockControls;
  private keyActions: KeyActions;
  private camera: PerspectiveCamera;

  private static SPEED = 0.05;
  private static JUMP_FORCE = 0.05;

  constructor(camera: PerspectiveCamera, canvas: HTMLElement) {
    this.fpvControls = new PointerLockControls(camera, canvas); //添加第一人称视角控制
    this.camera = camera;

    this.keyActions = {
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      jump: false,
      sneak: false,
    }; //状态记录表

    this.initControls();
  }

  private handleKeydown(e: KeyboardEvent) {
    //...通过某个函数获取到这个按键对应的动作, 这个函数将帮助我们来找到动作是什么
    const action = getActionByKey(e.code as KeyCodes);
    if (action) {
      //如果玩家触发了某个动作
      this.keyActions[action] = true;
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

  private initControls() {
    //click: 鼠标单击
    //keydown: 按下按键
    //keyup: 抬起按键
    document.addEventListener("click", () => {
      if (!this.fpvControls.isLocked) {
        this.fpvControls.lock();
      }
    });

    document.addEventListener("keydown", (e) => {
      this.handleKeydown(e);
    });

    document.addEventListener("keyup", (e) => {
      this.handleKeyup(e);
    });
  }

  //调用函数时进行玩家的更新
  public update() {
    const { moveForward, moveBackward, moveLeft, moveRight, jump, sneak } =
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

    if (jump) {
      verticalVector.y += Player.JUMP_FORCE;
    }

    if (sneak) {
      verticalVector.y -= Player.JUMP_FORCE;
    }

    const velocity = horizontalVector.add(verticalVector);

    this.fpvControls.moveForward(-velocity.z);
    this.fpvControls.moveRight(velocity.x);
    this.camera.position.y += verticalVector.y;
  }
}
