import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  typedRoutes: true,
  images: {
    qualities: [100],
  },
  logging: {
    browserToTerminal: true,
  },
  experimental: {
    typedEnv: true,
    inlineCss: true,
    cssChunking: "graph",
    turbopackRustReactCompiler: true,
    turbopackFileSystemCacheForBuild: true,
    turbopackServerSideNestedAsyncChunking: true,
    turbopackSharedRuntime: true,
    turbopackCjsTreeShaking: true,
    turbopackChunking: {
      generateComponentChunks: true,
    },
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        permanent: false,
      },
    ];
  },
};

export default withBotId(nextConfig);
