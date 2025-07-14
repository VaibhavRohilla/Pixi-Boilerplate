import { Sprite } from "pixi.js";
import { Globals } from "../globals";
import { RoulleteBoard } from "../roullete";
import { ROULETTE_CONFIG } from "../config/GameConfig";

export interface BallPhysicsEvents {
    onSpinComplete: (winningIndex: number) => void;
    onBallLanded: (winningIndex: number) => void;
}

/**
 * 🎾 Ball Physics Engine
 * Handles all ball animation, physics simulation, and movement logic
 */
export class BallPhysics {
    private ball: Sprite;
    private roulette: RoulleteBoard;
    private events: BallPhysicsEvents;
    
    // Animation state
    private isSpinning: boolean = false;
    private animationTimeline: any = null;
    private ballTween: any = null;
    private ballSyncTween: any = null;
    
    // Ball state tracking
    private ballFinalAngle: number = 0;
    private currentBallAngle: number = 0;

    // 📏 Dynamic radius calculations (no more hardcoded values!)
    private ballStartRadius: number = 0;
    private ballEndRadius: number = 0;
    private ballMidRadius: number = 0; // New intermediate radius
    private centerX: number = 0;
    private centerY: number = 0;

    constructor(ball: Sprite, roulette: RoulleteBoard, events: BallPhysicsEvents) {
        this.ball = ball;
        this.roulette = roulette;
        this.events = events;
        
        // Calculate dynamic dimensions
        this.calculateDynamicDimensions();
        
        this.initializeBall();
    }

    /**
     * 📏 Calculate dynamic dimensions based on actual roulette board size
     */
    private calculateDynamicDimensions(): void {
        // Get center position from roulette
        const center = this.roulette.getCenterPosition();
        this.centerX = center.x;
        this.centerY = center.y;
        
        // Get dynamic radius values from roulette board
        this.ballStartRadius = this.roulette.getBallStartRadius(this.ball.width); // Outer rim
        this.ballEndRadius = this.roulette.getBallEndRadius(); // Final pocket depth
        this.ballMidRadius = this.ballStartRadius * 0.75; // Intermediate bouncing zone
        
        console.log(`📏 Dynamic ball physics dimensions calculated:
        🎯 Center: (${this.centerX}, ${this.centerY})
        🚀 Start radius: ${this.ballStartRadius.toFixed(1)}px
        🔄 Mid radius: ${this.ballMidRadius.toFixed(1)}px
        🎾 End radius: ${this.ballEndRadius.toFixed(1)}px`);
    }

    /**
     * 🎾 Initialize ball sprite and positioning
     */
    private initializeBall(): void {
        this.ball.visible = false;
        this.ball.anchor.set(0.5);
        this.ball.scale.set(0.6);
        
        // Position ball at starting radius (3 o'clock position) - now dynamic!
        const startX = this.centerX + this.ballStartRadius;
        const startY = this.centerY;
        this.ball.position.set(startX, startY);
        
        console.log("🎾 Ball physics initialized with dynamic positioning");
    }

    /**
     * 🎯 Start ball animation to land on specific number
     */
    public startSpin(winningIndex: number): void {
        if (this.isSpinning || winningIndex < 0 || winningIndex >= ROULETTE_CONFIG.pocketCount) {
            console.warn(`🎾 Invalid winning index: ${winningIndex}`);
            return;
        }

        console.log(`🎾 Starting realistic ball physics simulation for target: ${winningIndex}`);
        this.isSpinning = true;
        this.ball.visible = true;
        
        // Clear any existing animations
        this.stopAllAnimations();
        
        // Reset ball state
        this.currentBallAngle = 0;
        this.ballFinalAngle = 0;

        // Create master timeline
        this.animationTimeline = Globals.gsap?.timeline({
            onComplete: () => this.onSpinComplete(winningIndex)
        });
        
        // Execute realistic physics with natural motion first, then calculated landing
        this.executePhase1_FastOuterRim();
        this.executePhase2_ContinuedSpinning();
        this.executePhase3_GradualDescent();
        this.executePhase4_CalculatedLanding(winningIndex); // Only this phase uses winning index
    }

