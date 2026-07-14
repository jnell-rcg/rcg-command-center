/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "xlsx"],
};

module.exports = nextConfig;
