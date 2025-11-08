
import { SceneManager } from './scenemanager';

export class MyEmitter //extends PIXI.utils.EventEmitter
{
    
    Call(msgType: string, msgParams = {}) {
        if (msgType != "timer" && msgType != "turnTimer")
            SceneManager.instance!.recievedMessage(msgType, msgParams);
    }

}