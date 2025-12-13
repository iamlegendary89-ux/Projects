/** @type {import('next').NextConfig} */
const nextConfig = {
    // Anti-Reverse Engineering: Disable source maps in production
    productionBrowserSourceMaps: false,

    // Security Headers
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin'
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://api.fontshare.com; font-src 'self' https://api.fontshare.com data:; img-src 'self' data: https:; connect-src 'self' https:;"
                    }
                ]
            }
        ];
    },

    // Image Optimization (Zero Cost: Use default loader or configure remote patterns if needed)
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },

};

export default nextConfig;