    /**
     * 🚀 Phase 1: Fast Outer Rim Spinning (20% of total time)
     */
    private executePhase1_FastOuterRim(): void {
        const duration = ROULETTE_CONFIG.spinDuration * 0.20; // 20% of total time
        
        console.log(`🚀 Phase 1 - Fast Outer Rim: Duration: ${duration.toFixed(2)}s`);
        
        const ballStartAngle = 0; // Start at 3 o'clock
        const ballRotations = ROULETTE_CONFIG.ballSpins * 0.3; // 30% of total rotations
        
        this.ballTween = Globals.gsap?.to({}, {
            duration: duration,
            ease: "power1.out", // Fast start, slight deceleration
            onUpdate: () => {
                const progress = this.ballTween?.progress() || 0;
                
                // Ball moves counter-clockwise (opposite to wheel)
                this.currentBallAngle = ballStartAngle - (ballRotations * 2 * Math.PI * progress);
                
                // Stay at outer radius with minimal wobble
                const baseRadius = this.ballStartRadius;
                const wobbleIntensity = 3; // Minimal wobble at high speed
                const wobbleFreq = progress * 25;
                const randomWobble = Math.sin(wobbleFreq) * wobbleIntensity;
                const currentRadius = baseRadius + randomWobble;
                
                // Minimal vertical movement at high speed
                const bounceHeight = Math.sin(progress * Math.PI * 8) * 2;
                
                // Calculate position
                const x = this.centerX + currentRadius * Math.cos(this.currentBallAngle);
                const y = this.centerY + currentRadius * Math.sin(this.currentBallAngle) + bounceHeight;
                
                this.ball.position.set(x, y);
            }
        });
        
        if (this.animationTimeline && this.ballTween) {
            this.animationTimeline.add(this.ballTween, 0);
        }
    }

    /**
     * 🔄 Phase 2: Continued Spinning with Bouncing (30% of total time)
     */
    private executePhase2_ContinuedSpinning(): void {
        const startTime = ROULETTE_CONFIG.spinDuration * 0.20;
        const duration = ROULETTE_CONFIG.spinDuration * 0.30; // 30% of total time
        
        console.log(`🔄 Phase 2 - Continued Spinning: Duration: ${duration.toFixed(2)}s`);
        
        const phase1Rotations = ROULETTE_CONFIG.ballSpins * 0.3;
        const phase2Rotations = ROULETTE_CONFIG.ballSpins * 0.35; // 35% more rotations
        const startAngle = -(phase1Rotations * 2 * Math.PI);
        
        const phase2Tween = Globals.gsap?.to({}, {
            duration: duration,
            ease: "power1.inOut", // Gradual slowdown
            onUpdate: () => {
                const progress = phase2Tween?.progress() || 0;
                
                // Continue counter-clockwise rotation but slower
                this.currentBallAngle = startAngle - (phase2Rotations * 2 * Math.PI * progress);
                
                // Stay mostly at outer radius but start showing more bounce
                const baseRadius = this.ballStartRadius;
                const radiusVariation = 15; // More radius variation
                const radiusWobble = Math.sin(progress * 40) * radiusVariation * (1 - progress * 0.3);
                const currentRadius = baseRadius + radiusWobble;
                
                // Increase bouncing effect significantly
                const bounceIntensity = 8 + (progress * 12); // Bouncing increases over time
                const bounceFreq = 12 + (progress * 8);
                const bounceHeight = Math.sin(progress * bounceFreq) * bounceIntensity;
                
                // Add some erratic movement as ball starts to lose momentum
                const erraticMovement = Math.sin(progress * 30) * 5 * progress;
                
                // Calculate position
                const finalRadius = currentRadius + erraticMovement;
                const x = this.centerX + finalRadius * Math.cos(this.currentBallAngle);
                const y = this.centerY + finalRadius * Math.sin(this.currentBallAngle) + bounceHeight;
                
                this.ball.position.set(x, y);
            }
        });
        
        if (this.animationTimeline && phase2Tween) {
            this.animationTimeline.add(phase2Tween, startTime);
        }
    }

