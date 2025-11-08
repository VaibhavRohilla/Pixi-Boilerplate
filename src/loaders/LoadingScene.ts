import { Container, Text, TextStyle } from 'pixi.js';
import LoadingManager, { LoadingProgress } from './LoadingManager';
import LoadingBar from '../ui/LoadingBar';
import { Tween, Group } from 'tweedle.js';
import { logger } from '../utils/logger';

export interface LoadingSceneOptions {
  manifestPath?: string;
  basePath?: string;
  loadingBarOptions?: {
    width?: number;
    height?: number;
    backgroundColor?: number;
    fillColor?: number;
    textColor?: number;
  };
  onComplete?: (assets: Record<string, any>) => void;
}

export default class LoadingScene extends Container {
  private loadingManager: LoadingManager;
  private loadingBar: LoadingBar;
  private statusText: Text;
  private assets: Record<string, any> = {};
  private options: LoadingSceneOptions;
  private isLoading: boolean = false;
  
  constructor(options: LoadingSceneOptions = {}) {
    super();
    
    this.options = options;
    
    logger.info('LoadingScene: Creating loading scene');
    
    // Create loading manager
    this.loadingManager = new LoadingManager();
    this.loadingManager.onProgress(this.handleProgress.bind(this));
    
    // Create loading bar
    this.loadingBar = new LoadingBar(options.loadingBarOptions);
    this.addChild(this.loadingBar);
    
    // Create status text
    const textStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 16,
      fill: 0xFFFFFF,
    });
    
    this.statusText = new Text({ text: 'Initializing...', style: textStyle, resolution: window.devicePixelRatio || 1 });
    this.statusText.anchor.set(0.5, 0);
    this.addChild(this.statusText);
    
    // Center the loading bar
    this.positionLoadingBar();
    
    logger.info('LoadingScene: Created successfully');
  }
  
  /**
   * Position the loading bar in the center of the screen
   */
  private positionLoadingBar(): void {
    // Note: This will need stage dimensions to center properly
    // We'll update this in the start method once we have access to the stage
    this.loadingBar.position.set(0, 0);
    this.statusText.position.set(0, 40);
  }
  
  /**
   * Handle progress updates from the loading manager
   */
  private handleProgress(progress: LoadingProgress): void {
    this.loadingBar.updateProgress(progress.progress);
    this.statusText.text = `Loading assets (${progress.loaded}/${progress.total})...`;
  }
  
  /**
   * Start the loading process
   */
  public async start(width: number, height: number): Promise<Record<string, any>> {
    if (this.isLoading) {
      console.log('LoadingScene: Already loading, skipping start call');
      return this.assets;
    }
    
    logger.info(`LoadingScene: Starting loading process, width: ${width}, height: ${height}`);
    this.isLoading = true;
    
    // Center the loading bar now that we have dimensions
    this.loadingBar.position.set(width / 2, height / 2);
    this.statusText.position.set(width / 2, height / 2 + 30);
    
    try {
      this.statusText.text = 'Loading manifest...';
      logger.info('LoadingScene: Loading manifest');
      
      // Load the manifest
      await this.loadingManager.loadManifest(this.options.manifestPath);
      
      this.statusText.text = 'Initializing assets...';
      logger.info('LoadingScene: Initializing assets');
      
      // Initialize the asset loader
      await this.loadingManager.init(this.options.basePath);
      
      this.statusText.text = 'Loading assets...';
      logger.info('LoadingScene: Loading all assets');
      
      // Load all assets
      this.assets = await this.loadingManager.loadAll();
      
      logger.info('LoadingScene: Assets loaded successfully');
      
      // Show complete status
      this.loadingBar.updateProgress(1);
      this.statusText.text = 'Loading complete!';
      
      // Add a delay to show 100% for a moment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      logger.info('LoadingScene: Animating out');
      
      // Hide loading bar with animation
      return new Promise((resolve) => {
        new Tween(this)
          .to({ alpha: 0 }, 500)
          .onComplete(() => {
            logger.info('LoadingScene: Animation complete, calling onComplete callback');
            if (this.options.onComplete) {
              this.options.onComplete(this.assets);
            }
            resolve(this.assets);
          })
          .start();
        Group.shared.update();
      });
    } catch (error: any) {
      logger.error(`LoadingScene: Error loading assets: ${error?.message || String(error)}`);
      this.statusText.text = `Error: ${error.message || 'Failed to load assets'}`;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Get the loaded assets
   */
  public getAssets(): Record<string, any> {
    return this.assets;
  }

  /**
   * Resize and reposition loading UI
   */
  public resize(width: number, height: number): void {
    this.loadingBar.position.set(width / 2, height / 2);
    this.statusText.position.set(width / 2, height / 2 + 30);
  }
  
  /**
   * Clean up resources when no longer needed
   */
  public destroy(options?: boolean | { children?: boolean; texture?: boolean; baseTexture?: boolean }): void {
    logger.info('LoadingScene: Destroying');
    this.loadingBar.destroy(options);
    super.destroy(options);
  }
} 