import { config } from "../appconfig";

// ⚙️ ROULETTE GAME CONFIGURATION
export const ROULETTE_CONFIG = {
    pocketCount: 37,
    wheelRadius: 200,
    centerX: config.logicalWidth / 2,
    centerY: config.logicalHeight / 2,

    // 🚨 DEPRECATED: These are now calculated dynamically by BallPhysics
    // ballStartRadius and ballEndRadius are no longer used as hardcoded values
    // The ball now calculates its starting position from the actual roulette board dimensions
    ballStartRadius: 270,  // ⚠️ Legacy value - replaced by dynamic calculation
    ballEndRadius: 140,    // ⚠️ Legacy value - replaced by dynamic calculation

    spinDuration: 15.0,
    wheelSpins: 8,
    ballSpins: 8,

    phase1Duration: 0.45,  // 45% - Ball launch
    phase2Duration: 0.55,  // 55% - Ball spiral inward and land (dynamic→dynamic) - DYNAMIC TIMING

    // Constant wheel rotation (never stops)
    constantWheelSpeed: 0.5, // rotations per second (slow and steady)
    
    wheelEasing: "sine.InOut",
    ballSpiralEasing: "sine.out",
    ballLandingEasing: "sine.out",

    // Automatic countdown after each spin
    autoCountdownDuration: 15 // seconds to wait before next spin is allowed
} as const;

// ⏰ UI CONFIGURATION
export const UI_CONFIG = {
    // Time Display
    timeDisplay: {
        x: config.logicalWidth / 2,
        y: 40,
        fontSize: 24,
        color: 0xFFFFFF,
        fontFamily: "Arial",
        lineHeight: 32
    },
    
    // Countdown Overlay
    countdown: {
        overlayColor: 0x000000,
        overlayAlpha: 0.7,
        backgroundColor: 0x1a1a1a,
        borderColor: 0x4a90e2,
        borderWidth: 3,
        borderRadius: 15,
        fontSize: 48,
        textColor: 0xFFFFFF,
        shadowColor: 0x000000,
        glowColor: 0x4a90e2,
        containerWidth: 300,
        containerHeight: 120,
        autoCountdownDuration: 15
    }
} as const;

// 🎯 GAME CONSTANTS
export const GAME_CONSTANTS = {
    TARGET_NUMBERS: {
        RED: 32,
        BLACK: 15,
        GREEN: 0
    },
    
    SPIN_COMMANDS: {
        RANDOM: [' ', 'r'],
        NUMBERS: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
        SPECIAL: ['q', 'w', 'e'],
        COUNTDOWN: ['c', 'x', 't']
    }
} as const; 