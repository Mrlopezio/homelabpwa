import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  importScripts: ["/custom-sw.js"],
});

const nextConfig: NextConfig = {
  // Empty turbopack config to allow webpack-based plugins like next-pwa
  turbopack: {},
};

export default withPWA(nextConfig);
