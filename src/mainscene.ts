
import { Scene } from "./scene";
import { logger } from "./utils/logger";
import { UIGraphicButton } from "./button";
import { config } from "./appconfig";

/**
 * Main game scene that manages the blackjack table and game logic
 */
export class MainScene extends Scene {

    private startButton?: UIGraphicButton;

    constructor() {
        super(true);

        // Step 1: Register the asset with a unique key
       this.init();

    }

    public async init(): Promise<void> {
        this.startButton = new UIGraphicButton({
            style: {
                width: 240,
                height: 64,
                radius: 14,
                fillNormal: 0x1677ff,
                fillHover: 0x3c8cff,
                fillDown: 0x0f59c5,
                fillDisabled: 0x7aa7f7,
                stroke: 0x0a2a66,
                strokeWidth: 2
            },
            labelText: "Start",
            animations: { hoverScale: 1.06, downScale: 0.95, durationMs: 140 },
            onClick: () => logger.info("Start button clicked"),
        });
        this.startButton.position.set(config.logicalWidth / 2, config.logicalHeight / 2);
        this.mainContainer.addChild(this.startButton);
    }

    recievedMessage(msgType: string, msgParams: any): void {
        // Log message reception for debugging
        logger.debug(msgType, msgParams);
    }



    public update(dt: number): void {
        // logger.debug("MainScene update",dt);
    }

    public resize(): void {
        super.resize();
        if (this.startButton) {
            this.startButton.position.set(config.logicalWidth / 2, config.logicalHeight / 2);
        }
    }
}
