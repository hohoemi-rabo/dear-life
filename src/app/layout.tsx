import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SITE_CATCHPHRASE, SITE_NAME, SITE_NAME_JA, TARGET_DISTRICTS_LABEL } from "@/lib/site";
import "./globals.css";

// 本文・数字・ボタンはドット風にせず、ふつうのフォントにする（要件 8章「読みやすさ」）
const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} ${SITE_NAME_JA}`,
    template: `%s | ${SITE_NAME} ${SITE_NAME_JA}`,
  },
  description: `${SITE_CATCHPHRASE}。${TARGET_DISTRICTS_LABEL}の4地区で、家族の暮らしを季節の場面で見て、相場・学校・保育・交通・防災を公開データで確かめられる、登録不要のWebサービスです。`,
};

export const viewport: Viewport = {
  themeColor: "#F7F3EA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={notoSansJp.variable}>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
