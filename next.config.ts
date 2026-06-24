import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: process.cwd(),
  },
  // Fix Next.js dev server blocking ngrok and LAN
  // @ts-ignore
  allowedDevOrigins: [
    'imbecile-coliseum-upcoming.ngrok-free.dev',
    '192.168.2.7',
    'cqqmj-171-225-184-188.free.pinggy.net',
    'localhost',
    '*.lhr.life',
    '*.localhost.run',
    '*.ngrok-free.app',
    '*.pinggy.net',
    '*',
  ],
};

export default nextConfig;
