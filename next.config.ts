import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 自架用：vinext build 會產出 dist/standalone/server.js，直接 node 執行。
  output: "standalone",
};

export default nextConfig;
