import { Container } from "pixi.js";
import { ROULETTE_CONFIG, GAME_CONSTANTS, UI_CONFIG } from "../config/GameConfig";

export interface InputControllerEvents {
    onSpin: (targetNumber: number) => void;
    onRandomSpin: () => void;
    onCountdownStart: (seconds: number) => void;
    onCountdownStop: () => void;
}

/**
 * 🎮 Input Controller
 * Handles all keyboard and mouse input for the game
 */
export class InputController {
    private container: Container;
    private events: InputControllerEvents;
    private isServerControlled: boolean = false;
    private isSpinning: boolean = false;
    private isCountdownActive: boolean = false;

    constructor(container: Container, events: InputControllerEvents) {
        this.container = container;
        this.events = events;
        
        this.setupControls();
        console.log("🎮 Input controller initialized");
    }

    /**
     * 🔧 Setup interaction controls
     */
    private setupControls(): void {
        this.setupMouseControls();
        this.setupKeyboardControls();
    }

    /**
     * 🖱️ Setup mouse/touch controls
     */
    private setupMouseControls(): void {
        // Click to spin
        this.container.eventMode = 'static';
        this.container.on('pointerdown', () => {
            if (this.isServerControlled) {
                console.log("🌐 Server mode: Click ignored - server controls spins");
                return;
            }
            
            if (!this.isSpinning && !this.isCountdownActive) {
                this.events.onRandomSpin();
            } else if (this.isCountdownActive) {
                console.log("⏳ Please wait for countdown to finish before spinning again!");
            } else if (this.isSpinning) {
                console.log("🎰 Spin already in progress!");
            }
        });

        console.log("🖱️ Mouse controls configured");
    }

    /**
     * ⌨️ Setup keyboard controls
     */
    private setupKeyboardControls(): void {
        document.addEventListener('keydown', (event) => {
            this.handleKeyPress(event);
        });

        console.log("⌨️ Keyboard controls configured");
    }

    /**
     * 🔑 Handle individual key press
     */
    private handleKeyPress(event: KeyboardEvent): void {
        if (this.isSpinning) {
            console.log("🎰 Spin in progress - key ignored");
            return;
        }

        const key = event.key.toLowerCase();
        event.preventDefault();

        // Check if server is controlling the game for spin commands
        if (this.isServerControlled && this.isSpinCommand(key)) {
            console.log("🌐 Server mode: Spin command ignored - server controls spins");
            return;
        }

        // Check if countdown is active for spin commands
        if (this.isCountdownActive && this.isSpinCommand(key)) {
            console.log("⏳ Please wait for countdown to finish before spinning again!");
            return;
        }

        // Handle different key types
        this.processKeyCommand(key);
    }

    /**
     * 🔍 Check if key is a spin command
     */
    private isSpinCommand(key: string): boolean {
        return (
            GAME_CONSTANTS.SPIN_COMMANDS.RANDOM.includes(key as ' ' | 'r') ||
            GAME_CONSTANTS.SPIN_COMMANDS.NUMBERS.includes(key as '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9') ||
            GAME_CONSTANTS.SPIN_COMMANDS.SPECIAL.includes(key as 'q' | 'w' | 'e')
        );
    }

    /**
     * ⚡ Process specific key command
     */
    private processKeyCommand(key: string): void {
        // Random spin commands
        if (GAME_CONSTANTS.SPIN_COMMANDS.RANDOM.includes(key as ' ' | 'r')) {
            this.events.onRandomSpin();
            console.log(`🎰 Random spin triggered by key: ${key}`);
            return;
        }

        // Number commands (0-9)
        if (GAME_CONSTANTS.SPIN_COMMANDS.NUMBERS.includes(key as '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9')) {
            const targetNumber = parseInt(key);
            if (targetNumber < ROULETTE_CONFIG.pocketCount) {
                this.events.onSpin(targetNumber);
                console.log(`🎯 Spin to number ${targetNumber} triggered`);
            }
            return;
        }

        // Special number commands
        if (key === 'q') {
            this.events.onSpin(GAME_CONSTANTS.TARGET_NUMBERS.RED);
            console.log(`🔴 Spin to red (${GAME_CONSTANTS.TARGET_NUMBERS.RED}) triggered`);
            return;
        }

        if (key === 'w') {
            this.events.onSpin(GAME_CONSTANTS.TARGET_NUMBERS.BLACK);
            console.log(`⚫ Spin to black (${GAME_CONSTANTS.TARGET_NUMBERS.BLACK}) triggered`);
            return;
        }

        if (key === 'e') {
            this.events.onSpin(GAME_CONSTANTS.TARGET_NUMBERS.GREEN);
            console.log(`🟢 Spin to green (${GAME_CONSTANTS.TARGET_NUMBERS.GREEN}) triggered`);
            return;
        }

        // Countdown commands (manual mode only)
        if (!this.isServerControlled) {
            this.processCountdownCommand(key);
        } else if (GAME_CONSTANTS.SPIN_COMMANDS.COUNTDOWN.includes(key as 'c' | 'x' | 't')) {
            console.log("🌐 Server mode: Manual countdown controls are disabled. Server controls timing.");
        }
    }

