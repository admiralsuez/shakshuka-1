import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  turbopack: {
    rules: {
      "*.{jsx,tsx}": {
        loaders: [LOADER]
      }
    }
  },
  webpack: (config) => {
    // Exclude Tauri build directory from webpack processing
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/src-tauri/target/**', '**/node_modules/**']
    };
    return config;
  }
};

export default nextConfig;
// Orchids restart: 1759430014522
