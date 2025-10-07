import type { NextConfig } from 'next';

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import { withBotId } from 'botid/next/config';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  images: {
    loader: 'custom',
    loaderFile: './image-loader.ts',
    qualities: [100],
  },
  experimental: {
    typedEnv: true,
    viewTransition: true,
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        permanent: false,
      },
    ];
  },
};

initOpenNextCloudflareForDev();

export default withBotId(nextConfig);
