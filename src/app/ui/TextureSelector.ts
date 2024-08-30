import { BlockName } from "../block/blocks";
import { selectableImages } from "../textures/MaterialManager";

export class HotBar {
  private currentBlock: BlockName;
  private images: HTMLImageElement[] = [];
  private displayTimer: number = 0;

  constructor() {
    this.currentBlock = "dirt";
    //实现的功能
    //* 一个物品栏, 玩家可以通过物品栏选择要放置的方块
    //* 选中的方块在物品栏中被高亮(红色的边框来表示)
    //* 为了不遮挡游戏本身, 选择后一定时间后将自动隐藏物品栏
    const container = document.querySelector(".bottom-container");
    if (container) {
      const textureSelectorDiv = document.createElement("div");
      textureSelectorDiv.classList.add(...["hotbar"]);
      container.appendChild(textureSelectorDiv);
      const blockImages: HTMLImageElement[] = [];
      Object.entries(selectableImages).map(([key, src]) => {
        const image = new Image();
        image.src = src;
        image.alt = key;
        blockImages.push(image);
      });
      for (const item of blockImages) {
        textureSelectorDiv.appendChild(item);
      }

      this.images = blockImages;
    }

    this.setActivatedTexture(this.currentBlock);
  }

  public setActivatedTexture(texture: BlockName) {
    const ui = document.querySelector(".hotbar");

    if (ui) {
      ui.classList.remove("invisible");
      for (const item of this.images) {
        if (item.alt === texture) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      }

      clearTimeout(this.displayTimer);

      this.displayTimer = setTimeout(() => {
        ui.classList.add("invisible");
      }, 1500);
    }

    this.currentBlock = texture;
  }

  public getActivatedTexture() {
    return this.currentBlock;
  }
}