    /**
     * ⏰ Process countdown-related commands
     */
    private processCountdownCommand(key: string): void {
        if (key === 'c') {
            // Manual countdown from configured seconds
            this.events.onCountdownStart(UI_CONFIG.countdown.autoCountdownDuration);
            console.log(`⏰ Manual countdown started: ${UI_CONFIG.countdown.autoCountdownDuration}s`);
            return;
        }

        if (key === 'x') {
            // Stop countdown
            this.events.onCountdownStop();
            console.log("⏹️ Manual countdown stopped");
            return;
        }

        if (key === 't') {
            // Manual countdown from 30 seconds
            this.events.onCountdownStart(30);
            console.log("⏰ Manual countdown started: 30s");
            return;
        }
    }

    /**
     * 📋 Log available controls to console
     */
    public logControls(): void {
        console.log(`
🎮 ROULETTE INPUT CONTROLS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 SERVER CONNECTION:
  • Automatically connects to localhost:3001
  • 🟢 Connected: Server controls all spins and timing
  • 🔴 Disconnected: Manual controls available
  • 📡 Connection status shown in bottom-left corner
  • 🔄 Auto-reconnection with state synchronization

🎮 ROULETTE CONTROLS (Manual Mode Only):
  • Click anywhere: Random spin
  • SPACEBAR/R: Random spin  
  • 0-9: Spin to specific number
  • Q: Spin to ${GAME_CONSTANTS.TARGET_NUMBERS.RED} (red)
  • W: Spin to ${GAME_CONSTANTS.TARGET_NUMBERS.BLACK} (black)
  • E: Spin to ${GAME_CONSTANTS.TARGET_NUMBERS.GREEN} (green)

🎮 SERVER-CONTROLLED GAME FLOW:
  • Server sends roundStart → Countdown begins
  • Server sends spin commands → Automatic spins
  • All connected clients see the same results
  • Manual controls disabled when server connected

⏰ MANUAL COUNTDOWN CONTROLS (Manual Mode Only):
  • C: Start ${UI_CONFIG.countdown.autoCountdownDuration}-second countdown
  • T: Start 30-second countdown  
  • X: Stop countdown

⚙️ CONFIGURATION:
  • Pockets: ${ROULETTE_CONFIG.pocketCount}
  • Spin Duration: ${ROULETTE_CONFIG.spinDuration}s
  • Wheel Speed: ${ROULETTE_CONFIG.constantWheelSpeed} rotations/sec (CONSTANT)
  • Ball Spins: ${ROULETTE_CONFIG.ballSpins}
  • Ball Radius: ${ROULETTE_CONFIG.ballStartRadius}→${ROULETTE_CONFIG.ballEndRadius}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
    }

    /**
     * 🔧 Update game state for input validation
     */
    public updateGameState(isSpinning: boolean, isCountdownActive: boolean, isServerControlled: boolean): void {
        this.isSpinning = isSpinning;
        this.isCountdownActive = isCountdownActive;
        this.isServerControlled = isServerControlled;
    }

    /**
     * 🗑️ Cleanup method
     */
    public destroy(): void {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyPress);
        
        // Remove container event handlers
        this.container.eventMode = 'auto';
        this.container.removeAllListeners();
        
        console.log("🎮 Input controller destroyed");
    }
} 