    /**
     * 🌀 Phase 3: Gradual Descent with Heavy Bouncing (30% of total time)
     */
    private executePhase3_GradualDescent(): void {
        const startTime = ROULETTE_CONFIG.spinDuration * 0.50; // Start at 50%
        const duration = ROULETTE_CONFIG.spinDuration * 0.30; // 30% of total time
        
        console.log(`🌀 Phase 3 - Gradual Descent: Duration: ${duration.toFixed(2)}s`);
        
        const phase1And2Rotations = ROULETTE_CONFIG.ballSpins * 0.65;
        const phase3Rotations = ROULETTE_CONFIG.ballSpins * 0.25; // Slower rotation
        const startAngle = -(phase1And2Rotations * 2 * Math.PI);
        
        const phase3Tween = Globals.gsap?.to({}, {
            duration: duration,
            ease: "power2.out", // Strong deceleration
            onUpdate: () => {
                const progress = phase3Tween?.progress() || 0;
                
                // Slower rotation - let it continue naturally
                this.currentBallAngle = startAngle - (phase3Rotations * 2 * Math.PI * progress);
                
                // Gradual descent from outer to mid radius
                const radiusStart = this.ballStartRadius;
                const radiusEnd = this.ballMidRadius;
                const baseRadius = radiusStart - ((radiusStart - radiusEnd) * progress);
                
                // Heavy bouncing as ball loses momentum
                const bounceIntensity = 15 + (progress * 10); // Peak bouncing
                const bounceFreq = 8 + (progress * 6);
                const bounceHeight = Math.sin(progress * bounceFreq) * bounceIntensity * (1 - progress * 0.2);
                
                // More erratic movement
                const erraticIntensity = 12 * (1 - progress * 0.5);
                const erraticMovement = Math.sin(progress * 25) * erraticIntensity * Math.random();
                
                // Calculate position
                const finalRadius = baseRadius + erraticMovement;
                const x = this.centerX + finalRadius * Math.cos(this.currentBallAngle);
                const y = this.centerY + finalRadius * Math.sin(this.currentBallAngle) + bounceHeight;
                
                this.ball.position.set(x, y);
            }
        });
        
        if (this.animationTimeline && phase3Tween) {
            this.animationTimeline.add(phase3Tween, startTime);
        }
    }

    /**
     * 🎯 Phase 4: Dynamic Calculated Landing (20% of total time)
     * Fixed with deterministic angular interpolation
     */
    private executePhase4_CalculatedLanding(winningIndex: number): void {
        const startTime = ROULETTE_CONFIG.spinDuration * 0.80; // Start at 80%
        const duration = ROULETTE_CONFIG.spinDuration * 0.20; // 20% of total time
        
        console.log(`🎯 Phase 4 - Calculated Landing: Target ${winningIndex}, Duration: ${duration.toFixed(2)}s`);
        
        // Calculate where ball currently is at the start of this phase
        const phase1To3Rotations = ROULETTE_CONFIG.ballSpins * 0.90;
        const initialBallAngle = -(phase1To3Rotations * 2 * Math.PI);
        
        // Calculate target position
        const remainingTime = duration;
        const wheelRotationDuringRemainingTime = ROULETTE_CONFIG.constantWheelSpeed * remainingTime * 2 * Math.PI;
        const currentWheelRotation = this.roulette.rotation;
        const finalWheelRotation = currentWheelRotation + wheelRotationDuringRemainingTime;
        
        // Get target number's local angle and calculate its world position at landing time
        const targetNumberLocalAngle = this.roulette.getAngleForNumber(winningIndex);
        const targetWorldAngle = targetNumberLocalAngle + finalWheelRotation;
        const topPosition = -Math.PI / 2; // Ball needs to be at top position
        const targetBallAngle = targetWorldAngle - topPosition;
        
        // 🔧 DETERMINISTIC ANGULAR INTERPOLATION
        // Calculate the angular difference using shortest counter-clockwise path
        let angleDiff = targetBallAngle - initialBallAngle;
        
        // Normalize to shortest path
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Force counter-clockwise direction for natural roulette motion
        if (angleDiff > 0) {
            angleDiff -= 2 * Math.PI;
        }
        
        console.log(`📊 Deterministic Landing Calculation:
        Initial Ball Angle: ${(initialBallAngle * 180 / Math.PI).toFixed(2)}°
        Target Ball Angle: ${(targetBallAngle * 180 / Math.PI).toFixed(2)}°
        Angular Difference: ${(angleDiff * 180 / Math.PI).toFixed(2)}°
        Direction: Counter-clockwise`);
        
        // Store for wheel sync
        this.ballFinalAngle = targetBallAngle;
        
        const phase4Tween = Globals.gsap?.to({}, {
            duration: duration,
            ease: "power2.out", // Smooth deceleration
            onUpdate: () => {
                const progress = phase4Tween?.progress() || 0;
                
                // 🎯 DETERMINISTIC ANGULAR INTERPOLATION
                // Simple, predictable progress-based lerp
                const interpolatedAngle = initialBallAngle + (angleDiff * progress);
                const deltaAngle = interpolatedAngle - this.currentBallAngle;
                const maxDelta = 0.04; // ~2.2° per frame max
                const clampedDelta = Math.max(-maxDelta, Math.min(maxDelta, deltaAngle));
                this.currentBallAngle += clampedDelta;
                
                // 📏 RADIUS DESCENT - Smooth transition from mid to end radius
                const radiusStart = this.ballMidRadius;
                const radiusEnd = this.ballEndRadius;
                const radiusProgress = this.easeInOutCubic(progress); // Smooth radius transition
                const currentRadius = radiusStart - ((radiusStart - radiusEnd) * radiusProgress);
                
                // 🏀 REALISTIC BOUNCING - Decreases as ball settles
                const bounceIntensity = 12 * Math.pow(1 - progress, 2); // Quadratic decrease
                const bounceFreq = 5; // Consistent frequency
                const bounceHeight = Math.sin(progress * Math.PI * bounceFreq) * bounceIntensity;
                
                // 🌊 SUBTLE ERRATIC MOVEMENT - Minimal wobble for realism
                const erraticIntensity = 3 * Math.pow(1 - progress, 3); // Cubic decrease
                const erraticFreq = 8;
                const erraticMovement = Math.sin(progress * Math.PI * erraticFreq) * erraticIntensity;
                
                // 📍 FINAL POSITION CALCULATION
                const finalRadius = currentRadius + erraticMovement;
                const x = this.centerX + finalRadius * Math.cos(interpolatedAngle);
                const y = this.centerY + finalRadius * Math.sin(interpolatedAngle) + bounceHeight;
                
                this.ball.position.set(x, y);
            },
            onComplete: () => {
                // Ensure exact final positioning
                this.currentBallAngle = targetBallAngle;
                const finalX = this.centerX + this.ballEndRadius * Math.cos(targetBallAngle);
                const finalY = this.centerY + this.ballEndRadius * Math.sin(targetBallAngle);
                this.ball.position.set(finalX, finalY);
                
                console.log(`🎯 Ball landed precisely on target ${winningIndex} with smooth interpolation!`);
                this.events.onBallLanded(winningIndex);
                
                // Start wheel sync after a brief pause
                Globals.gsap?.delayedCall(0.4, () => {
                    this.establishSmoothWheelSync(winningIndex);
                });
                
                this.addFinalBounce(winningIndex);
            }
        });
        
        if (this.animationTimeline && phase4Tween) {
            this.animationTimeline.add(phase4Tween, startTime);
        }
    }

