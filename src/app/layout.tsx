import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Suspense } from "react";
import { OfflineBanner } from "@/components/data/OfflineBanner";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { RememberLastView } from "@/components/pwa/RememberLastView";
import { APP_ICONS, appIconPx, appIconSrc } from "@/lib/pwa/icons";
import { SITE_CATCHPHRASE, SITE_NAME, SITE_NAME_JA, TARGET_DISTRICTS_LABEL, THEME_COLOR } from "@/lib/site";
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
  // iPhone は manifest のアイコンを使わないので、ホーム画面用を別に渡す（024）
  icons: {
    apple: { url: appIconSrc(APP_ICONS.apple), sizes: `${appIconPx(APP_ICONS.apple)}x${appIconPx(APP_ICONS.apple)}` },
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
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
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          <OfflineBanner />
          {children}
        </main>
        <SiteFooter />
        <RegisterServiceWorker />
        <Suspense fallback={null}>
          <RememberLastView />
        </Suspense>
      </body>
    </html>
  );
}
