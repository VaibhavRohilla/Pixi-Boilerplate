import { defineConfig } from 'vite';
import { resolve } from 'path';
import compression from 'vite-plugin-compression2';
import imagemin from 'vite-plugin-imagemin';
import { AssetPack, type AssetPackConfig } from '@assetpack/core';
import { pixiManifest } from '@assetpack/core/manifest';

function assetPackPlugin() {
    const assetPackConfig: AssetPackConfig = {
        entry: './raw-assets',
        output: './public/assets',
        cache: true,
        cacheLocation: '.assetpack',
        strict: true,
        logLevel: 'verbose',
        ignore: [
            '**/*.html',
            '**/*.md',
            '**/.*',
            '**/node_modules/**',
            '**/.DS_Store'
        ],
        assetSettings: [
            {
                files: ['**/*.{png,jpg,jpeg,webp}'],
                settings: {
                    compress: {
                        jpg: true,
                        png: true,
                        webp: true,
                    },
                },
            },
            {
                files: ['**/*.{mp3,ogg,wav}'],
                settings: {
                    audio: {
                        mp3: {
                            bitrate: 192,
                        },
                        ogg: {
                            quality: 0.8,
                        },
                    },
                },
            },
        ],
        pipes: [
            pixiManifest({
                output: 'manifest.json',
                createShortcuts: true,
                trimExtensions: true,
                includeMetaData: true,
                nameStyle: 'short'
            })
        ],
    };

    let ap: AssetPack | undefined;

    return {
        name: 'vite-plugin-assetpack',
        configResolved(config) {
            if (config.command === 'serve') {
                if (!ap) {
                    ap = new AssetPack(assetPackConfig);
                    void ap.watch();
                }
            }
        },
        buildStart() {
            if (!ap) {
                ap = new AssetPack(assetPackConfig);
                void ap.run();
            }
        },
        buildEnd() {
            if (ap) {
                void ap.stop();
                ap = undefined;
            }
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@assets': resolve(__dirname, 'src/assets'),
            '@components': resolve(__dirname, 'src/components'),
        },
    },
    server: {
        host: true,
        port: 3000,
    },
    build: {
        target: 'esnext',
        outDir: 'dist',
        assetsDir: 'assets',
        minify: 'terser',
        sourcemap: false,
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('pixi.js')) {
                            return 'pixi';
                        }
                        return 'vendor';
                    }
                },
                chunkFileNames: 'js/[name].[hash].js',
                entryFileNames: 'js/[name].[hash].js',
                assetFileNames: (assetInfo) => {
                    if (!assetInfo.name) return 'assets/[name].[hash].[ext]';
                    if (assetInfo.name.match(/\.(mp3|ogg|wav)$/i)) {
                        return 'sounds/[name].[hash].[ext]';
                    }
                    if (assetInfo.name.match(/\.(png|jpe?g|svg|gif|webp)$/i)) {
                        return 'assets/[name].[hash].[ext]';
                    }
                    return 'assets/[name].[hash].[ext]';
                },
            },
        },
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
            },
            mangle: {
                safari10: true,
            },
            format: {
                comments: false,
            },
        },
    },
    optimizeDeps: {
        include: ['pixi.js'],
    },
    plugins: [
        imagemin({
            gifsicle: {
                optimizationLevel: 7,
                interlaced: false,
            },
            optipng: {
                optimizationLevel: 7,
            },
            mozjpeg: {
                quality: 75,
                progressive: true,
            },
            pngquant: {
                quality: [0.65, 0.75],
                speed: 4,
                strip: true,
            },
            webp: {
                quality: 75,
                lossless: false,
                method: 6,
            },
            svgo: {
                plugins: [
                    {
                        name: 'removeViewBox',
                    },
                    {
                        name: 'removeEmptyAttrs',
                        active: false,
                    },
                ],
            },
        }),
        compression({
            algorithm: 'brotliCompress',
            exclude: [/\.(br)$/, /\.(gz)$/],
            deleteOriginalAssets: false,
            threshold: 512,
        }),
        assetPackPlugin(),
    ],
}); 