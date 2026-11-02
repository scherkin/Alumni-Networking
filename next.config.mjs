/** @type {import('next').NextConfig} */
const nextConfig = {
  // Students can attach a transcript PDF (up to 10 MB) when they sign up.
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "media.licdn.com" }] },
};
export default nextConfig;
