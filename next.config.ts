import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const localApiOrigin = 'http://localhost:8080';

function resolveApiOrigin(): string {
  const configuredApiOrigin =
    process.env.KEPOTRET_API_ORIGIN ?? localApiOrigin;

  let apiOrigin: URL;

  try {
    apiOrigin = new URL(configuredApiOrigin);
  } catch {
    throw new Error(
      'KEPOTRET_API_ORIGIN must be a valid absolute HTTP(S) URL origin.',
    );
  }

  if (
    !['http:', 'https:'].includes(apiOrigin.protocol) ||
    apiOrigin.pathname !== '/' ||
    apiOrigin.search ||
    apiOrigin.hash ||
    apiOrigin.username ||
    apiOrigin.password
  ) {
    throw new Error(
      'KEPOTRET_API_ORIGIN must be a valid absolute HTTP(S) URL origin.',
    );
  }

  return apiOrigin.origin;
}

const apiOrigin = resolveApiOrigin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
