import { Container } from "pixi.js";
import { config } from "./appconfig";
import { BackgroundGraphic, BackgroundSprite } from "./background";
import { Globals } from "./globals";
import { logger } from "./utils/logger";

export abstract class Scene {


    sceneContainer: Container;


    mainContainer: Container;
    // mainBackground: BackgroundGraphic;
    private mainBackground: BackgroundGraphic | BackgroundSprite;


    constructor(isGraphics: boolean) {
        this.sceneContainer = new Container();
        if (isGraphics) {
            this.mainBackground = new BackgroundGraphic(config.logicalWidth, config.logicalHeight, 0x00000);
        }
        else {
            this.mainBackground = new BackgroundSprite(Globals.resources.background, window.innerWidth, window.innerHeight);
            logger.debug("MainBackground created", this.mainBackground);
        }
        this.addChildToFullScene(this.mainBackground);
        this.mainContainer = new Container();

        this.resetMainContainer();

        this.sceneContainer.addChild(this.mainContainer);

        // const mask = new Graphics();
        // mask.beginFill(0xffffff);
        // mask.drawRect(0, 0, config.logicalWidth, config.logicalHeight);
        // mask.endFill();
        // this.mainContainer.addChild(mask);
        // this.mainContainer.mask = mask;

    }

    // changeBackgroundSprite(index: number) {
    //     this.fullBackground.updateBackgroundIndex(index);
    // }

    resetMainContainer() {
        this.mainContainer.x = config.minLeftX;
        this.mainContainer.y = config.minTopY;
        this.mainContainer.scale.set(config.minScaleFactor);
    }

    addToScene(obj: any) {
        this.sceneContainer.addChild(obj);

    }
    resize(): void {
        // Stretch background to the full current screen size
        const w = Globals.app?.screen.width ?? window.innerWidth;
        const h = Globals.app?.screen.height ?? window.innerHeight;
        this.mainBackground.resetBg(w, h);
        this.resetMainContainer();
    }

    initScene(container: Container) {
        container.addChild(this.sceneContainer);
    }
    destroyScene() {
        this.sceneContainer.destroy();
    }

    addChildToFullScene(component: any) {
        logger.debug("addChildToFullScene", component);

        this.sceneContainer.addChild(component);

    }
    addChildToIndexFullScene(component: any, index: number) {
        this.sceneContainer.addChildAt(component, index);
    }

    abstract update(dt: number): void;

    abstract recievedMessage(msgType: string, msgParams: any): void;
}