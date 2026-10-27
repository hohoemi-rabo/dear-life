import type { MetadataRoute } from "next";
import { APP_ICONS, appIconPx, appIconSrc } from "@/lib/pwa/icons";
import { SITE_CATCHPHRASE, SITE_NAME, SITE_NAME_JA, THEME_COLOR } from "@/lib/site";

// 静的書き出しでは、ビルド時に manifest.webmanifest として書き出す
export const dynamic = "force-static";

// ホーム画面に追加したときの名前・アイコン・色（要件 8.2）。アドレスバーを出さずに開く
export default function manifest(): MetadataRoute.Manifest {
  const sizes = (icon: (typeof APP_ICONS)[keyof typeof APP_ICONS]) => `${appIconPx(icon)}x${appIconPx(icon)}`;
  return {
    name: `${SITE_NAME} ${SITE_NAME_JA}`,
    short_name: SITE_NAME,
    description: SITE_CATCHPHRASE,
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: THEME_COLOR,
    background_color: THEME_COLOR,
    icons: [
      { src: appIconSrc(APP_ICONS.icon192), sizes: sizes(APP_ICONS.icon192), type: "image/png", purpose: "any" },
      { src: appIconSrc(APP_ICONS.icon512), sizes: sizes(APP_ICONS.icon512), type: "image/png", purpose: "any" },
      { src: appIconSrc(APP_ICONS.icon512), sizes: sizes(APP_ICONS.icon512), type: "image/png", purpose: "maskable" },
    ],
  };
}
