import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the build root to this project so Turbopack ignores other lockfiles
  // that may exist higher up in the directory tree.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
