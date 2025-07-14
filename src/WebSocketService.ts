import { Logger } from './Logger';

export interface SpinMessage {
  action: 'spin';
  index: number;
}

export interface RoundStartMessage {
  action: 'roundStart';
  timeLeft: number;
}

export interface GameStateMessage {
  action: 'gameState';
  roundActive: boolean;
  timeLeft: number;
  connectedClients: number;
  queuedSpins: number;
}

export interface PongMessage {
  action: 'pong';
  timestamp: number;
}

export type GameMessage = SpinMessage | RoundStartMessage | GameStateMessage | PongMessage;

export interface WebSocketConfig {
  host: string;
  port: number;
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private isDestroyed = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPongTime = 0;
  
  // Event handlers
  private onConnectHandlers: Array<() => void> = [];
  private onDisconnectHandlers: Array<() => void> = [];
  private onMessageHandlers: Array<(message: GameMessage) => void> = [];
  private onErrorHandlers: Array<(error: Event) => void> = [];

  private constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = {
      host: 'localhost',
      port: 3001,
      autoReconnect: true,
      reconnectDelay: 3000,
      maxReconnectAttempts: 5,
      ...config
    };
  }

  public static getInstance(config?: Partial<WebSocketConfig>): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService(config);
    }
    return WebSocketService.instance;
  }

  /**
   * Connect to the WebSocket server
   */
  public async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('WebSocketService has been destroyed');
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      Logger.warn('WebSocket already connected');
      return;
    }

    if (this.isConnecting) {
      Logger.warn('WebSocket connection already in progress');
      return;
    }

    this.isConnecting = true;
    const url = `ws://${this.config.host}:${this.config.port}`;
    
    try {
      Logger.log(`🔌 Connecting to WebSocket: ${url}`);
      this.ws = new WebSocket(url);
      
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        this.ws!.onopen = () => {
          clearTimeout(timeoutId);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.lastPongTime = Date.now();
          
          Logger.log('🟢 WebSocket connected successfully');
          
          // Request current game state after connection
          this.send({ action: 'requestGameState' });
          
          // Start heartbeat
          this.startHeartbeat();
          
          this.onConnectHandlers.forEach(handler => handler());
          resolve();
        };

        this.ws!.onclose = (event) => {
          clearTimeout(timeoutId);
          this.isConnecting = false;
          this.stopHeartbeat();
          Logger.warn(`🔴 WebSocket disconnected: ${event.code} - ${event.reason}`);
          this.onDisconnectHandlers.forEach(handler => handler());
          
          if (this.config.autoReconnect && !this.isDestroyed) {
            this.handleReconnect();
          }
        };

        this.ws!.onerror = (error) => {
          clearTimeout(timeoutId);
          this.isConnecting = false;
          Logger.error(`❌ WebSocket error: ${error}`);
          this.onErrorHandlers.forEach(handler => handler(error));
          reject(error);
        };

        this.ws!.onmessage = (event) => {
          this.handleMessage(event);
        };
      });
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.ws) {
      Logger.log('🔌 Disconnecting WebSocket');
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Send a message to the server
   */
  public send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      Logger.log(`📤 Sent:`, message);
    } else {
      Logger.warn('❌ Cannot send message: WebSocket not connected');
    }
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection state
   */
  public getState(): string {
    if (!this.ws) return 'DISCONNECTED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'CONNECTED';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'DISCONNECTED';
      default: return 'UNKNOWN';
    }
  }

  /**
   * Handle automatic reconnection
   */
  private handleReconnect(): void {
    if (this.isDestroyed || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      Logger.error(`❌ Max reconnection attempts reached (${this.config.maxReconnectAttempts})`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * this.reconnectAttempts;
    
    Logger.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.connect().catch(error => {
          Logger.error(`❌ Reconnection failed: ${error.message}`);
        });
      }
    }, delay);
  }

  /**
   * Register event handlers
   */
  public onConnect(handler: () => void): void {
    this.onConnectHandlers.push(handler);
  }

  public onDisconnect(handler: () => void): void {
    this.onDisconnectHandlers.push(handler);
  }

  public onMessage(handler: (message: GameMessage) => void): void {
    this.onMessageHandlers.push(handler);
  }

  public onError(handler: (error: Event) => void): void {
    this.onErrorHandlers.push(handler);
  }

  /**
   * Remove event handlers
   */
  public removeHandler(type: 'connect' | 'disconnect' | 'message' | 'error', handler: Function): void {
    switch (type) {
      case 'connect':
        this.onConnectHandlers = this.onConnectHandlers.filter(h => h !== handler);
        break;
      case 'disconnect':
        this.onDisconnectHandlers = this.onDisconnectHandlers.filter(h => h !== handler);
        break;
      case 'message':
        this.onMessageHandlers = this.onMessageHandlers.filter(h => h !== handler);
        break;
      case 'error':
        this.onErrorHandlers = this.onErrorHandlers.filter(h => h !== handler);
        break;
    }
  }

  /**
   * Start heartbeat to keep connection alive and detect server issues
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Check if we received a pong recently
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > 60000) { // 60 seconds timeout
          Logger.warn('🏓 No pong received in 60 seconds, connection may be dead');
          this.ws.close(1000, 'Heartbeat timeout');
          return;
        }
        
        // Send ping to server
        this.send({ action: 'ping' });
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Handle incoming messages and update last pong time
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: GameMessage = JSON.parse(event.data);
      
      // Handle pong messages for heartbeat
      if (message.action === 'pong') {
        this.lastPongTime = Date.now();
        return;
      }
      
      Logger.log(`📩 Received: ${message.action}`, message);
      this.onMessageHandlers.forEach(handler => handler(message));
    } catch (error) {
      Logger.error(`❌ Failed to parse message: ${event.data}`);
    }
  }

  /**
   * Destroy the WebSocket service and cleanup
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.stopHeartbeat();
    this.disconnect();
    this.onConnectHandlers = [];
    this.onDisconnectHandlers = [];
    this.onMessageHandlers = [];
    this.onErrorHandlers = [];
    WebSocketService.instance = null as any;
    Logger.log('🗑️ WebSocketService destroyed');
  }
}
