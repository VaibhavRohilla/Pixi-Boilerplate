import { Container, Sprite } from "pixi.js";
import { Globals } from "./globals";
import { config } from "./appconfig";
import { TextLabel } from "./textlabel";

// ⚙️ ROULETTE WHEEL CONFIGURATION
const WHEEL_CONFIG = {
    // Visual Configuration
    scale: 0.7*config.minScaleFactor,                    // Overall wheel scale
    numberRadius: 210,             // Distance from center to place numbers
    numberScale: 0.8,              // Scale factor for number text
    numberFontSize: 32,            // Font size for numbers
    
    // Colors
    textColor: 0xFFFFFF,           // White text for numbers
    greenColor: 0x00FF00,          // Green for zero
    
    // Layout
    centerOffsetX: config.logicalWidth / 2,
    centerOffsetY: config.logicalHeight / 2
} as const;

/**
 * Production-ready roulette wheel board with precise mathematical calculations
 */
export class RoulleteBoard extends Container {
    // Wheel visual components
    private roullete!: Sprite;
    private redBlackStrips!: Sprite;
    private divider!: Sprite;
    private innerOutline!: Sprite;
    private outerOutline!: Sprite;
    private rouletteTop!: Sprite;
    private numbers: TextLabel[] = [];
    
    // European roulette wheel layout (37 numbers: 0-36)
    // Numbers arranged in clockwise order starting from 0 at the top
    private readonly rouletteNumbers = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];
    
    // Define red and black numbers for European roulette
    private readonly redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    private readonly blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

    constructor() {
        super();
        this.initializeWheel();
        this.setupTransform();
    }
    // resize(): void {
    //     if(window.innerWidth> window.innerHeight){
    //         this.scale.set(2*config.scaleFactor);
    //     }else{
    //         this.scale.set(3*config.scaleFactor);
    //     }
    // }
    
    /**
     * Initialize all wheel visual components
     */
    private initializeWheel(): void {
        // Base wheel sprite
        this.roullete = new Sprite(Globals.resources.Roulette);
        this.roullete.position.set(WHEEL_CONFIG.centerOffsetX, WHEEL_CONFIG.centerOffsetY);
        this.roullete.scale.set(WHEEL_CONFIG.scale);
        this.roullete.anchor.set(0.5);
        this.addChild(this.roullete);
        
        // Red/black color strips
        this.redBlackStrips = new Sprite(Globals.resources.RedBlackstrips);
        this.redBlackStrips.position.set(WHEEL_CONFIG.centerOffsetX, WHEEL_CONFIG.centerOffsetY);
        this.redBlackStrips.scale.set(WHEEL_CONFIG.scale);
        this.redBlackStrips.anchor.set(0.5);
        this.addChild(this.redBlackStrips);

        // Divider lines between numbers
        this.divider = new Sprite(Globals.resources.divider);
        this.divider.position.set(WHEEL_CONFIG.centerOffsetX, WHEEL_CONFIG.centerOffsetY);
        this.divider.scale.set(WHEEL_CONFIG.scale);
        this.divider.anchor.set(0.5);
        this.addChild(this.divider);
        
        // Inner outline
        this.innerOutline = new Sprite(Globals.resources.inneroutline);
        this.innerOutline.position.set(WHEEL_CONFIG.centerOffsetX, WHEEL_CONFIG.centerOffsetY);
        this.innerOutline.scale.set(WHEEL_CONFIG.scale);
        this.innerOutline.anchor.set(0.5);
        this.addChild(this.innerOutline);
        
        // Outer outline (slightly larger)
            this.outerOutline = new Sprite(Globals.resources.inneroutline);
            this.outerOutline.position.set(WHEEL_CONFIG.centerOffsetX, WHEEL_CONFIG.centerOffsetY);
            this.outerOutline.scale.set(WHEEL_CONFIG.scale * 1.3); // 30% larger
            this.outerOutline.anchor.set(0.5);
            this.addChild(this.outerOutline);
        

        this.rouletteTop = new Sprite(Globals.resources.top);
        this.rouletteTop.position.set(WHEEL_CONFIG.centerOffsetX, WHEEL_CONFIG.centerOffsetY);
        this.rouletteTop.scale.set(WHEEL_CONFIG.scale);
        this.rouletteTop.anchor.set(0.5);
        this.addChild(this.rouletteTop);
        
        // Create number labels
        this.createNumberLabels();
    }
    
    /**
     * Setup wheel transform properties for precise positioning
     */
    private setupTransform(): void {
        this.pivot.set(WHEEL_CONFIG.centerOffsetX, WHEEL_CONFIG.centerOffsetY);
        this.position.set(WHEEL_CONFIG.centerOffsetX, WHEEL_CONFIG.centerOffsetY);
    }
    
    /**
     * Create number labels positioned around the wheel
     */
    private createNumberLabels(): void {
        const centerX = this.roullete.position.x;
        const centerY = this.roullete.position.y;
        
        this.rouletteNumbers.forEach((number, index) => {
            // Calculate precise angle for each number (starting from top, going clockwise)
            const angle = this.getAngleForIndex(index);
            
            // Calculate position using polar coordinates
            const x = centerX + Math.cos(angle) * 300;
            const y = centerY + Math.sin(angle) * 300;
            
            // Determine text color based on number type
            const textColor = this.getNumberColor(number);
            
            // Create number label
            const numberText = new TextLabel(
                x, 
                y, 
                0.5, 
                number.toString(), 
                WHEEL_CONFIG.numberFontSize, 
                textColor
            );
            
            numberText.style.fontWeight = 'bold';
            numberText.scale.set(WHEEL_CONFIG.numberScale);
            
            this.numbers.push(numberText);
            this.addChild(numberText);
        });
    }
    
    /**
     * Get the color for a specific number
     * @param number The roulette number
     * @returns Color value for the number
     */
    private getNumberColor(number: number): number {
        if (number === 0) {
            return WHEEL_CONFIG.greenColor; // Green for zero
        } else if (this.redNumbers.includes(number)) {
            return WHEEL_CONFIG.textColor; // White text on red background
        } else if (this.blackNumbers.includes(number)) {
            return WHEEL_CONFIG.textColor; // White text on black background
        }
        return WHEEL_CONFIG.textColor; // Default white
    }
    
    /**
     * Calculate angle for a specific array index
     * @param index Array index (0 to 36)
     * @returns Angle in radians
     */
    private getAngleForIndex(index: number): number {
        const totalNumbers = this.rouletteNumbers.length;
        const anglePerNumber = (2 * Math.PI) / totalNumbers;
        // Start from top (-π/2) and go clockwise
        return (index * anglePerNumber) - (Math.PI / 2);
    }
    
    /**
     * 🎯 Get the angle for a specific number on the wheel (PUBLIC API)
     * This is the main method used by the animation system
     * @param targetNumber The number to find the angle for (0-36)
     * @returns The angle in radians where this number is positioned
     */
    public getAngleForNumber(targetNumber: number): number {
        const index = this.rouletteNumbers.indexOf(targetNumber);
        if (index === -1) {
            console.warn(`Number ${targetNumber} not found on wheel`);
            return 0;
        }
        
        return this.getAngleForIndex(index);
    }
    
    /**
     * 🔍 Get the current winning number based on wheel rotation
     * Determines which number is currently at the top position (-90 degrees)
     * @returns The number currently aligned at the top
     */
    public getCurrentWinningNumber(): number {
        // Get current wheel rotation
        const currentRotation = this.rotation;
        
        // The top position is at -π/2 (270°)
        const topPosition = -Math.PI / 2;
        
        // ✅ FIXED COORDINATE SYSTEM:
        // Each number has a local angle. After wheel rotation R, 
        // that number appears at (localAngle + R) in world space.
        // To find what's at the top, we need: localAngle + R = topPosition
        // Therefore: localAngle = topPosition - R
        const requiredLocalAngle = topPosition - currentRotation;
        
        // Normalize to [-π, π] range
        let normalizedAngle = requiredLocalAngle;
        while (normalizedAngle < -Math.PI) normalizedAngle += 2 * Math.PI;
        while (normalizedAngle > Math.PI) normalizedAngle -= 2 * Math.PI;
        
        // Find the number whose local angle is closest to the required angle
        let closestIndex = 0;
        let minDifference = Infinity;
        
        for (let i = 0; i < this.rouletteNumbers.length; i++) {
            const numberLocalAngle = this.getAngleForIndex(i);
            
            // Calculate angular difference (handle wraparound)
            let angleDiff = Math.abs(numberLocalAngle - normalizedAngle);
            if (angleDiff > Math.PI) {
                angleDiff = 2 * Math.PI - angleDiff;
            }
            
            if (angleDiff < minDifference) {
                minDifference = angleDiff;
                closestIndex = i;
            }
        }
        
        const winningNumber = this.rouletteNumbers[closestIndex];
        const winningAngle = this.getAngleForIndex(closestIndex);
        
        // Verify: where does this number actually appear after rotation?
        const actualWorldAngle = winningAngle + currentRotation;
        const worldAngleDegrees = (actualWorldAngle * 180 / Math.PI) % 360;
        const topPositionDegrees = (topPosition * 180 / Math.PI + 360) % 360;
        
        console.log(`🔍 FIXED Winning Number Debug:
        Wheel Rotation: ${(currentRotation * 180 / Math.PI).toFixed(2)}°
        Required Local Angle: ${(normalizedAngle * 180 / Math.PI).toFixed(2)}°
        Winning Number: ${winningNumber} (index ${closestIndex})
        Number's Local Angle: ${(winningAngle * 180 / Math.PI).toFixed(2)}°
        Number's World Position: ${worldAngleDegrees.toFixed(2)}°
        Target Position (Top): ${topPositionDegrees.toFixed(2)}°
        Position Error: ${Math.abs(worldAngleDegrees - topPositionDegrees).toFixed(2)}°
        Angular Precision: ±${(minDifference * 180 / Math.PI).toFixed(2)}°`);
        
        return winningNumber;
    }
    
    /**
     * Get the index of a specific number in the wheel layout
     * @param number The roulette number
     * @returns Array index of the number
     */
    public getIndexForNumber(number: number): number {
        return this.rouletteNumbers.indexOf(number);
    }
    
    /**
     * 📊 Get all roulette numbers in wheel order
     * @returns Copy of the roulette numbers array
     */
    public getRouletteNumbers(): readonly number[] {
        return [...this.rouletteNumbers];
    }
    
    /**
     * 🔴 Check if a number is red
     * @param number The number to check
     * @returns True if red, false otherwise
     */
    public isRedNumber(number: number): boolean {
        return this.redNumbers.includes(number);
    }
    
    /**
     * ⚫ Check if a number is black  
     * @param number The number to check
     * @returns True if black, false otherwise
     */
    public isBlackNumber(number: number): boolean {
        return this.blackNumbers.includes(number);
    }
    
    /**
     * 🟢 Check if a number is green (zero)
     * @param number The number to check
     * @returns True if green (zero), false otherwise
     */
    public isGreenNumber(number: number): boolean {
        return number === 0;
    }
    
    /**
     * 📏 Get the total number of pockets on the wheel
     * @returns Total pocket count (37 for European roulette)
     */
    public getPocketCount(): number {
        return this.rouletteNumbers.length;
    }
    
    /**
     * 🧭 Get the angle between adjacent numbers
     * @returns Angle in radians between consecutive pockets
     */
    public getAnglePerPocket(): number {
        return (2 * Math.PI) / this.rouletteNumbers.length;
    }
    
    /**
     * 🎯 Validate if a number exists on the wheel
     * @param number The number to validate
     * @returns True if valid, false otherwise
     */
    public isValidNumber(number: number): boolean {
        return this.rouletteNumbers.includes(number);
    }
    
    /**
     * 📍 Get wheel center coordinates
     * @returns Object with x and y center coordinates
     */
    public getCenterPosition(): { x: number; y: number } {
        return {
            x: WHEEL_CONFIG.centerOffsetX,
            y: WHEEL_CONFIG.centerOffsetY
        };
    }

    /**
     * 📏 Get the actual outermost radius of the roulette wheel
     * Calculated dynamically based on the main roulette sprite dimensions and scale
     * @returns The outermost radius in pixels
     */
    public getOutermostRadius(): number {
        if (!this.roullete) {
            console.warn('⚠️ Main roulette sprite not initialized, using fallback radius');
            // Fallback: use base radius with scale
            return 300 * WHEEL_CONFIG.scale; // Estimated base radius * wheel scale
        }

        // Use the main roulette wheel texture dimensions (more accurate than getBounds)
        const texture = this.roullete.texture;
        const textureRadius = Math.max(texture.width, texture.height) / 2;
        
        // Apply the wheel scale to get actual rendered radius
        const actualRadius = textureRadius * WHEEL_CONFIG.scale;
        
        console.log(`📏 Calculated outermost radius: ${actualRadius.toFixed(1)}px (texture: ${textureRadius.toFixed(1)}px, scale: ${WHEEL_CONFIG.scale})`);
        return actualRadius;
    }

    /**
     * 📏 Get the ball starting radius (slightly outside the wheel edge)
     * @param marginPixels Additional margin in pixels (default 25px outside wheel edge)
     * @returns Starting radius for the ball
     */
    public getBallStartRadius(marginPixels: number = 50): number {
        const outermostRadius = this.getOutermostRadius();
        
        // Add fixed pixel margin instead of percentage for more predictable positioning
        const startRadius = outermostRadius - marginPixels;
        
        console.log(`🎾 Ball start radius: ${startRadius.toFixed(1)}px (${marginPixels}px margin from wheel edge ${outermostRadius.toFixed(1)}px)`);
        return startRadius;
    }

    /**
     * 📏 Get the ball ending radius (where ball settles in pockets)
     * Calculated based on the actual pocket depth relative to number positions
     * @param pocketDepthRatio How deep the ball settles (0.8 = 80% from center toward numbers)
     * @returns Ending radius for the ball
     */
    public getBallEndRadius(pocketDepthRatio: number = 0.80): number {
        // Numbers are positioned at numberRadius from center
        const numberRadius = WHEEL_CONFIG.numberRadius * WHEEL_CONFIG.scale;
        
        // Ball settles in pockets at the specified depth ratio
        // 0.80 = 80% from center toward numbers = realistic pocket depth
        const endRadius = numberRadius +  60;
        
        console.log(`🎾 Ball end radius: ${endRadius.toFixed(1)}px (${(pocketDepthRatio * 100)}% of number radius ${numberRadius.toFixed(1)}px)`);
        return endRadius;
    }
    
    /**
     * 🔧 Debug method: Log current wheel state
     */
    public debugWheelState(): void {
        const currentWinner = this.getCurrentWinningNumber();
        const rotationDegrees = (this.rotation * (180 / Math.PI)) % 360;
        
        console.log(`
🎰 WHEEL DEBUG STATE:
━━━━━━━━━━━━━━━━━━━━━━
🔄 Rotation: ${rotationDegrees.toFixed(2)}°
🎯 Current Winner: ${currentWinner}
🔴 Is Red: ${this.isRedNumber(currentWinner)}
⚫ Is Black: ${this.isBlackNumber(currentWinner)}
🟢 Is Green: ${this.isGreenNumber(currentWinner)}
📊 Total Pockets: ${this.getPocketCount()}
━━━━━━━━━━━━━━━━━━━━━━
        `);
    }
}