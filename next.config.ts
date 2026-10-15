import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  ...(process.env.NEXT_WINDOWS_SERIAL_BUILD === '1' ? {
    experimental: { cpus: 1, staticGenerationMaxConcurrency: 1 },
  } : {}),
  turbopack: {
    root: path.resolve(__dirname),
  },
  // outputFileTracingRoot: path.resolve(__dirname),
  allowedDevOrigins: [],
  images: {
    // Keep the remote image optimizer disabled until the framework is patched.
    unoptimized: true,
    remotePatterns: [],
  },
  // 将 fluent-ffmpeg 标记为外部依赖，避免 Turbopack 打包问题
  serverExternalPackages: ['fluent-ffmpeg'],
};

export default nextConfig;
