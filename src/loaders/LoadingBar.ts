import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface LoadingBarOptions {
  width?: number;
  height?: number;
  backgroundColor?: number;
fillColor?: number;
  radius?: number;
  textColor?: number;
  textSize?: number;
}

export default class LoadingBar extends Container {
  private background: Graphics;
  private bar: Graphics;
  private text: Text;
  private options: Required<LoadingBarOptions>;
  private currentProgress: number = 0;
  
  constructor(options: LoadingBarOptions = {}) {
    super();
    
    // Set default options
    this.options = {
      width: options.width || 300,
      height: options.height || 30,
      backgroundColor: options.backgroundColor || 0x444444,
      fillColor: options.fillColor || 0x22ccff,
      radius: options.radius || 15,
      textColor: options.textColor || 0xffffff,
      textSize: options.textSize || 16
    };
    
    // Create background bar
    this.background = new Graphics();
    this.drawBackground();
    this.addChild(this.background);
    
    // Create progress bar
    this.bar = new Graphics();
    this.drawBar(0);
    this.addChild(this.bar);
    
    // Create text
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: this.options.textSize,
      fontWeight: 'bold',
      fill: this.options.textColor
    });
    
    this.text = new Text({text: '0%', style});
    this.text.anchor.set(0.5);
    this.text.position.set(this.options.width / 2, this.options.height / 2);
    this.addChild(this.text);
    
    // Center the loading bar in the stage
    this.pivot.set(this.options.width / 2, this.options.height / 2);
  }
  
  /**
   * Draw the background bar
   */
  private drawBackground(): void {
    const { width, height, backgroundColor, radius } = this.options;
    
    this.background.clear();
    this.background.roundRect(0, 0, width, height, radius);
    this.background.fill(backgroundColor);
  }
  
  /**
   * Draw the progress bar
   */
  private drawBar(progress: number): void {
    const { width, height, fillColor, radius } = this.options;
    const barWidth = Math.max(0, Math.min(width * progress, width));
    
    this.bar.clear();
    if (barWidth > 0) {
      this.bar.roundRect(0, 0, barWidth, height, radius);
      this.bar.fill(fillColor);
    }
  }
  
  /**
   * Update the loading progress
   * @param progress Value between 0 and 1
   */
  public updateProgress(progress: number): void {
    // Clamp progress between 0 and 1
    progress = Math.max(0, Math.min(progress, 1));
    this.currentProgress = progress;
    
    // Update the progress bar
    this.drawBar(progress);
    
    // Update the text
    const percentage = Math.floor(progress * 100);
    this.text.text = `${percentage}%`;
  }
  
  /**
   * Get the current progress
   */
  public getProgress(): number {
    return this.currentProgress;
  }
  
  /**
   * Hide the loading bar with optional animation
   */
  public hide(animate: boolean = true): void {
    if (animate) {
      // You can add GSAP animation here if desired
      this.alpha = 0;
    } else {
      this.visible = false;
    }
  }
  
  /**
   * Show the loading bar
   */
  public show(): void {
    this.visible = true;
    this.alpha = 1;
  }
} 