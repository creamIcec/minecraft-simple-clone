import { NearestFilter, Texture, TextureLoader } from "three";
import grass from "./resources/grass.png";
import grassSide from "./resources/grass_side.png";

//创建一个规范Textures对象的type
export type Textures = {
  [key: string]: Texture;
};

//1. 创建一个新的TextureLoader, 这是three.js提供的工具, 用于加载纹理
const textureLoader = new TextureLoader();
//2. 调用load(url)加载材质
const grassTexture = textureLoader.load(grass);
const grassSideTexture = textureLoader.load(grassSide);

grassTexture.magFilter = NearestFilter;

const textures: Textures = {
  grass: grassTexture,
};

export { textures };
