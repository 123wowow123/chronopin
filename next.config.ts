import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  cacheComponents: true,
  // Hide the "N" dev-tools badge; compile and runtime errors still show.
  devIndicators: false,
  // Let phones on the home Wi-Fi load dev assets and HMR (http://192.168.x.x:3000).
  allowedDevOrigins: ['192.168.*.*'],

  // Native or heavyweight server dependencies stay as plain Node requires
  // instead of being bundled.
  serverExternalPackages: [
    'pg',
    'puppeteer',
    'jimp',
    '@azure/storage-blob',
    '@aws-sdk/client-sns',
    '@anthropic-ai/sdk',
  ],

  images: {
    // Local development serves thumbnails from Azurite on 127.0.0.1, which the
    // optimizer refuses by default. ALLOW_LOCAL_IMAGES=1 opts a local
    // production build in too; never set it in a deployment.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCAL_IMAGES === '1',
    remotePatterns: [
      // Production thumbnails and uploads.
      { protocol: 'https', hostname: 'chronopin.blob.core.windows.net' },
      // Local Azurite emulator (see Docker/docker-compose.dev.yml).
      { protocol: 'http', hostname: '127.0.0.1', port: '10000' },
      // The same emulator reached by LAN address when testing on a phone
      // (NEXT_PUBLIC_THUMB_URL_PREFIX=http://<mac-ip>:10000/devstoreaccount1/thumb/).
      { protocol: 'http', hostname: '192.168.*.*', port: '10000' },
    ],
  },

  async redirects() {
    return [
      // The watch page was already disabled in the Angular app; send old links home.
      { source: '/watch', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
