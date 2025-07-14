import { Sprite } from "pixi.js";
import { Globals } from "./globals";
import { Scene } from "./scene";
import { RoulleteBoard } from "./roullete";
import { SpinMessage, RoundStartMessage, GameStateMessage } from "./WebSocketService";

// Import modular components
import { BallPhysics } from "./physics/BallPhysics";
import { GameUI } from "./ui/GameUI";
import { GameNetworkManager } from "./network/GameNetworkManager";
import { InputController } from "./controls/InputController";
import { WheelSynchronizer } from "./sync/WheelSynchronizer";
import { ROULETTE_CONFIG } from "./config/GameConfig";

/**
 * 🎯 Main Scene - Game Orchestrator
 * Coordinates all game systems and manages their interactions
 */
export class MainScene extends Scene {
    // Core game components
    private roulette: RoulleteBoard = new RoulleteBoard();
    private ball!: Sprite;
    
    // Modular systems
    private ballPhysics!: BallPhysics;
    private gameUI!: GameUI;
    private networkManager!: GameNetworkManager;
    private inputController!: InputController;
    private wheelSync!: WheelSynchronizer;
    
    // Game state
    private isSpinning: boolean = false;
    private isServerControlled: boolean = false;

    constructor() {
        super(false);

        this.initializeScene();
        this.initializeSystems();
        this.connectSystems();
        
        console.log("🎯 MainScene orchestrator initialized");
    }

    /**
     * 🎮 Initialize core scene components
     */
    private initializeScene(): void {
        // Add roulette board to scene
        this.mainContainer.addChild(this.roulette);
        
        // Create ball sprite
        this.ball = new Sprite(Globals.resources.ball);
        this.mainContainer.addChild(this.ball);
        
        console.log("🎮 Core scene components initialized");
    }

    /**
     * 🔧 Initialize all modular systems
     */
    private initializeSystems(): void {
        // Initialize ball physics system
        this.ballPhysics = new BallPhysics(this.ball, this.roulette, {
            onSpinComplete: (winningIndex: number) => this.handleSpinComplete(winningIndex),
            onBallLanded: (winningIndex: number) => this.handleBallLanded(winningIndex)
        });

        // Initialize UI system
        this.gameUI = new GameUI(this.mainContainer, {
            onCountdownComplete: () => this.handleCountdownComplete()
        });

        // Initialize network system
        this.networkManager = new GameNetworkManager({
            onConnected: () => this.handleNetworkConnected(),
            onDisconnected: () => this.handleNetworkDisconnected(),
            onError: (error) => this.handleNetworkError(error),
            onGameState: (message) => this.handleGameState(message),
            onRoundStart: (message) => this.handleRoundStart(message),
            onServerSpin: (message) => this.handleServerSpin(message)
        });

        // Initialize input system
        this.inputController = new InputController(this.mainContainer, {
            onSpin: (targetNumber) => this.handleInputSpin(targetNumber),
            onRandomSpin: () => this.handleInputRandomSpin(),
            onCountdownStart: (seconds) => this.handleInputCountdownStart(seconds),
            onCountdownStop: () => this.handleInputCountdownStop()
        });

        // Initialize wheel synchronizer
        this.wheelSync = new WheelSynchronizer(this.roulette);

        console.log("🔧 All modular systems initialized");
    }

