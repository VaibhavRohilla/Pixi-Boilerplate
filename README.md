# Pixi.js Game Project

A modern web-based game project built with Pixi.js v8, TypeScript, and Vite.

## 🚀 Features

- Built with Pixi.js v8 for high-performance 2D graphics
- TypeScript for type-safe development
- Scene management system for organized game structure
- Asset management with AssetPack
- Sound effects support via Howler.js
- Animation capabilities with GSAP
- Modern development setup with Vite

## 🛠️ Tech Stack

- **Pixi.js v8**: For 2D graphics rendering
- **TypeScript**: For type-safe development
- **Vite**: For fast development and optimized builds
- **GSAP**: For advanced animations
- **Howler.js**: For audio management
- **AssetPack**: For asset optimization and management

## 📦 Project Structure

```
├── src/
│   ├── loaders/     # Asset loading utilities
│   ├── ui/         # UI components
│   ├── main.ts     # Application entry point
│   ├── scene.ts    # Base scene class
│   ├── scenemanager.ts # Scene management
│   └── ...         # Other game components
├── public/         # Static assets
├── raw-assets/     # Source assets
└── .assetpack/     # Processed assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

### Development

Run the development server:
```bash
npm run dev
```

### Building for Production

Build the project:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## 🛠️ Development Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

## 📝 Project Configuration

The project uses several configuration files:
- `vite.config.ts`: Vite configuration
- `tsconfig.json`: TypeScript configuration
- `eslint.config.mjs`: ESLint configuration

## 🎮 Game Architecture

The project follows a scene-based architecture:
- `Scene`: Base class for all game scenes
- `SceneManager`: Manages scene transitions and state
- `MainScene`: Main game scene implementation

## 🎨 Asset Management

Assets are processed using AssetPack with the following plugins:
- Texture Packer
- Compression

## 📦 Dependencies

### Main Dependencies
- pixi.js: ^8.0.0
- gsap: ^3.13.0
- howler: ^2.2.4

### Development Dependencies
- TypeScript
- Vite
- ESLint
- AssetPack and its plugins
- Various build optimization tools

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## 📄 License

This project is private and proprietary.

## 👥 Authors

- Your Name/Team Name

---

Built with ❤️ using Pixi.js and TypeScript 