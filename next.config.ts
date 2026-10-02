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
    turbopackServerSideNestedAsyncChunking: true,
    turbopackRustReactCompiler: true,
    turbopackCjsTreeShaking: true,
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
