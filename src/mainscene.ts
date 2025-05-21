
import { Sprite } from "pixi.js";
import { Globals } from "./globals";
import { Scene } from "./scene";

/**
 * Main game scene that manages the blackjack table and game logic
 */
export class MainScene extends Scene 
{
   

    constructor() {
        super(false);
        const sprite = new Sprite(Globals.resources['Symbols/GB/GB 01']);
        this.mainContainer.addChild(sprite);
        console.log(Globals.soundResources) 
        console.log("MainScene constructor");
    }

    recievedMessage(msgType: string, msgParams: any): void {
        // Log message reception for debugging
      console.log(msgType, msgParams);
    }

  

    public update(dt: number): void {
    //  console.log("update",dt);
    }

    public resize(): void {
        super.resize();
    
    }
}
