import {
  MeshLambertMaterial,
  NearestFilter,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from "three";
import grass from "./resources/grass.png";
import dirt from "./resources/dirt.png";
import plank from "./resources/plank.png";
import log from "./resources/log.jpg";
import stone from "./resources/stone.png";
import glass from "./resources/glass.png";
import grassSide from "./resources/grass_side.png";
import { BlockName } from "../world/World";

//创建一个规范Textures对象的type
export type Textures = {
  [key in string]: Texture; //只能是grass或者dirt
};

export type Images = {
  [key in string]: string;
};

//1. 创建一个新的TextureLoader, 这是three.js提供的工具, 用于加载纹理
const textureLoader = new TextureLoader();
//2. 调用loadTexture(url)加载材质
function loadTexture(url: string) {
  const texture = textureLoader.load(url);
  if (texture) {
    texture.magFilter = NearestFilter;
    texture.colorSpace = SRGBColorSpace;
  }
  return texture;
}

const grassTexture = loadTexture(grass);
const grassSideTexture = loadTexture(grassSide);
const dirtTexture = loadTexture(dirt);
const plankTexture = loadTexture(plank);
const logTexture = loadTexture(log);
const stoneTexture = loadTexture(stone);
const glassTexture = loadTexture(glass);

const textures: Textures = {
  grass: grassTexture,
  grassSide: grassSideTexture,
  dirt: dirtTexture,
  plank: plankTexture,
  log: logTexture,
  stone: stoneTexture,
  glass: glassTexture,
};

const selectableImages: Images = {
  dirt,
  log,
  grass,
  glass,
  plank,
  stone,
};

//通过名字获得方块的材质, 进行一些内部的操作, 在返回之前能够根据实际的方块进行组装
export function getMaterialByName(name: BlockName) {
  if (name === "grass") {
    return [
      new MeshLambertMaterial({ map: textures.grassSide }), //右面
      new MeshLambertMaterial({ map: textures.grassSide }), //左面
      new MeshLambertMaterial({ map: textures.grass }), //顶部
      new MeshLambertMaterial({ map: textures.dirt }), //底部
      new MeshLambertMaterial({ map: textures.grassSide }), //前面
      new MeshLambertMaterial({ map: textures.grassSide }), //后面
    ];
  }

  //不是草方块
  return new MeshLambertMaterial({
    map: textures[name],
    transparent: name === "glass",
    opacity: name === "glass" ? 0.6 : 1,
  });
}

export { selectableImages };
