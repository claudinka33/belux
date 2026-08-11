/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "@googleapis/calendar", "@libsql/client"],
    instrumentationHook: true,
  },
};

export default nextConfig;
