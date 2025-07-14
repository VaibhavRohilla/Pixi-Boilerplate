import { WebSocketService, GameMessage, SpinMessage, RoundStartMessage, GameStateMessage } from "../WebSocketService";

export interface GameNetworkEvents {
    onConnected: () => void;
    onDisconnected: () => void;
    onError: (error: any) => void;
    onGameState: (message: GameStateMessage) => void;
    onRoundStart: (message: RoundStartMessage) => void;
    onServerSpin: (message: SpinMessage) => void;
}

/**
 * 🌐 Game Network Manager
 * Handles all WebSocket communication and game message routing
 */
export class GameNetworkManager {
    private wsService: WebSocketService;
    private events: GameNetworkEvents;
    private isServerControlled: boolean = false;

    constructor(events: GameNetworkEvents) {
        this.events = events;
        this.wsService = WebSocketService.getInstance();
        
        this.setupWebSocket();
        console.log("🌐 Game network manager initialized");
    }

    /**
     * 🔧 Setup WebSocket connection and message handlers
     */
    private setupWebSocket(): void {
        // Setup connection event handlers
        this.wsService.onConnect(() => {
            console.log('🟢 Connected to game server! Now receiving server-controlled spins.');
            this.isServerControlled = true;
            this.events.onConnected();
        });

        this.wsService.onDisconnect(() => {
            console.log('🔴 Disconnected from game server. Switching to manual mode.');
            this.isServerControlled = false;
            this.events.onDisconnected();
        });

        this.wsService.onError((error) => {
            console.error('❌ WebSocket connection error:', error);
            this.events.onError(error);
        });

        // Setup game message handlers
        this.wsService.onMessage((message: GameMessage) => {
            this.handleGameMessage(message);
        });

        console.log("🔧 WebSocket handlers configured");
    }

    /**
     * 📡 Connect to the game server
     */
    public async connectToServer(): Promise<void> {
        try {
            console.log("📡 Attempting to connect to game server...");
            await this.wsService.connect();
        } catch (error) {
            console.error('❌ Failed to connect to game server:', error);
            console.log('🎮 Continuing in manual mode. Manual controls are still available.');
            this.events.onError(error);
        }
    }

    /**
     * 📨 Handle incoming game messages from server
     */
    private handleGameMessage(message: GameMessage): void {
        console.log('📨 Received game message:', message.action);
        
        switch (message.action) {
            case 'gameState':
                this.handleGameState(message as GameStateMessage);
                break;
            case 'roundStart':
                this.handleRoundStart(message as RoundStartMessage);
                break;
            case 'spin':
                this.handleServerSpin(message as SpinMessage);
                break;
            default:
                console.warn('🤷‍♂️ Unknown message type:', message);
        }
    }

    /**
     * 🎮 Handle game state message from server (for reconnection sync)
     */
    private handleGameState(message: GameStateMessage): void {
        console.log(`🎮 Server game state received:`, message);
        this.events.onGameState(message);
    }

    /**
     * 🕒 Handle round start message from server
     */
    private handleRoundStart(message: RoundStartMessage): void {
        console.log(`🕒 Server round started! ${message.timeLeft}ms remaining`);
        this.events.onRoundStart(message);
    }

    /**
     * 🎰 Handle server-controlled spin
     */
    private handleServerSpin(message: SpinMessage): void {
        console.log(`🎰 Server spin received! Target: ${message.index}`);
        
        // Validate spin index
        if (message.index < 0 || message.index >= 37) { // Assuming 37 pockets
            console.error(`❌ Invalid spin index from server: ${message.index}`);
            return;
        }

        this.events.onServerSpin(message);
    }

    /**
     * 📤 Send message to server (if needed for future features)
     */
    public sendMessage(message: any): void {
        if (this.wsService && this.isServerControlled) {
            // Future implementation for sending messages to server
            console.log('📤 Sending message to server:', message);
        }
    }

    /**
     * 🔍 Public state getters
     */
    public getIsServerControlled(): boolean {
        return this.isServerControlled;
    }

    public isConnected(): boolean {
        return this.isServerControlled;
    }

    /**
     * 🔌 Disconnect from server
     */
    public disconnect(): void {
        if (this.wsService) {
            this.wsService.destroy();
            this.isServerControlled = false;
            console.log("🔌 Disconnected from game server");
        }
    }

    /**
     * 🗑️ Cleanup method
     */
    public destroy(): void {
        this.disconnect();
        console.log("🌐 Game network manager destroyed");
    }
} 