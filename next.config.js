/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
          ignoreBuildErrors: true,
    },
    eslint: {
          ignoreDuringBuilds: true,
    },
    experimental: {
          serverActions: true,
    },
    images: {
          domains: ['lh3.googleusercontent.com'],
    },
}

module.exports = nextConfig