    /**
     * 📐 Smooth easing function for radius transition
     */
    private easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * 🔄 Establish smooth wheel synchronization
     */
    private establishSmoothWheelSync(winningIndex: number): void {
        if (this.isSpinning) return; // Don't sync if new spin started
        
        // Cancel any existing ball sync
        if (this.ballSyncTween) {
            this.ballSyncTween.kill();
        }

        const targetNumberLocalAngle = this.roulette.getAngleForNumber(winningIndex);
        const ballCurrentAngle = this.ballFinalAngle || 0;
        
        // Gradual synchronization: slowly transition to wheel-relative motion
        const syncTarget = { syncProgress: 0 };
        
        this.ballSyncTween = Globals.gsap?.to(syncTarget, {
            syncProgress: 1,
            duration: 2.0, // 2 seconds to fully synchronize
            ease: "power2.inOut",
            onUpdate: () => {
                const progress = syncTarget.syncProgress;
                
                // Current wheel rotation
                const currentWheelRotation = this.roulette.rotation;
                
                // Ball angle: gradually transition from fixed position to wheel-relative
                const wheelRelativeAngle = targetNumberLocalAngle + currentWheelRotation;
                const currentAngle = ballCurrentAngle * (1 - progress) + wheelRelativeAngle * progress;
                
                // Update ball position
                            const ballX = this.centerX + this.ballEndRadius * Math.cos(currentAngle);
            const ballY = this.centerY + this.ballEndRadius * Math.sin(currentAngle);
                
                this.ball.position.set(ballX, ballY);
            },
            onComplete: () => {
                // Now permanently follow the wheel
                this.establishPermanentWheelSync(winningIndex);
            }
        });

        console.log(`🔄 Starting gradual wheel synchronization for number ${winningIndex}`);
    }