    /**
     * 🔗 Connect systems and start operations
     */
    private connectSystems(): void {
        // Start wheel rotation
        this.wheelSync.startConstantRotation();
        
        // Connect to network
        this.networkManager.connectToServer();
        
        // Log controls
        this.inputController.logControls();
        
        console.log("🔗 Systems connected and operational");
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎾 BALL PHYSICS EVENT HANDLERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private handleSpinComplete(winningIndex: number): void {
        this.isSpinning = false;
        this.updateGameState();
        
        // Check actual winner
        const actualWinner = this.roulette.getCurrentWinningNumber();
        
        console.log(`🎉 Spin complete! Target: ${winningIndex}, Actual: ${actualWinner}`);
        
        if (actualWinner === winningIndex) {
            console.log("✅ PERFECT LANDING!");
        } else {
            console.warn(`❌ ALIGNMENT MISMATCH: Expected ${winningIndex}, Got ${actualWinner}`);
            this.roulette.debugWheelState();
        }

        // Start countdown for next round (manual mode only)
        if (!this.isServerControlled) {
            Globals.gsap?.delayedCall(1.5, () => {
                console.log("🎰 Manual mode: Starting countdown for next round...");
                this.gameUI.startCountdown(ROULETTE_CONFIG.autoCountdownDuration, () => {
                    console.log("⏰ Countdown finished! You can spin again!");
                });
            });
        } else {
            console.log("🌐 Server mode: Waiting for server to control next round timing.");
        }
    }

    private handleBallLanded(winningIndex: number): void {
        console.log(`🎾 Ball landed on number ${winningIndex}`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎨 UI EVENT HANDLERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private handleCountdownComplete(): void {
        console.log("⏰ UI countdown completed");
        this.updateGameState();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🌐 NETWORK EVENT HANDLERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private handleNetworkConnected(): void {
        this.isServerControlled = true;
        this.gameUI.updateConnectionStatus('CONNECTED');
        this.updateGameState();
        console.log("🌐 Network connected - server mode activated");
    }

    private handleNetworkDisconnected(): void {
        this.isServerControlled = false;
        this.gameUI.updateConnectionStatus('DISCONNECTED');
        this.updateGameState();
        console.log("🌐 Network disconnected - manual mode activated");
    }

    private handleNetworkError(error: any): void {
        this.gameUI.updateConnectionStatus('ERROR');
        console.error("🌐 Network error:", error);
    }

    private handleGameState(message: GameStateMessage): void {
        console.log(`🎮 Game state received:`, message);
        
        if (message.roundActive && message.timeLeft > 0) {
            // Stop any current spin
            if (this.isSpinning) {
                this.ballPhysics.stopAllAnimations();
                this.isSpinning = false;
                this.updateGameState();
            }

            // Sync countdown with server
            const seconds = Math.ceil(message.timeLeft / 1000);
            this.gameUI.startCountdown(seconds, () => {
                console.log('⏰ Synced countdown finished! Waiting for server spin...');
            });
        } else {
            console.log('💤 Server is in waiting state');
            this.gameUI.stopCountdown();
        }

        this.gameUI.updateConnectionStatus('CONNECTED');
    }

    private handleRoundStart(message: RoundStartMessage): void {
        console.log(`🕒 Round started! ${message.timeLeft}ms remaining`);
        
        // Stop any current spin
        if (this.isSpinning) {
            this.ballPhysics.stopAllAnimations();
            this.isSpinning = false;
            this.updateGameState();
        }

        // Start countdown with server time
        const seconds = Math.ceil(message.timeLeft / 1000);
        this.gameUI.startCountdown(seconds, () => {
            console.log('⏰ Server countdown finished! Waiting for spin...');
        });
    }

    private handleServerSpin(message: SpinMessage): void {
        console.log(`🎰 Server spin received! Target: ${message.index}`);
        
        // Stop countdown and execute spin
        this.gameUI.stopCountdown();
        this.startSpin(message.index);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎮 INPUT EVENT HANDLERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private handleInputSpin(targetNumber: number): void {
        if (this.canSpin()) {
            this.startSpin(targetNumber);
            console.log(`🎮 Input spin to number ${targetNumber}`);
        }
    }

    private handleInputRandomSpin(): void {
        if (this.canSpin()) {
            const randomWinner = Math.floor(Math.random() * ROULETTE_CONFIG.pocketCount);
            this.startSpin(randomWinner);
            console.log(`🎮 Input random spin to number ${randomWinner}`);
        }
    }

    private handleInputCountdownStart(seconds: number): void {
        if (!this.isServerControlled) {
            this.gameUI.startCountdown(seconds, () => {
                console.log("Manual countdown completed!");
            });
            console.log(`🎮 Input countdown started: ${seconds}s`);
        }
    }

    private handleInputCountdownStop(): void {
        if (!this.isServerControlled) {
            this.gameUI.stopCountdown();
            console.log("🎮 Input countdown stopped");
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎯 CORE GAME METHODS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * 🎯 Start roulette spin
     */
    private startSpin(winningIndex: number): void {
        if (!this.canSpin()) {
            console.warn("🎯 Cannot start spin - game not ready");
            return;
        }

        console.log(`🎯 Starting spin to number ${winningIndex}`);
        this.isSpinning = true;
        this.updateGameState();
        
        this.ballPhysics.startSpin(winningIndex);
    }

    /**
     * 🔍 Check if game can accept new spins
     */
    private canSpin(): boolean {
        return !this.isSpinning && !this.gameUI.isCountdownRunning();
    }

    /**
     * 🔄 Update game state across all systems
     */
    private updateGameState(): void {
        this.inputController.updateGameState(
            this.isSpinning, 
            this.gameUI.isCountdownRunning(), 
            this.isServerControlled
        );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📋 PUBLIC API METHODS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    public getIsSpinning(): boolean {
        return this.isSpinning;
    }

    public isReadyToSpin(): boolean {
        return this.canSpin();
    }

    public spin(targetNumber?: number): void {
        if (this.isServerControlled) {
            console.log("🌐 Server mode: Manual spin ignored");
            return;
        }

        if (targetNumber !== undefined && targetNumber >= 0 && targetNumber < ROULETTE_CONFIG.pocketCount) {
            this.handleInputSpin(targetNumber);
        } else {
            this.handleInputRandomSpin();
        }
    }

    public startCountdown(seconds: number, onComplete?: () => void): void {
        if (!this.isServerControlled) {
            this.gameUI.startCountdown(seconds, onComplete);
        }
    }

    public stopCountdown(): void {
        this.gameUI.stopCountdown();
    }

    public isCountdownRunning(): boolean {
        return this.gameUI.isCountdownRunning();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔄 SCENE LIFECYCLE METHODS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    public recievedMessage(msgType: string, msgParams: any): void {
        console.log("📨 Scene message:", msgType, msgParams);
    }

    public update(dt: number): void {
        // Update UI system
        this.gameUI.update(dt);
    }

    public resize(): void {
        super.resize();
        // this.roulette.resize();
    }

    /**
     * 🗑️ Cleanup method - called when scene is destroyed
     */
    public destroyScene(): void {
        console.log('🗑️ Destroying MainScene and cleaning up all systems');
        
        // Destroy all modular systems
        if (this.ballPhysics) this.ballPhysics.destroy();
        if (this.gameUI) this.gameUI.destroy();
        if (this.networkManager) this.networkManager.destroy();
        if (this.inputController) this.inputController.destroy();
        if (this.wheelSync) this.wheelSync.destroy();

        // Call parent cleanup
        super.destroyScene();
        
        console.log('🗑️ MainScene destruction complete');
    }
}
