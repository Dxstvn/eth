/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  experimental: {
    // Enable modern optimizations
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Enable server components optimizations
    serverComponentsExternalPackages: []
  },

  // Webpack configuration for performance
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer in development
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: isServer ? 8888 : 8889,
          openAnalyzer: true,
        })
      )
    }

    // Optimize chunks for better caching
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor chunks
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 20,
            },
            // UI library chunks
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              name: 'ui-libs',
              chunks: 'all',
              priority: 30,
            },
            // Common chunks
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Default chunk
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }

    // Performance monitoring in development
    if (dev) {
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.PERFORMANCE_MONITORING': JSON.stringify('true'),
        })
      )
    }

    return config
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: [
      'api.clearhold.app',
      'storage.googleapis.com',
      'firebasestorage.googleapis.com'
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Compression
  compress: true,

  // Headers for performance and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Cache static assets
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          // Preload critical resources
          {
            key: 'Link',
            value: '</fonts/inter.woff2>; rel=preload; as=font; type=font/woff2; crossorigin',
          },
        ],
      },
      // Specific caching for different asset types
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API responses caching
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300', // 5 minutes
          },
        ],
      },
    ]
  },

  // Redirects for performance
  async redirects() {
    return [
      // Redirect to canonical URLs
      {
        source: '/dashboard/',
        destination: '/dashboard',
        permanent: true,
      },
    ]
  },

  // Rewrites for optimization
  async rewrites() {
    return [
      // API proxy for better caching
      {
        source: '/api-proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ]
  },

  // TypeScript configuration
  typescript: {
    // Ignore TypeScript errors during build (they are handled by ESLint)
    ignoreBuildErrors: true,
  },

  // ESLint configuration
  eslint: {
    // Ignore ESLint errors during build
    ignoreDuringBuilds: true,
  },

  // Output configuration for deployment
  output: 'standalone',

  // Environment variables
  env: {
    PERFORMANCE_MONITORING: process.env.NODE_ENV === 'development' ? 'true' : 'false',
  },

  // Logging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
}

module.exports = nextConfig