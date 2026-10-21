import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Workers の静的アセットとして配信するため、ビルド結果を out/ に静的書き出しする（要件 9章）
  output: "export",
  images: {
    // 静的書き出しでは標準の画像最適化が使えない。ドット絵は最適化すると崩れるため元の PNG をそのまま出す
    unoptimized: true,
  },
};

export default nextConfig;
