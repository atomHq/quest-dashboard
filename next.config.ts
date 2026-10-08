import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The backend currently sends Paystack users back to {FRONTEND_URL}/v1/webhooks/paystack?reference=…
      // The query string is carried over automatically.
      { source: '/v1/webhooks/paystack', destination: '/wallet/deposit/callback', permanent: false },
    ]
  },
}

export default nextConfig