    /**
     * 🎯 Permanent wheel synchronization
     */
    private establishPermanentWheelSync(winningIndex: number): void {
        if (this.isSpinning) return;
        
        const targetNumberLocalAngle = this.roulette.getAngleForNumber(winningIndex);
        
        // Continuous wheel following
        this.ballSyncTween = Globals.gsap?.to({}, {
            duration: 999999,
            ease: "none",
            onUpdate: () => {
                if (this.isSpinning) {
                    if (this.ballSyncTween) {
                        this.ballSyncTween.kill();
                        this.ballSyncTween = null;
                    }
                    return;
                }
                
                // Perfect synchronization with wheel
                const currentWheelRotation = this.roulette.rotation;
                const synchronizedAngle = targetNumberLocalAngle + currentWheelRotation;
                
                            const ballX = this.centerX + this.ballEndRadius * Math.cos(synchronizedAngle);
            const ballY = this.centerY + this.ballEndRadius * Math.sin(synchronizedAngle);
                
                this.ball.position.set(ballX, ballY);
            }
        });

        console.log(`🎯 Permanent wheel synchronization established for number ${winningIndex}`);
    }

    /**
     * 🏀 Add final bounce effect for visual feedback
     */
    private addFinalBounce(winningIndex: number): void {
        console.log(`🏀 Adding final bounce effect for winning number: ${winningIndex}`);
        
        // Small scale bounce for visual feedback
        const originalScale = this.ball.scale.x;
        Globals.gsap?.to(this.ball.scale, {
            x: originalScale * 1.08,
            y: originalScale * 1.08,
            duration: 0.15,
            ease: "power2.out",
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                // Final winning effect
                this.addWinningEffect();
            }
        });
    }

    /**
     * ✨ Add subtle winning effect
     */
    private addWinningEffect(): void {
        const originalScale = this.ball.scale.x;
        Globals.gsap?.to(this.ball.scale, {
            x: originalScale * 1.15,
            y: originalScale * 1.15,
            duration: 0.2,
            ease: "power2.out",
            yoyo: true,
            repeat: 1
        });
    }

    /**
     * 🔄 Stop all ball animations
     */
    public stopAllAnimations(): void {
        if (this.animationTimeline) {
            this.animationTimeline.kill();
            this.animationTimeline = null;
        }
        if (this.ballTween) {
            this.ballTween.kill();
            this.ballTween = null;
        }
        if (this.ballSyncTween) {
            this.ballSyncTween.kill();
            this.ballSyncTween = null;
            console.log("🔄 Stopped ball wheel synchronization for new spin");
        }

        // Reset ball state
        // Ball state reset handled by animation cleanup
        
        // Kill any orphaned GSAP tweens on ball
        Globals.gsap?.killTweensOf(this.ball);
        Globals.gsap?.killTweensOf(this.ball.position);
        
        console.log("🎾 Ball physics animations stopped");
    }

    /**
     * 📋 Animation completion handler
     */
    private onSpinComplete(winningIndex: number): void {
        this.isSpinning = false;
        this.events.onSpinComplete(winningIndex);
    }

    /**
     * 🔍 Public state getters
     */
    public getIsSpinning(): boolean {
        return this.isSpinning;
    }

    public isReadyToSpin(): boolean {
        return !this.isSpinning;
    }

    /**
     * 🔄 Recalculate dimensions (useful after roulette resize)
     */
    public recalculateDimensions(): void {
        console.log("🔄 Recalculating ball physics dimensions...");
        this.calculateDynamicDimensions();
        
        // If ball is not spinning, update its position
        if (!this.isSpinning) {
            const startX = this.centerX + this.ballStartRadius;
            const startY = this.centerY;
            this.ball.position.set(startX, startY);
            console.log("🎾 Ball position updated to new dimensions");
        }
    }

    /**
     * 📊 Get current dynamic dimensions (for debugging)
     */
    public getDimensions(): { centerX: number; centerY: number; ballStartRadius: number; ballEndRadius: number } {
        return {
            centerX: this.centerX,
            centerY: this.centerY,
            ballStartRadius: this.ballStartRadius,
            ballEndRadius: this.ballEndRadius
        };
    }

    /**
     * 🗑️ Cleanup method
     */
    public destroy(): void {
        this.stopAllAnimations();
        console.log("🎾 Ball physics destroyed");
    }
} 