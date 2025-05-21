import { Assets } from 'pixi.js';
import { Howl } from 'howler';

export interface AssetManifest {
  bundles: Array<{
    name: string;
    assets: Array<{
      alias: string[];
      src: string[];
      data?: {
        tags?: Record<string, unknown>;
      };
    }>;
  }>;
}

export interface LoadingProgress {
  progress: number;
  loaded: number;
  total: number;
}

interface DetailedAssetInfo {
  name: string;
  srcPath: string;
  isSound: boolean;
}

export default class LoadingManager {
  private manifest: AssetManifest | null = null;
  private detailedAssetInfo: DetailedAssetInfo[] = [];
  private assetsBasePath: string = '';
  private onProgressCallback: ((progress: LoadingProgress) => void) | null = null;
  
  constructor() {}
  
  public onProgress(callback: (progress: LoadingProgress) => void): this {
    this.onProgressCallback = callback;
    return this;
  }
  
  public async loadManifest(manifestPath: string = './assets/manifest.json'): Promise<AssetManifest> {
    try {
      // Ensure we're using the correct path
      const manifestUrl = new URL(manifestPath, window.location.href).pathname;
      console.log(`Loading manifest from: ${manifestUrl}`);
      
      const response = await fetch(manifestUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
      }
      
      const text = await response.text();
      try {
        this.manifest = JSON.parse(text) as AssetManifest;
      } catch (error: any) {
        console.error('Failed to parse manifest JSON. Content received:', text.substring(0, 200));
        throw new Error(`Invalid JSON in manifest: ${error.message}`);
      }
      
      console.log('Manifest loaded successfully:', this.manifest);
      return this.manifest;
    } catch (error) {
      console.error('Failed to load asset manifest:', error);
      throw error;
    }
  }
  
  public async init(basePath: string = ''): Promise<void> {
    if (!this.manifest) {
      throw new Error('Manifest must be loaded before initializing assets');
    }
    
    this.assetsBasePath = basePath;
    console.log(`Initializing Assets with basePath: ${this.assetsBasePath}`);
    
    try {
      await Assets.init({ 
        manifest: this.manifest,
        basePath: this.assetsBasePath
      });
      
      this.detailedAssetInfo = [];
      if (this.manifest.bundles.length > 0 && this.manifest.bundles[0].assets) {
        const bundle = this.manifest.bundles[0];
        
        this.detailedAssetInfo = bundle.assets.map(assetEntry => {
          const name = assetEntry.alias[assetEntry.alias.length - 1]; 
          const srcPath = assetEntry.src[0];
          
          const isSound = /\.(mp3|wav|ogg|m4a)$/i.test(srcPath);
          
          return { name, srcPath, isSound };
        });
      } else {
        console.warn('No bundles or assets found in manifest to prepare detailed info.');
      }
      
      console.log('Prepared detailed asset info:', this.detailedAssetInfo);
    } catch (error) {
      console.error('Error initializing assets or preparing detailed info:', error);
      throw error;
    }
  }
  
  public async loadAll(): Promise<Record<string, any>> {
    if (this.detailedAssetInfo.length === 0) {
      console.warn('No assets to load. Make sure to call init() first and manifest has assets.');
      return {};
    }
    
    const total = this.detailedAssetInfo.length;
    let loaded = 0;
    
    console.log(`Starting to load ${total} assets...`);
    
    const loadedAssetsMap: Record<string, any> = {};
    
    try {
      for (const assetInfo of this.detailedAssetInfo) {
        const assetName = assetInfo.name;
        
        if (assetInfo.isSound) {
          const soundUrl = this.assetsBasePath.endsWith('/') ? 
                           this.assetsBasePath + assetInfo.srcPath : 
                           this.assetsBasePath + '/' + assetInfo.srcPath;

          console.log(`Loading sound with Howler: ${assetName} from ${soundUrl}`);
          const howl = await new Promise<Howl>((resolve, reject) => {
            const sound = new Howl({
              src: [soundUrl],
              preload: true,
              onload: () => {
                console.log(`Howler loaded: ${assetName} (${soundUrl})`);
                resolve(sound);
              },
              onloaderror: ( err) => {
                console.error(`Howler onloaderror for ${assetName} (${soundUrl}):`, err);
                reject(new Error(`Howler onloaderror: ${err} for ${soundUrl}`));
              },
              onplayerror: ( err) => {
                console.error(`Howler onplayerror for ${assetName} (${soundUrl}):`, err);
              }
            });
          });
          loadedAssetsMap[assetName] = howl;
        } else {
          console.log(`Loading asset with PIXI.Assets: ${assetName}`);
          const pixiAsset = await Assets.load(assetName);
          loadedAssetsMap[assetName] = pixiAsset;
        }
        
        loaded++;
        console.log(`Loaded asset ${loaded}/${total}: ${assetName} (${assetInfo.isSound ? 'Sound' : 'PixiAsset'})`);
        
        if (this.onProgressCallback) {
          const progress = loaded / total;
          this.onProgressCallback({ progress, loaded, total });
        }
      }
      
      console.log('Loaded all assets:', loadedAssetsMap);
      return loadedAssetsMap;
    } catch (error) {
      console.error('Error loading assets during loadAll:', error);
      return loadedAssetsMap;
    }
  }
  
  public getAssetNames(): string[] {
    return this.detailedAssetInfo.map(info => info.name);
  }
} 