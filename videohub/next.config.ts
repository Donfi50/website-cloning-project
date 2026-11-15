import type { NextConfig } from "next";

// This app reads the database and the session on every request, so it must NOT use the
// `cacheComponents` / `partialPrefetching` options that newer create-next-app versions enable by default.
const nextConfig: NextConfig = {};

export default nextConfig;
