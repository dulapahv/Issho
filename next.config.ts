import type { NextConfig } from 'next';

import { withBotId } from 'botid/next/config';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  experimental: {
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

export default withBotId(nextConfig);
